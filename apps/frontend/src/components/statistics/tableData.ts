import type { ParsedCard } from './chartData';
import { DEFAULT_PERCENT_LABEL, isNumericColumn, isPercentColumn, toNumber } from './columns';
import type { CardData, MetabaseColumn } from './statistics.types';

export type TableColumnKind = 'text' | 'number' | 'percent';

export type TableColumn = {
  label: string;
  kind: TableColumnKind;
};

export type DerivedShare = {
  label: string;
  /** Index of the metric column the share is computed from. */
  columnIndex: number;
  /** Sum of that column over every row, the base of the computation. */
  total: number;
};

export type ParsedTable = {
  columns: TableColumn[];
  rows: readonly unknown[][];
  derivedShare: DerivedShare | null;
};

const columnKind = (col: MetabaseColumn): TableColumnKind => {
  if (isPercentColumn(col)) return 'percent';
  return isNumericColumn(col) ? 'number' : 'text';
};

const sumColumn = (rows: readonly unknown[][], columnIndex: number): number =>
  rows.reduce((sum, row) => sum + (toNumber(row[columnIndex]) ?? 0), 0);

// A share is only derivable when the card exposes a single metric and no SQL-computed percentage:
// beyond that, "a share of what?" has no single answer, so the columns are rendered as they come.
const resolveDerivedShare = (columns: TableColumn[], rows: readonly unknown[][]): DerivedShare | null => {
  if (columns.length < 2) return null;
  if (columns.some((column) => column.kind === 'percent')) return null;
  const metricIndexes = columns.flatMap((column, index) => (column.kind === 'number' ? [index] : []));
  if (metricIndexes.length !== 1) return null;
  const [columnIndex] = metricIndexes;
  return { label: DEFAULT_PERCENT_LABEL, columnIndex, total: sumColumn(rows, columnIndex) };
};

export const parseTable = (data: CardData | undefined | null): ParsedTable | null => {
  if (!data) return null;
  const { cols, rows } = data;
  if (!Array.isArray(cols) || !Array.isArray(rows)) return null;
  if (cols.length === 0 || rows.length === 0) return null;

  const columns = cols.map((col) => ({ label: col.display_name, kind: columnKind(col) }));
  return { columns, rows, derivedShare: resolveDerivedShare(columns, rows) };
};

/** Companion table of a chart: the card is already reduced to dimension / metric / share. */
export const tableFromParsedCard = (parsed: ParsedCard): ParsedTable => {
  const { items, total, dimensionLabel, metricLabel, percentLabel, hasPrecomputedPercent } = parsed;
  const columns: TableColumn[] = [
    { label: dimensionLabel, kind: 'text' },
    { label: metricLabel, kind: 'number' },
  ];

  if (hasPrecomputedPercent) {
    return {
      columns: [...columns, { label: percentLabel, kind: 'percent' }],
      rows: items.map((item) => [item.label, item.value, item.percent]),
      derivedShare: null,
    };
  }

  return {
    columns,
    rows: items.map((item) => [item.label, item.value]),
    derivedShare: { label: percentLabel, columnIndex: 1, total },
  };
};
