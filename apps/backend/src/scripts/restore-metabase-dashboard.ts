#!/usr/bin/env node

import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { loadExplicitMapping, type Options, parseOptions } from './metabase/cli.js';
import { createMetabaseClient, entityPath, isEntityId, type MetabaseClient } from './metabase/client.js';
import { describeApiKeySource, resolveApiKey } from './metabase/credentials.js';
import {
  type CardPlan,
  matchCards,
  normalizeName,
  parametersBySlug,
  planValuesSourceCards,
  SYNCED_DASHBOARD_FIELDS,
} from './metabase/plan.js';
import { printPlan, writeReport } from './metabase/report.js';
import { buildPlan, type Plan, type PlanContext, resolveDatabaseId } from './metabase/restore-plan.js';
import { redactSecrets } from './metabase/secrets.js';
import {
  extractCardIds,
  extractValuesSourceCardIds,
  getDashcards,
  isDeepEqual,
  isObject,
  type JsonObject,
  loadSnapshot,
} from './metabase/snapshot.js';
import { UserError } from './metabase/user-error.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..', '..', '..');
const SNAPSHOT_ROOT = resolve(REPO_ROOT, 'docs/metabase_dashboards');

const toMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));

async function fetchTargetCards(client: MetabaseClient, dashboard: JsonObject): Promise<Map<number, JsonObject>> {
  const ids = new Set<number>([...extractCardIds(dashboard), ...extractValuesSourceCardIds(dashboard)]);
  const cards = new Map<number, JsonObject>();
  for (const id of [...ids].sort((a, b) => a - b)) {
    const card = await client.get<unknown>(entityPath('card', id));
    if (isObject(card)) cards.set(id, card);
  }
  return cards;
}

async function adoptStrayCards(
  client: MetabaseClient,
  collectionId: unknown,
  wantedNames: Set<string>,
  known: Map<number, JsonObject>,
): Promise<JsonObject[]> {
  const path = isEntityId(collectionId) ? entityPath('collection', collectionId) : '/api/collection/root';
  const listing = await client.get<unknown>(`${path}/items?models=card`).catch((error: unknown) => {
    console.warn(`⚠ Could not list the target collection (${toMessage(error)}); stray cards will not be adopted.`);
    return null;
  });
  const items = isObject(listing) && Array.isArray(listing.data) ? listing.data.filter(isObject) : [];

  const adopted: JsonObject[] = [];
  for (const item of items) {
    if (!isEntityId(item.id) || known.has(item.id)) continue;
    if (typeof item.name !== 'string' || !wantedNames.has(normalizeName(item.name))) continue;
    const card = await client.get<unknown>(entityPath('card', item.id));
    if (!isObject(card) || card.archived === true) continue;
    known.set(item.id, card);
    adopted.push(card);
  }
  return adopted;
}

async function confirm(options: Options, targetDashboard: JsonObject, host: string): Promise<void> {
  if (options.yes) return;
  if (options.apiKeyStdin) {
    throw new UserError('--api-key-stdin consumes stdin, so the confirmation cannot be read: add --yes');
  }
  if (!process.stdin.isTTY) {
    throw new UserError('Not a TTY: add --yes to confirm the write non-interactively');
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(`About to write to "${String(targetDashboard.name)}" (dashboard ${options.target}) on ${host}.`);
    if (options.urlFromEnv) {
      console.log('⚠ The target URL comes from the environment (--url was not passed), not from the command line.');
    }

    const answer = await rl.question(`Type the target host (${host}) to confirm: `);
    if (answer.trim() !== host) throw new UserError('Confirmation mismatch — aborted, nothing written');
  } finally {
    rl.close();
  }
}

type VerificationDifference = { scope: string; field: string };

async function verify(
  client: MetabaseClient,
  options: Options,
  plan: Plan,
  cardPlans: CardPlan[],
): Promise<{ ok: boolean; blocking: boolean; differences: VerificationDifference[] }> {
  const differences: VerificationDifference[] = [];

  const dashboard = await client.get<JsonObject>(entityPath('dashboard', options.target));
  for (const field of SYNCED_DASHBOARD_FIELDS) {
    if (!(field in plan.dashboardPayload)) continue;

    const equal =
      field === 'parameters'
        ? isDeepEqual(
            Object.fromEntries(parametersBySlug(plan.dashboardPayload[field])),
            Object.fromEntries(parametersBySlug(dashboard[field])),
          )
        : isDeepEqual(plan.dashboardPayload[field], dashboard[field]);
    if (!equal) differences.push({ scope: 'dashboard', field });
  }

  const liveDashcards = getDashcards(dashboard);
  if (liveDashcards.length !== plan.dashcardPlan.entries.length) {
    differences.push({ scope: 'dashboard', field: 'dashcards.length' });
  }

  for (const card of cardPlans) {
    if (card.targetId === null) continue;
    const live = await client.get<JsonObject>(entityPath('card', card.targetId));
    for (const field of ['name', 'display', 'dataset_query', 'visualization_settings'] as const) {
      if (!isDeepEqual(card.payload[field], live[field])) {
        differences.push({ scope: `card #${card.targetId} "${card.name}"`, field });
      }
    }
  }

  const blocking = differences.some((difference) =>
    difference.scope === 'dashboard'
      ? ['enable_embedding', 'embedding_params', 'parameters', 'dashcards.length'].includes(difference.field)
      : difference.field === 'dataset_query',
  );
  return { ok: differences.length === 0, blocking, differences };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const {
    apiKey,
    source: keySource,
    warnings: keyWarnings,
  } = await resolveApiKey({
    envVar: options.apiKeyEnv,
    file: options.apiKeyFile,
    stdin: options.apiKeyStdin,
  });
  for (const warning of keyWarnings) console.warn(`⚠ ${warning}`);

  const client = createMetabaseClient({ siteUrl: options.url, apiKey, timeoutMs: options.timeoutMs });
  console.log(`→ Target ${client.baseUrl} (API key from ${describeApiKeySource(keySource)})`);

  const snapshot = await loadSnapshot(SNAPSHOT_ROOT, options.source);
  if (snapshot.missingDashcardCardIds.length > 0) {
    throw new UserError(
      `Incomplete snapshot: cards ${snapshot.missingDashcardCardIds.join(', ')} are on the dashboard but missing ` +
        `from ${snapshot.dir}/cards/. Re-run \`pnpm op:metabase:export-dashboard ${options.source}\`.`,
    );
  }
  if (Array.isArray(snapshot.dashboard.tabs) && snapshot.dashboard.tabs.length > 0) {
    throw new UserError('Snapshot uses dashboard tabs, which this script does not support yet');
  }

  const targetDashboard = await client
    .get<JsonObject>(entityPath('dashboard', options.target))
    .catch((error: unknown) => {
      throw new UserError(
        `Cannot read target dashboard ${options.target} on ${client.baseUrl}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  if (targetDashboard.archived === true) throw new UserError(`Target dashboard ${options.target} is archived`);
  if (targetDashboard.can_write === false) {
    throw new UserError(`The API key has no write access to dashboard ${options.target}`);
  }
  if (Array.isArray(targetDashboard.tabs) && targetDashboard.tabs.length > 0) {
    throw new UserError(`Target dashboard ${options.target} uses tabs, which this script does not support yet`);
  }
  if (options.source === options.target) {
    console.log('ℹ Source and target ids are identical: restoring the snapshot onto itself (drift rollback).');
  }

  const targetCards = await fetchTargetCards(client, targetDashboard);

  const dashboardCardIds = new Set(targetCards.keys());
  const databaseId = resolveDatabaseId(options, targetCards, snapshot);

  const snapshotNames = new Set(
    [...snapshot.cards.values()]
      .map((card) => (typeof card.name === 'string' ? normalizeName(card.name) : ''))
      .filter(Boolean),
  );
  for (const card of await adoptStrayCards(client, targetDashboard.collection_id, snapshotNames, targetCards)) {
    console.log(
      `ℹ Adopted card #${String(card.id)} "${String(card.name)}" from the target collection — it is not on the ` +
        'dashboard, most likely created by an earlier run that failed before the dashboard was written.',
    );
  }

  const explicitMapping = await loadExplicitMapping(options.mappingPath);

  const targetParametersBySlug = parametersBySlug(targetDashboard.parameters);
  const valuesSourceCards = planValuesSourceCards({
    parameters: snapshot.dashboard.parameters,
    targetParametersBySlug,
    gridCardIds: new Set(extractCardIds(snapshot.dashboard)),
  });
  for (const [sourceCardId, targetCardId] of valuesSourceCards.reuse) {
    console.log(
      `ℹ Filter values-source card ${sourceCardId} → the target's own card ${targetCardId}, reused untouched`,
    );
  }

  const uncapturedValuesSources = valuesSourceCards.create.filter((id) => !snapshot.cards.has(id));
  if (uncapturedValuesSources.length > 0 && !options.allowUnresolvedValuesSource) {
    throw new UserError(
      `Filter values-source card(s) ${uncapturedValuesSources.join(', ')} are referenced by the snapshot's filters ` +
        `but were never exported, and the target has no card of its own for those filters. Re-run ` +
        `\`pnpm op:metabase:export-dashboard ${options.source}\` to capture them, map them with --mapping, or ` +
        'pass --allow-unresolved-values-source to fall back to free-text filters.',
    );
  }

  const sourceCards = [...snapshot.cards.values()].filter(
    (card) => typeof card.id !== 'number' || !valuesSourceCards.reuse.has(card.id),
  );
  const reusedValuesSourceIds = new Set(valuesSourceCards.reuse.values());
  const matchableTargetCards = [...targetCards.values()].filter(
    (card) => !(isEntityId(card.id) && reusedValuesSourceIds.has(card.id)),
  );
  const matching = matchCards({ sourceCards, targetCards: matchableTargetCards, explicitMapping });
  if (matching.ambiguities.length > 0 || matching.errors.length > 0) {
    for (const ambiguity of matching.ambiguities) {
      console.error(
        `✗ Several target cards are named "${ambiguity.name}" (#${ambiguity.targetIds.join(', #')}). ` +
          'Rename them on the target, or disambiguate with --mapping.',
      );
    }
    for (const error of matching.errors) console.error(`✗ ${error}`);
    throw new UserError('Cannot decide which target card to reuse — aborted');
  }

  const idMap = new Map<number, number>();
  const matchedBy = new Map<number, CardPlan['matchedBy']>();
  for (const match of matching.matches) {
    if (match.targetId !== null) idMap.set(match.sourceId, match.targetId);
    matchedBy.set(match.sourceId, match.matchedBy);
  }
  for (const [sourceCardId, targetCardId] of valuesSourceCards.reuse) idMap.set(sourceCardId, targetCardId);

  const ctx: PlanContext = {
    options,
    snapshot,
    targetDashboard,
    plannedCards: sourceCards,
    targetCards,
    idMap,
    matchedBy,
    databaseId,
  };
  const plan = buildPlan(ctx);

  const referencedTargetIds = new Set([
    ...idMap.values(),
    ...extractValuesSourceCardIds(plan.parameters),
    ...plan.cardPlans.flatMap((card) => extractValuesSourceCardIds(card.payload.parameters)),
  ]);
  const orphans = [...targetCards.values()].filter(
    (card) => isEntityId(card.id) && dashboardCardIds.has(card.id) && !referencedTargetIds.has(card.id),
  );

  printPlan(ctx, plan, orphans);

  if (snapshot.missingValuesSourceCardIds.length > 0) {
    console.log(
      `ℹ Filter values-source card(s) ${snapshot.missingValuesSourceCardIds.join(', ')} are not in the snapshot; ` +
        're-run the export to capture them.',
    );
  }

  if (plan.errors.length > 0) {
    for (const error of plan.errors) console.error(`✗ ${error}`);
    throw new UserError('Plan is not safe to apply — aborted');
  }

  const report: JsonObject = {
    generatedAt: new Date().toISOString(),
    mode: options.apply ? 'apply' : 'dry-run',
    source: { dashboardId: options.source, dir: snapshot.dir, cards: snapshot.cards.size },
    target: {
      siteUrl: client.baseUrl,
      dashboardId: options.target,
      name: targetDashboard.name,
      databaseId,
    },
    cards: plan.cardPlans.map((card) => ({
      name: card.name,
      sourceId: card.sourceId,
      targetId: card.targetId,
      action: card.action,
      matchedBy: card.matchedBy,
      changedFields: card.changedFields,
      databaseId: card.databaseId,
    })),
    dashcards: {
      total: plan.dashcardPlan.entries.length,
      added: plan.dashcardPlan.entries.filter((entry) => entry.isNew).length,
      repositioned: plan.dashcardPlan.entries.filter((entry) => entry.changed && !entry.isNew).length,
      removed: plan.dashcardPlan.removed,
    },
    filters: plan.parameterPlan.entries.map((entry) => ({
      slug: entry.slug,
      name: entry.name,
      action: entry.action,
      sourceId: entry.sourceId,
      targetId: entry.targetId,
      changedFields: entry.changedFields,
    })),
    dashboard: {
      changedFields: plan.dashboardChangedFields,
      enableEmbedding: plan.dashboardPayload.enable_embedding,
      embeddingParams: plan.dashboardPayload.embedding_params,
      nameOverwritten: options.overwriteName,
    },
    orphanCards: orphans.map((card) => ({ id: card.id, name: card.name, archived: options.archiveOrphans })),
    warnings: plan.warnings,
  };

  if (!options.apply) {
    console.log('Dry run: nothing was written. Re-run with --apply to execute this plan.');
    await writeReport(options, report);
    return;
  }

  await confirm(options, targetDashboard, new URL(client.baseUrl).host);

  const executed: string[] = [];

  for (const card of plan.cardPlans) {
    if (card.action === 'unchanged') continue;
    if (card.action === 'create') {
      const sourceCard = snapshot.cards.get(card.sourceId);
      const isDashboardQuestion = isObject(sourceCard) && typeof sourceCard.dashboard_id === 'number';
      const created = await client.post<JsonObject>('/api/card', {
        ...card.payload,

        dashboard_id: isDashboardQuestion ? options.target : null,
        collection_id: isDashboardQuestion ? null : (targetDashboard.collection_id ?? null),
      });
      if (!isEntityId(created.id)) throw new Error(`Metabase did not return an id for card "${card.name}"`);
      idMap.set(card.sourceId, created.id);

      targetCards.set(created.id, created);
      executed.push(`created card #${created.id} "${card.name}"`);
      continue;
    }
    await client.put(entityPath('card', card.targetId), card.payload);
    executed.push(`updated card #${String(card.targetId)} "${card.name}" (${card.changedFields.join(', ')})`);
  }

  const finalPlan = buildPlan(ctx);

  if (finalPlan.errors.length > 0) {
    for (const error of finalPlan.errors) console.error(`✗ ${error}`);
    throw new UserError(
      `Cards were written, but the dashboard cannot be: the plan is no longer safe. Re-run the same command ` +
        'once the errors above are fixed — the cards just created will be reused, not duplicated.',
    );
  }
  if (finalPlan.dashboardChangedFields.length === 0) {
    executed.push(`dashboard #${options.target} already matches the snapshot — not rewritten`);
  } else {
    const dashcards = finalPlan.dashcardPlan.entries.map((entry) => ({ id: entry.id, ...entry.payload }));
    await client.put(entityPath('dashboard', options.target), { ...finalPlan.dashboardPayload, dashcards });
    executed.push(
      `updated dashboard #${options.target} (${finalPlan.dashboardChangedFields.join(', ')}; ` +
        `${dashcards.length} dashcards)`,
    );
  }

  if (options.archiveOrphans) {
    for (const card of orphans) {
      const usage = typeof card.dashboard_count === 'number' ? card.dashboard_count : 0;
      if (usage > 1) {
        console.log(
          `   ⚠ card #${String(card.id)} "${String(card.name)}" is on ${usage} dashboards — left alone; ` +
            'archive it by hand if that is really what you want.',
        );
        continue;
      }
      await client.put(entityPath('card', card.id), { archived: true });
      executed.push(`archived orphan card #${String(card.id)} "${String(card.name)}"`);
    }
  }

  console.log('▸ Applied');
  for (const line of executed) console.log(`   ✓ ${line}`);
  console.log('');

  report.executed = executed;
  report.mode = 'apply';
  await writeReport(options, report);

  const verification = await verify(client, options, finalPlan, finalPlan.cardPlans);
  report.verification = verification;

  if (verification.ok) {
    console.log('▸ Verification: target re-read and iso with the snapshot ✓');
  } else {
    console.log(`▸ Verification: ${verification.differences.length} difference(s) after write`);
    for (const difference of verification.differences) {
      console.log(`   ⚠ ${difference.scope}: ${difference.field}`);
    }
    if (verification.blocking) {
      console.log('   These fields drive the /statistiques page — check the dashboard manually.');
    }
  }

  await writeReport(options, report);
  if (verification.blocking) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(`✗ ${redactSecrets(toMessage(error))}`);

  if (!(error instanceof UserError) && error instanceof Error && error.stack) {
    console.error(redactSecrets(error.stack));
  }
  process.exitCode = 1;
}
