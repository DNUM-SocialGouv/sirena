import { writeFile } from 'node:fs/promises';
import type { Options } from './cli.js';
import type { CardPlan, ParameterPlan } from './plan.js';
import type { Plan, PlanContext } from './restore-plan.js';
import { redactSecrets } from './secrets.js';
import { isObject, type JsonObject } from './snapshot.js';

const ICON: Record<CardPlan['action'], string> = { create: '+', update: '~', unchanged: '=' };

export function printPlan(ctx: PlanContext, plan: Plan, orphans: JsonObject[]): void {
  const { options } = ctx;
  const created = plan.cardPlans.filter((card) => card.action === 'create');
  const updated = plan.cardPlans.filter((card) => card.action === 'update');
  const unchanged = plan.cardPlans.filter((card) => card.action === 'unchanged');

  console.log('');
  console.log('━━━ Metabase restore plan ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  mode          ${options.apply ? 'APPLY (writes)' : 'DRY RUN (no write)'}`);
  console.log(`  snapshot      docs/metabase_dashboards/${options.source} — "${String(ctx.snapshot.dashboard.name)}"`);
  console.log(`  target        ${options.url}/dashboard/${options.target} — "${String(ctx.targetDashboard.name)}"`);
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

export async function writeReport(options: Options, report: JsonObject): Promise<void> {
  if (!options.reportPath) return;
  await writeFile(options.reportPath, `${redactSecrets(JSON.stringify(report, null, 2))}\n`);
  console.log(`→ Report written to ${options.reportPath}`);
}
