#!/usr/bin/env node

/**
 * Restore a Metabase dashboard from the repo snapshot produced by
 * `op:metabase:export-dashboard`, onto another dashboard — typically another
 * environment (integration → validation → production).
 *
 * The target ends up iso with the snapshot: same cards, same queries, same filters,
 * same grid, same embedding (publication) settings — while everything that legitimately
 * belongs to the target instance is preserved:
 *
 *   - the data source: `dataset_query.database` is rewritten to the target's database,
 *     so a production dashboard never starts querying the integration database;
 *   - the dashboard name/description (they usually carry an environment prefix),
 *     unless --overwrite-name;
 *   - the public link (`public_uuid`), collection and card ids.
 *
 * Cards are matched by name, so editing a card's SQL in the source updates the very same
 * card on the target instead of creating a duplicate; a card whose name is not found is
 * reported as new and created.
 *
 * A card feeding a filter dropdown is not restored like the others: when the target already
 * points its own card at that filter, that card is reused untouched (it is the target's data,
 * usually even named after the target environment); otherwise it is created from the snapshot.
 *
 * Dashboard filters are reconciled the same way, matched by slug: a filter missing from the
 * target is added, an existing one is reconfigured when the snapshot changed it, and one the
 * snapshot no longer declares is dropped. A filter that already exists keeps the target's id,
 * so restoring twice does not churn ids — the dashcard mappings are rewritten to follow.
 *
 * Usage:
 *   # dry run (default): prints the full plan, writes nothing
 *   pnpm op:metabase:restore-dashboard --source 4 --target 12 --url https://metabase.example.com
 *
 *   # apply
 *   pnpm op:metabase:restore-dashboard --source 4 --target 12 --url https://… --apply
 *
 * The API key is never read from argv (visible via `ps`, kept in shell history). It comes
 * from METABASE_TARGET_API_KEY / METABASE_API_KEY, --api-key-env, --api-key-file or --api-key-stdin.
 *
 * Options:
 *   --source <id>                     dashboard id of the snapshot under docs/metabase_dashboards/
 *   --target <id>                     dashboard id to restore onto (required)
 *   --url <url>                       target Metabase URL (default METABASE_TARGET_SITE_URL, then METABASE_SITE_URL)
 *   --api-key-env <VAR> | --api-key-file <path> | --api-key-stdin
 *   --apply                           actually write (default: dry run)
 *   --yes                             skip the interactive confirmation (CI)
 *   --database-id <id>                database for cards created on the target (default: inferred)
 *   --overwrite-name                  also copy the dashboard name/description from the snapshot
 *   --archive-orphans                 archive target cards that the snapshot no longer references
 *   --mapping <path>                  JSON `{ "cards": { "<sourceCardId>": <targetCardId> } }` overrides
 *   --allow-unresolved-values-source  downgrade an unresolvable filter values-source to free text
 *   --report <path>                   write the full report as JSON
 *   --timeout <ms>                    per-request timeout (default 30000)
 */

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { createMetabaseClient, type MetabaseClient } from './metabase/client.js';
import { assertNoInlineSecret, describeApiKeySource, resolveApiKey } from './metabase/credentials.js';
import {
  type CardPlan,
  completeParametersFromCards,
  type DashcardPlan,
  matchCards,
  type ParameterPlan,
  planCard,
  planDashcards,
  planParameters,
  planValuesSourceCards,
  remapValuesSources,
  SYNCED_DASHBOARD_FIELDS,
} from './metabase/plan.js';
import {
  type DashboardSnapshot,
  extractCardIds,
  extractValuesSourceCardIds,
  getDashcards,
  isDeepEqual,
  isObject,
  type JsonObject,
  loadSnapshot,
} from './metabase/snapshot.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
// apps/backend/src/scripts -> repo root
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..', '..', '..');
const SNAPSHOT_ROOT = resolve(REPO_ROOT, 'docs/metabase_dashboards');

type Options = {
  source: number;
  target: number;
  url: string;
  apiKeyEnv?: string;
  apiKeyFile?: string;
  apiKeyStdin: boolean;
  apply: boolean;
  yes: boolean;
  databaseId?: number;
  overwriteName: boolean;
  archiveOrphans: boolean;
  mappingPath?: string;
  allowUnresolvedValuesSource: boolean;
  reportPath?: string;
  timeoutMs: number;
};

class UserError extends Error {}

function parseArgs(argv: readonly string[]): Options {
  assertNoInlineSecret(argv);

  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new UserError(`Unexpected argument: ${arg}`);
    const name = arg.slice(2);
    const next = argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      flags.set(name, next);
      i += 1;
    } else {
      flags.set(name, true);
    }
  }

  const str = (name: string): string | undefined => {
    const value = flags.get(name);
    if (value === undefined) return undefined;
    if (value === true) throw new UserError(`--${name} expects a value`);
    return value;
  };
  const bool = (name: string): boolean => flags.get(name) === true;
  const int = (name: string): number | undefined => {
    const raw = str(name);
    if (raw === undefined) return undefined;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) throw new UserError(`--${name} must be a positive integer`);
    return parsed;
  };

  const source = int('source');
  const target = int('target');
  if (source === undefined) throw new UserError('--source <dashboard-id> is required (the snapshot to restore)');
  if (target === undefined) throw new UserError('--target <dashboard-id> is required (the dashboard to restore onto)');

  const url = str('url') ?? process.env.METABASE_TARGET_SITE_URL ?? process.env.METABASE_SITE_URL;
  if (!url) {
    throw new UserError('Missing target URL: pass --url, or set METABASE_TARGET_SITE_URL / METABASE_SITE_URL');
  }

  return {
    source,
    target,
    url,
    apiKeyEnv: str('api-key-env'),
    apiKeyFile: str('api-key-file'),
    apiKeyStdin: bool('api-key-stdin'),
    apply: bool('apply'),
    yes: bool('yes'),
    databaseId: int('database-id'),
    overwriteName: bool('overwrite-name'),
    archiveOrphans: bool('archive-orphans'),
    mappingPath: str('mapping'),
    allowUnresolvedValuesSource: bool('allow-unresolved-values-source'),
    reportPath: str('report'),
    timeoutMs: int('timeout') ?? 30_000,
  };
}

async function loadExplicitMapping(path: string | undefined): Promise<Map<number, number>> {
  if (!path) return new Map();
  const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
  const cards = isObject(parsed) ? parsed.cards : undefined;
  if (!isObject(cards)) throw new UserError(`${path} must look like { "cards": { "<sourceId>": <targetId> } }`);
  const mapping = new Map<number, number>();
  for (const [sourceId, targetId] of Object.entries(cards)) {
    const from = Number.parseInt(sourceId, 10);
    if (!Number.isFinite(from) || typeof targetId !== 'number') {
      throw new UserError(`${path}: invalid mapping entry "${sourceId}": ${JSON.stringify(targetId)}`);
    }
    mapping.set(from, targetId);
  }
  return mapping;
}

/** Every card the target dashboard depends on: dashcards, extra series, and filter values sources. */
async function fetchTargetCards(client: MetabaseClient, dashboard: JsonObject): Promise<Map<number, JsonObject>> {
  const ids = new Set<number>([...extractCardIds(dashboard), ...extractValuesSourceCardIds(dashboard)]);
  const cards = new Map<number, JsonObject>();
  for (const id of [...ids].sort((a, b) => a - b)) {
    const card = await client.get<unknown>(`/api/card/${id}`);
    if (isObject(card)) cards.set(id, card);
  }
  return cards;
}

function resolveDatabaseId(
  options: Options,
  targetCards: Map<number, JsonObject>,
  snapshot: DashboardSnapshot,
): number {
  if (options.databaseId !== undefined) return options.databaseId;

  const databases = new Set<number>();
  for (const card of targetCards.values()) {
    if (typeof card.database_id === 'number') databases.add(card.database_id);
  }

  if (databases.size === 1) return [...databases][0];
  if (databases.size === 0) {
    throw new UserError(
      `Target dashboard ${options.target} has no card to infer the data source from. ` +
        `Pass --database-id <id> (the snapshot was taken against database ${String(
          isObject(snapshot.dashboard) ? 'see cards' : '?',
        )}).`,
    );
  }
  throw new UserError(
    `Target dashboard ${options.target} mixes several data sources (${[...databases].join(', ')}). ` +
      'Pass --database-id <id> to say which one new cards must use.',
  );
}

type Plan = {
  cardPlans: CardPlan[];
  dashcardPlan: DashcardPlan;
  dashboardPayload: JsonObject;
  dashboardChangedFields: string[];
  parameterPlan: ParameterPlan;
  parameters: unknown[];
  warnings: string[];
  errors: string[];
};

type PlanContext = {
  options: Options;
  snapshot: DashboardSnapshot;
  targetDashboard: JsonObject;
  /** Snapshot cards the restore owns; a reused filter values-source card is not one of them. */
  plannedCards: JsonObject[];
  targetCards: Map<number, JsonObject>;
  idMap: Map<number, number>;
  matchedBy: Map<number, CardPlan['matchedBy']>;
  databaseId: number;
};

function buildPlan(ctx: PlanContext): Plan {
  const { options, snapshot, targetDashboard, plannedCards, targetCards, idMap, matchedBy, databaseId } = ctx;
  const warnings: string[] = [];
  const errors: string[] = [];

  const resolveCardId = (sourceCardId: number): number | null => idMap.get(sourceCardId) ?? null;
  const pendingCardIds = new Set(
    plannedCards.map((card) => card.id).filter((id): id is number => typeof id === 'number' && !idMap.has(id)),
  );

  const targetDashboardParams = new Map<string, JsonObject>();
  if (Array.isArray(targetDashboard.parameters)) {
    for (const parameter of targetDashboard.parameters) {
      if (isObject(parameter) && typeof parameter.slug === 'string')
        targetDashboardParams.set(parameter.slug, parameter);
    }
  }

  const cardPlans = [...plannedCards]
    .sort((a, b) => (a.id as number) - (b.id as number))
    .map((source) => {
      const targetId = idMap.get(source.id as number) ?? null;
      const target = targetId === null ? null : (targetCards.get(targetId) ?? null);

      const targetCardParams = new Map<string, JsonObject>();
      if (target && Array.isArray(target.parameters)) {
        for (const parameter of target.parameters) {
          if (isObject(parameter) && typeof parameter.slug === 'string')
            targetCardParams.set(parameter.slug, parameter);
        }
      }

      const plan = planCard({
        source,
        target,
        matchedBy: matchedBy.get(source.id as number) ?? null,
        // A card already on the target keeps its own data source; new ones use the resolved one.
        databaseId: target && typeof target.database_id === 'number' ? target.database_id : databaseId,
        remapParameters: (parameters, label) =>
          remapValuesSources({
            parameters,
            resolveCardId,
            pendingCardIds,
            targetParametersBySlug: targetCardParams,
            allowUnresolved: options.allowUnresolvedValuesSource,
            label,
          }),
      });
      warnings.push(...plan.warnings);
      errors.push(...plan.errors);
      return plan;
    });

  const completed = completeParametersFromCards({
    parameters: snapshot.dashboard.parameters,
    cardParameters: [...snapshot.cards.values()].map((card) => card.parameters),
  });
  for (const completion of completed.completions) {
    warnings.push(
      `Filter "${completion.slug}": ${completion.fields.join(', ')} taken from the cards — the snapshot's ` +
        'dashboard filter does not carry them',
    );
  }

  const dashboardParameters = remapValuesSources({
    parameters: completed.parameters,
    resolveCardId,
    pendingCardIds,
    targetParametersBySlug: targetDashboardParams,
    allowUnresolved: options.allowUnresolvedValuesSource,
    label: `dashboard ${snapshot.dashboardId}`,
  });
  warnings.push(...dashboardParameters.warnings);
  errors.push(...dashboardParameters.errors);

  const parameterPlan = planParameters({
    sourceParameters: dashboardParameters.parameters,
    targetParameters: targetDashboard.parameters,
  });
  warnings.push(...parameterPlan.warnings);

  const knownParameterIds = new Set<string>();
  const declaredSlugs = new Set<string>();
  for (const parameter of parameterPlan.parameters) {
    if (typeof parameter.id === 'string') knownParameterIds.add(parameter.id);
    if (typeof parameter.slug === 'string') declaredSlugs.add(parameter.slug);
  }

  const dashcardPlan = planDashcards({
    sourceDashcards: getDashcards(snapshot.dashboard),
    targetDashcards: getDashcards(targetDashboard),
    resolveCardId,
    knownParameterIds,
    parameterIdRemap: parameterPlan.idRemap,
    targetCardName: (cardId) => {
      const name = targetCards.get(cardId)?.name;
      return typeof name === 'string' ? name : `card ${cardId}`;
    },
  });
  warnings.push(...dashcardPlan.warnings);

  // Embedding is what the app relies on: an embedding_params key that no filter declares makes
  // Metabase reject the update, and a missing one silently breaks the /statistiques page.
  const embeddingParams = isObject(snapshot.dashboard.embedding_params) ? snapshot.dashboard.embedding_params : null;
  if (embeddingParams) {
    const unknown = Object.keys(embeddingParams).filter((slug) => !declaredSlugs.has(slug));
    if (unknown.length > 0) {
      errors.push(
        `Snapshot inconsistency: embedding_params declares ${unknown.map((s) => `"${s}"`).join(', ')} but the ` +
          'dashboard has no such filter. Re-run the export.',
      );
    }
  }

  const dashboardPayload: JsonObject = {
    parameters: parameterPlan.parameters,
    enable_embedding: snapshot.dashboard.enable_embedding ?? false,
    embedding_params: embeddingParams,
    auto_apply_filters: snapshot.dashboard.auto_apply_filters ?? true,
    width: snapshot.dashboard.width ?? 'fixed',
    archived: false,
  };
  // Only sent when the running Metabase knows about it, so older versions do not 400.
  if ('embedding_type' in targetDashboard) {
    dashboardPayload.embedding_type = snapshot.dashboard.embedding_type ?? null;
  }
  if (options.overwriteName) {
    dashboardPayload.name = snapshot.dashboard.name;
    dashboardPayload.description = snapshot.dashboard.description ?? null;
  }

  const dashboardChangedFields = Object.keys(dashboardPayload).filter(
    (field) => !isDeepEqual(dashboardPayload[field], targetDashboard[field]),
  );
  if (dashcardPlan.hasChanges) dashboardChangedFields.push('dashcards');

  return {
    cardPlans,
    dashcardPlan,
    dashboardPayload,
    dashboardChangedFields,
    parameterPlan,
    parameters: parameterPlan.parameters,
    warnings: [...new Set(warnings)],
    errors: [...new Set(errors)],
  };
}

const ICON: Record<CardPlan['action'], string> = { create: '+', update: '~', unchanged: '=' };

function printPlan(options: Options, ctx: PlanContext, plan: Plan, orphans: JsonObject[]): void {
  const created = plan.cardPlans.filter((card) => card.action === 'create');
  const updated = plan.cardPlans.filter((card) => card.action === 'update');
  const unchanged = plan.cardPlans.filter((card) => card.action === 'unchanged');

  console.log('');
  console.log('━━━ Metabase restore plan ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  mode          ${options.apply ? 'APPLY (writes)' : 'DRY RUN (no write)'}`);
  console.log(`  snapshot      docs/metabase_dashboards/${options.source} — "${String(ctx.snapshot.dashboard.name)}"`);
  console.log(`  target        ${ctx.options.url}/dashboard/${options.target} — "${String(ctx.targetDashboard.name)}"`);
  console.log(`  data source   database ${ctx.databaseId} (target's, preserved)`);
  console.log(`  name          ${options.overwriteName ? 'overwritten from snapshot' : "preserved (target's)"}`);
  console.log('');

  console.log(`▸ Cards (${plan.cardPlans.length})`);
  for (const card of plan.cardPlans) {
    const target = card.targetId === null ? 'new' : `#${card.targetId}`;
    const how = card.matchedBy ? ` via ${card.matchedBy}` : '';
    const changes = card.action === 'update' ? ` — ${card.changedFields.join(', ')}` : '';
    console.log(`   ${ICON[card.action]} ${card.name} (snapshot #${card.sourceId} → ${target}${how})${changes}`);
  }
  console.log(`   → ${created.length} to create, ${updated.length} to update, ${unchanged.length} unchanged`);
  console.log('');

  const newDashcards = plan.dashcardPlan.entries.filter((entry) => entry.isNew);
  const movedDashcards = plan.dashcardPlan.entries.filter((entry) => entry.changed && !entry.isNew);
  console.log(`▸ Layout (${plan.dashcardPlan.entries.length} dashcards)`);
  console.log(
    `   + ${newDashcards.length} added, ~ ${movedDashcards.length} repositioned/remapped, ` +
      `= ${plan.dashcardPlan.entries.length - newDashcards.length - movedDashcards.length} untouched`,
  );
  for (const removed of plan.dashcardPlan.removed) {
    console.log(`   - dashcard #${removed.dashcardId} "${removed.name}" removed from the dashboard`);
  }
  console.log('');

  const PARAMETER_ICON: Record<ParameterPlan['entries'][number]['action'], string> = {
    create: '+',
    update: '~',
    unchanged: '=',
    remove: '-',
  };
  const parameterEntries = plan.parameterPlan.entries;
  console.log(`▸ Filters (${parameterEntries.filter((entry) => entry.action !== 'remove').length})`);
  for (const entry of parameterEntries) {
    const detail =
      entry.action === 'create'
        ? ' — missing on the target, will be added'
        : entry.action === 'update'
          ? ` — ${entry.changedFields.join(', ')}`
          : entry.action === 'remove'
            ? ' — no longer in the snapshot, will be dropped'
            : '';
    const id = entry.targetId ?? entry.sourceId ?? '?';
    console.log(`   ${PARAMETER_ICON[entry.action]} ${entry.name} (${entry.slug}, #${id})${detail}`);
  }
  const createdParameters = parameterEntries.filter((entry) => entry.action === 'create').length;
  const updatedParameters = parameterEntries.filter((entry) => entry.action === 'update').length;
  const removedParameters = parameterEntries.filter((entry) => entry.action === 'remove').length;
  console.log(
    `   → ${createdParameters} to add, ${updatedParameters} to reconfigure, ${removedParameters} to drop, ` +
      `${parameterEntries.length - createdParameters - updatedParameters - removedParameters} unchanged`,
  );
  console.log('');

  console.log('▸ Dashboard');
  if (plan.dashboardChangedFields.length === 0) {
    console.log('   = nothing to change (parameters, embedding, layout options)');
  } else {
    for (const field of plan.dashboardChangedFields) {
      console.log(`   ~ ${field}`);
    }
  }
  const embedding = plan.dashboardPayload.enable_embedding === true ? 'published (embedding enabled)' : 'not published';
  console.log(`   publication: ${embedding}`);
  if (isObject(plan.dashboardPayload.embedding_params)) {
    for (const [slug, mode] of Object.entries(plan.dashboardPayload.embedding_params)) {
      console.log(`     · ${slug}: ${String(mode)}`);
    }
  }
  console.log('');

  if (orphans.length > 0) {
    console.log(`▸ Orphan cards (${orphans.length}) — no longer referenced by the snapshot`);
    for (const card of orphans) {
      const action = options.archiveOrphans ? 'will be archived' : 'left as is (use --archive-orphans)';
      console.log(`   - #${String(card.id)} "${String(card.name)}" — ${action}`);
    }
    console.log('');
  }

  if (plan.warnings.length > 0) {
    console.log(`▸ Warnings (${plan.warnings.length})`);
    for (const warning of plan.warnings) console.log(`   ⚠ ${warning}`);
    console.log('');
  }
}

async function confirm(options: Options, targetDashboard: JsonObject): Promise<void> {
  if (options.yes) return;
  if (options.apiKeyStdin) {
    throw new UserError('--api-key-stdin consumes stdin, so the confirmation cannot be read: add --yes');
  }
  if (!process.stdin.isTTY) {
    throw new UserError('Not a TTY: add --yes to confirm the write non-interactively');
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(`About to write to "${String(targetDashboard.name)}" on ${options.url}.`);
    const answer = await rl.question(`Type the target dashboard id (${options.target}) to confirm: `);
    if (answer.trim() !== String(options.target))
      throw new UserError('Confirmation mismatch — aborted, nothing written');
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

  const dashboard = await client.get<JsonObject>(`/api/dashboard/${options.target}`);
  for (const field of SYNCED_DASHBOARD_FIELDS) {
    if (!(field in plan.dashboardPayload)) continue;
    if (!isDeepEqual(plan.dashboardPayload[field], dashboard[field])) differences.push({ scope: 'dashboard', field });
  }

  const liveDashcards = getDashcards(dashboard);
  if (liveDashcards.length !== plan.dashcardPlan.entries.length) {
    differences.push({ scope: 'dashboard', field: 'dashcards.length' });
  }

  for (const card of cardPlans) {
    if (card.targetId === null) continue;
    const live = await client.get<JsonObject>(`/api/card/${card.targetId}`);
    for (const field of ['name', 'display', 'dataset_query', 'visualization_settings'] as const) {
      if (!isDeepEqual(card.payload[field], live[field])) {
        differences.push({ scope: `card #${card.targetId} "${card.name}"`, field });
      }
    }
  }

  const blocking = differences.some(
    (difference) =>
      difference.scope === 'dashboard' &&
      ['enable_embedding', 'embedding_params', 'parameters', 'dashcards.length'].includes(difference.field),
  );
  return { ok: differences.length === 0, blocking, differences };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
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

  const targetDashboard = await client.get<JsonObject>(`/api/dashboard/${options.target}`).catch((error: unknown) => {
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
  const databaseId = resolveDatabaseId(options, targetCards, snapshot);

  const explicitMapping = await loadExplicitMapping(options.mappingPath);

  const targetParametersBySlug = new Map<string, JsonObject>();
  for (const parameter of Array.isArray(targetDashboard.parameters) ? targetDashboard.parameters : []) {
    if (isObject(parameter) && typeof parameter.slug === 'string')
      targetParametersBySlug.set(parameter.slug, parameter);
  }
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

  // A reused values-source card belongs to the target: it is mapped, never planned.
  const sourceCards = [...snapshot.cards.values()].filter(
    (card) => typeof card.id !== 'number' || !valuesSourceCards.reuse.has(card.id),
  );
  const matching = matchCards({ sourceCards, targetCards: [...targetCards.values()], explicitMapping });
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
    (card) => typeof card.id === 'number' && !referencedTargetIds.has(card.id),
  );

  printPlan(options, ctx, plan, orphans);

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

  await confirm(options, targetDashboard);

  const executed: string[] = [];

  // Cards first: if anything fails here the dashboard is still untouched.
  for (const card of plan.cardPlans) {
    if (card.action === 'unchanged') continue;
    if (card.action === 'create') {
      const sourceCard = snapshot.cards.get(card.sourceId);
      const isDashboardQuestion = isObject(sourceCard) && typeof sourceCard.dashboard_id === 'number';
      const created = await client.post<JsonObject>('/api/card', {
        ...card.payload,
        // Dashboard questions live inside the dashboard, regular cards in its collection.
        dashboard_id: isDashboardQuestion ? options.target : null,
        collection_id: isDashboardQuestion ? null : (targetDashboard.collection_id ?? null),
      });
      if (typeof created.id !== 'number') throw new Error(`Metabase did not return an id for card "${card.name}"`);
      idMap.set(card.sourceId, created.id);
      card.targetId = created.id;
      executed.push(`created card #${created.id} "${card.name}"`);
      continue;
    }
    await client.put(`/api/card/${card.targetId}`, card.payload);
    executed.push(`updated card #${String(card.targetId)} "${card.name}" (${card.changedFields.join(', ')})`);
  }

  // Re-plan now that every card has a target id, so dashcards and filter sources resolve.
  const finalPlan = buildPlan(ctx);
  if (finalPlan.dashboardChangedFields.length === 0) {
    executed.push(`dashboard #${options.target} already matches the snapshot — not rewritten`);
  } else {
    const dashcards = finalPlan.dashcardPlan.entries.map((entry) => ({ id: entry.id, ...entry.payload }));
    await client.put(`/api/dashboard/${options.target}`, { ...finalPlan.dashboardPayload, dashcards });
    executed.push(
      `updated dashboard #${options.target} (${finalPlan.dashboardChangedFields.join(', ')}; ` +
        `${dashcards.length} dashcards)`,
    );
  }

  if (options.archiveOrphans) {
    for (const card of orphans) {
      await client.put(`/api/card/${String(card.id)}`, { archived: true });
      executed.push(`archived orphan card #${String(card.id)} "${String(card.name)}"`);
    }
  }

  console.log('▸ Applied');
  for (const line of executed) console.log(`   ✓ ${line}`);
  console.log('');

  const verification = await verify(client, options, finalPlan, plan.cardPlans);
  report.executed = executed;
  report.verification = verification;
  report.mode = 'apply';

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

async function writeReport(options: Options, report: JsonObject): Promise<void> {
  if (!options.reportPath) return;
  await writeFile(options.reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`→ Report written to ${options.reportPath}`);
}

try {
  await main();
} catch (error) {
  if (error instanceof UserError) {
    console.error(`✗ ${error.message}`);
    process.exit(1);
  }
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
