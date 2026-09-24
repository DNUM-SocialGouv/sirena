import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isEntityId } from './client.js';

export const VOLATILE_KEYS = new Set([
  'created_at',
  'updated_at',
  'last_used_at',
  'last_query_started_at',
  'last_query_start',
  'last_viewed_at',
  'average_query_time',
  'view_count',
  'cache_invalidated_at',
  'initially_published_at',
  'result_metadata',

  'last_edit_info',
  'last-edit-info',
  'creator',
  'personal_owner_id',
  'last_used_param_values',

  'public_uuid',
  'made_public_by_id',
  'metabase_version',
]);

export type JsonObject = Record<string, unknown>;

export function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out: JsonObject = {};
    for (const key of Object.keys(value as JsonObject).sort()) {
      if (VOLATILE_KEYS.has(key)) continue;
      out[key] = normalize((value as JsonObject)[key]);
    }
    return out;
  }
  return value;
}

export function isDeepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

const isNotFound = (error: unknown): boolean =>
  isObject(error) && (error.code === 'ENOENT' || error.code === 'ENOTDIR');

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getDashcards(dashboard: unknown): JsonObject[] {
  if (!isObject(dashboard)) return [];
  const dashcards = dashboard.dashcards ?? dashboard.ordered_cards;
  if (!Array.isArray(dashcards)) return [];
  return dashcards.filter(isObject);
}

export function extractCardIds(dashboard: unknown): number[] {
  const ids = new Set<number>();
  for (const dc of getDashcards(dashboard)) {
    if (typeof dc.card_id === 'number') ids.add(dc.card_id);
    if (Array.isArray(dc.series)) {
      for (const serie of dc.series) {
        if (isObject(serie) && typeof serie.id === 'number') ids.add(serie.id);
      }
    }
  }
  return [...ids].sort((a, b) => a - b);
}

export function extractValuesSourceCardIds(value: unknown): number[] {
  const ids = new Set<number>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (!isObject(node)) return;
    for (const [key, child] of Object.entries(node)) {
      if (key === 'values_source_config' && isObject(child) && typeof child.card_id === 'number') {
        ids.add(child.card_id);
      }
      walk(child);
    }
  };
  walk(value);
  return [...ids].sort((a, b) => a - b);
}

export type DashboardSnapshot = {
  dashboardId: number;
  dir: string;
  dashboard: JsonObject;

  cards: Map<number, JsonObject>;

  missingDashcardCardIds: number[];

  missingValuesSourceCardIds: number[];
};

export async function loadSnapshot(root: string, dashboardId: number): Promise<DashboardSnapshot> {
  const dir = resolve(root, String(dashboardId));
  const dashboardRaw = await readFile(resolve(dir, 'dashboard.json'), 'utf8').catch((error: unknown) => {
    if (!isNotFound(error)) throw error;
    throw new Error(
      `No snapshot found at ${dir}/dashboard.json — run \`pnpm op:metabase:export-dashboard ${dashboardId}\` first`,
    );
  });

  const dashboard: unknown = JSON.parse(dashboardRaw);
  if (!isObject(dashboard)) throw new Error(`${dir}/dashboard.json is not a JSON object`);

  const cards = new Map<number, JsonObject>();
  const cardFiles = await readdir(resolve(dir, 'cards')).catch((error: unknown) => {
    if (!isNotFound(error)) throw error;
    return [] as string[];
  });
  for (const file of cardFiles.filter((name) => name.endsWith('.json'))) {
    const parsed: unknown = JSON.parse(await readFile(resolve(dir, 'cards', file), 'utf8'));

    if (!isObject(parsed) || !isEntityId(parsed.id)) {
      throw new Error(`${dir}/cards/${file} is not a card object (missing positive integer "id")`);
    }
    cards.set(parsed.id, parsed);
  }

  const missingDashcardCardIds = extractCardIds(dashboard).filter((id) => !cards.has(id));
  const missingValuesSourceCardIds = extractValuesSourceCardIds(dashboard).filter((id) => !cards.has(id));

  return { dashboardId, dir, dashboard, cards, missingDashcardCardIds, missingValuesSourceCardIds };
}
