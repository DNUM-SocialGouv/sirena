import type { MetabaseColumn } from './statistics.types';

export const DEFAULT_PERCENT_LABEL = 'Part (%)';

const PERCENT_SEMANTIC_TYPE = 'type/Percentage';

export const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export const isNumericColumn = (col: MetabaseColumn): boolean => /Integer|Decimal|Float|Number/i.test(col.base_type);

const isPercentByName = (col: MetabaseColumn): boolean =>
  /%|pourcent/i.test(col.display_name) || /%|pourcent/i.test(col.name);

// Native SQL cards carry no Metabase metadata (semantic_type null), so fall back to the column label.
export const isPercentColumn = (col: MetabaseColumn): boolean =>
  col.semantic_type === PERCENT_SEMANTIC_TYPE || (isNumericColumn(col) && isPercentByName(col));

export const findPercentColumn = (cols: MetabaseColumn[]): MetabaseColumn | null =>
  cols.find((col) => col.semantic_type === PERCENT_SEMANTIC_TYPE) ??
  cols.find((col) => isNumericColumn(col) && isPercentByName(col)) ??
  null;
