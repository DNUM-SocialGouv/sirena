/**
 * Shared snapshot helpers for the Metabase export/restore scripts.
 *
 * A "snapshot" is the repo-tracked JSON dump produced by `op:metabase:export-dashboard`
 * under `docs/metabase_dashboards/<dashboard-id>/`.
 */

import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/**
 * Fields that change on every save / view and would otherwise pollute diffs,
 * plus fields that embed personal data (email, names) — never commit those.
 */
export const VOLATILE_KEYS = new Set([
  'created_at',
  'updated_at',
  'last_used_at',
  'last_query_started_at',
  'last_query_start',
  'average_query_time',
  'last_edit_info',
  'last-edit-info',
  'creator',
  'view_count',
  'cache_invalidated_at',
  'initially_published_at',
]);

export type JsonObject = Record<string, unknown>;

/** Recursively strip volatile fields and sort keys, for stable diffs and comparisons. */
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

/** Structural equality after normalization (key order and volatile fields ignored). */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
}

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getDashcards(dashboard: unknown): JsonObject[] {
  if (!isObject(dashboard)) return [];
  const dashcards = dashboard.dashcards ?? dashboard.ordered_cards;
  if (!Array.isArray(dashcards)) return [];
  return dashcards.filter(isObject);
}

/** Card ids rendered by the dashboard: one per dashcard, plus every extra series. */
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

/**
 * Card ids used as the *values source* of a filter (`values_source_type: "card"`),
 * e.g. the card feeding the dropdown of the `entity_label` filter. Those cards are
 * never dashcards, so they would be missed by `extractCardIds`.
 */
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
  /** Every card file present under `cards/`, keyed by its source card id. */
  cards: Map<number, JsonObject>;
  /** Card ids referenced by the dashboard but absent from `cards/`. */
  missingDashcardCardIds: number[];
  /** Filter values-source card ids absent from `cards/` (resolved against the target instead). */
  missingValuesSourceCardIds: number[];
};

export async function loadSnapshot(root: string, dashboardId: number): Promise<DashboardSnapshot> {
  const dir = resolve(root, String(dashboardId));
  const dashboardRaw = await readFile(resolve(dir, 'dashboard.json'), 'utf8').catch(() => {
    throw new Error(
      `No snapshot found at ${dir}/dashboard.json — run \`pnpm op:metabase:export-dashboard ${dashboardId}\` first`,
    );
  });

  const dashboard: unknown = JSON.parse(dashboardRaw);
  if (!isObject(dashboard)) throw new Error(`${dir}/dashboard.json is not a JSON object`);

  const cards = new Map<number, JsonObject>();
  const cardFiles = await readdir(resolve(dir, 'cards')).catch(() => [] as string[]);
  for (const file of cardFiles.filter((name) => name.endsWith('.json'))) {
    const parsed: unknown = JSON.parse(await readFile(resolve(dir, 'cards', file), 'utf8'));
    if (!isObject(parsed) || typeof parsed.id !== 'number') {
      throw new Error(`${dir}/cards/${file} is not a card object (missing numeric "id")`);
    }
    cards.set(parsed.id, parsed);
  }

  const missingDashcardCardIds = extractCardIds(dashboard).filter((id) => !cards.has(id));
  const missingValuesSourceCardIds = extractValuesSourceCardIds(dashboard).filter((id) => !cards.has(id));

  return { dashboardId, dir, dashboard, cards, missingDashcardCardIds, missingValuesSourceCardIds };
}
