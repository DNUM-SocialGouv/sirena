#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMetabaseClient, entityPath, type MetabaseClient } from './metabase/client.js';
import { redactSecrets, registerSecret } from './metabase/secrets.js';
import { extractCardIds, extractValuesSourceCardIds, normalize } from './metabase/snapshot.js';
import { UserError } from './metabase/user-error.js';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..', '..', '..');
const OUTPUT_ROOT = resolve(REPO_ROOT, 'docs/metabase_dashboards');

async function writeJson(path: string, payload: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`);
}

async function exportDashboard(client: MetabaseClient, dashboardId: number): Promise<void> {
  console.log(`→ Exporting dashboard ${dashboardId} from ${client.baseUrl}`);

  const dashboardRaw = await client.get<unknown>(entityPath('dashboard', dashboardId));
  const cardIds = extractCardIds(dashboardRaw);
  console.log(`  dashboard fetched, ${cardIds.length} unique card(s) referenced`);

  const cards = await Promise.all(
    cardIds.map(async (id) => ({ id, raw: await client.get<unknown>(entityPath('card', id)) })),
  );

  const fetched = new Set(cardIds);
  const pending = extractValuesSourceCardIds([dashboardRaw, ...cards.map((card) => card.raw)]).filter(
    (id) => !fetched.has(id),
  );
  for (const id of pending) {
    fetched.add(id);
    cards.push({ id, raw: await client.get<unknown>(entityPath('card', id)) });
  }
  if (pending.length > 0) console.log(`  + ${pending.length} filter values-source card(s): ${pending.join(', ')}`);

  const outDir = resolve(OUTPUT_ROOT, String(dashboardId));
  await writeJson(resolve(outDir, 'dashboard.json'), normalize(dashboardRaw));
  for (const { id, raw } of cards) {
    await writeJson(resolve(outDir, 'cards', `${id}.json`), normalize(raw));
  }

  console.log(`✓ Wrote ${1 + cards.length} file(s) under docs/metabase_dashboards/${dashboardId}/`);
}

async function main(): Promise<void> {
  const siteUrl = process.env.METABASE_SITE_URL;
  const apiKey = process.env.METABASE_API_KEY;
  const [, , dashboardIdArg] = process.argv;

  if (!siteUrl) {
    console.error('Missing METABASE_SITE_URL');
    process.exitCode = 1;
    return;
  }
  if (!apiKey) {
    console.error('Missing METABASE_API_KEY (Metabase Admin -> Authentication -> API keys)');
    process.exitCode = 1;
    return;
  }

  registerSecret(apiKey);

  const rawDashboardIds = dashboardIdArg
    ? [dashboardIdArg]
    : [process.env.METABASE_DASHBOARD_ID, process.env.METABASE_DASHBOARD_ID_ADMIN].filter((id): id is string =>
        Boolean(id),
      );

  if (rawDashboardIds.length === 0) {
    console.error('Missing dashboard id (pass as CLI arg or set METABASE_DASHBOARD_ID / METABASE_DASHBOARD_ID_ADMIN)');
    process.exitCode = 1;
    return;
  }

  const dashboardIds: number[] = [];
  for (const raw of rawDashboardIds) {
    const id = Number.parseInt(raw, 10);
    if (!Number.isFinite(id) || id <= 0) {
      console.error(`Invalid dashboard id: ${raw}`);
      process.exitCode = 1;
      return;
    }
    dashboardIds.push(id);
  }

  const client = createMetabaseClient({ siteUrl, apiKey });
  for (const dashboardId of dashboardIds) {
    await exportDashboard(client, dashboardId);
  }
}

try {
  await main();
} catch (error) {
  console.error(`✗ ${redactSecrets(error instanceof Error ? error.message : String(error))}`);
  if (!(error instanceof UserError) && error instanceof Error && error.stack) {
    console.error(redactSecrets(error.stack));
  }
  process.exitCode = 1;
}
