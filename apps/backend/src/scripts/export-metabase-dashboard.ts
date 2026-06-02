#!/usr/bin/env node

/**
 * Export a Metabase dashboard (and all its referenced cards) as JSON files
 * under `docs/metabase_dashboards/<dashboard-id>/`. Intended for repo-tracked
 * backups so dashboard changes are diffable.
 *
 * Usage:
 *   pnpm op:metabase:export-dashboard               # uses METABASE_DASHBOARD_ID from env
 *   pnpm op:metabase:export-dashboard 4             # explicit dashboard id
 *
 * Requires env vars:
 *   METABASE_SITE_URL   - public URL of the Metabase instance
 *   METABASE_API_KEY    - API key (Admin -> Authentication -> API keys, Metabase >= 0.49)
 *
 * Output layout:
 *   docs/metabase_dashboards/<dashboard-id>/dashboard.json
 *   docs/metabase_dashboards/<dashboard-id>/cards/<card-id>.json
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
// apps/backend/src/scripts -> repo root
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..', '..', '..');
const OUTPUT_ROOT = resolve(REPO_ROOT, 'docs/metabase_dashboards');

// Fields that change on every save / view and would otherwise pollute diffs,
// plus fields that embed personal data (email, names) — never commit those.
const VOLATILE_KEYS = new Set([
  'created_at',
  'updated_at',
  'last_used_at',
  'last_query_started_at',
  'last_edit_info',
  'last-edit-info',
  'creator',
  'view_count',
  'cache_invalidated_at',
  'initially_published_at',
]);

const siteUrl = process.env.METABASE_SITE_URL;
const apiKey = process.env.METABASE_API_KEY;
const dashboardIdArg = process.argv[2] ?? process.env.METABASE_DASHBOARD_ID;

if (!siteUrl) {
  console.error('Missing METABASE_SITE_URL');
  process.exit(1);
}
if (!apiKey) {
  console.error('Missing METABASE_API_KEY (Metabase Admin -> Authentication -> API keys)');
  process.exit(1);
}
if (!dashboardIdArg) {
  console.error('Missing dashboard id (pass as CLI arg or set METABASE_DASHBOARD_ID)');
  process.exit(1);
}

const dashboardId = Number.parseInt(dashboardIdArg, 10);
if (!Number.isFinite(dashboardId) || dashboardId <= 0) {
  console.error(`Invalid dashboard id: ${dashboardIdArg}`);
  process.exit(1);
}

const apiBase = siteUrl.replace(/\/$/, '');

async function apiGet<T>(path: string): Promise<T> {
  const url = `${apiBase}${path}`;
  const res = await fetch(url, { headers: { 'X-API-Key': apiKey as string, Accept: 'application/json' } });
  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`GET ${path} -> ${res.status} ${res.statusText}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// Recursively strip volatile fields and sort keys for stable diffs.
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (VOLATILE_KEYS.has(key)) continue;
      out[key] = normalize((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

function extractCardIds(dashboard: unknown): number[] {
  if (!dashboard || typeof dashboard !== 'object') return [];
  const dashcards =
    (dashboard as { dashcards?: unknown; ordered_cards?: unknown }).dashcards ??
    (dashboard as { ordered_cards?: unknown }).ordered_cards;
  if (!Array.isArray(dashcards)) return [];
  const ids = new Set<number>();
  for (const dc of dashcards) {
    const candidate = (dc as { card_id?: unknown })?.card_id;
    if (typeof candidate === 'number') ids.add(candidate);
    const seriesCards = (dc as { series?: unknown }).series;
    if (Array.isArray(seriesCards)) {
      for (const s of seriesCards) {
        const sid = (s as { id?: unknown }).id;
        if (typeof sid === 'number') ids.add(sid);
      }
    }
  }
  return [...ids].sort((a, b) => a - b);
}

async function writeJson(path: string, payload: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`);
}

console.log(`→ Exporting dashboard ${dashboardId} from ${apiBase}`);

const dashboardRaw = await apiGet<unknown>(`/api/dashboard/${dashboardId}`);
const cardIds = extractCardIds(dashboardRaw);
console.log(`  dashboard fetched, ${cardIds.length} unique card(s) referenced`);

const cards = await Promise.all(cardIds.map(async (id) => ({ id, raw: await apiGet<unknown>(`/api/card/${id}`) })));

const outDir = resolve(OUTPUT_ROOT, String(dashboardId));
await writeJson(resolve(outDir, 'dashboard.json'), normalize(dashboardRaw));
for (const { id, raw } of cards) {
  await writeJson(resolve(outDir, 'cards', `${id}.json`), normalize(raw));
}

console.log(`✓ Wrote ${1 + cards.length} file(s) under docs/metabase_dashboards/${dashboardId}/`);
