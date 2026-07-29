import type { StatisticsCard } from '@/lib/api/fetchStatistics';

const BOM = String.fromCharCode(0xfeff);
const NEEDS_QUOTING = /[;"\n\r]/;
const FORMULA_START = /^[=+\-@\t\r]/;

const serializeCell = (value: unknown): string => {
  let text = value == null ? '' : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (NEEDS_QUOTING.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
};

export const serializeCsv = (headers: string[], rows: unknown[][]): string => {
  const lines = [headers, ...rows].map((row) => row.map(serializeCell).join(';'));
  return BOM + lines.join('\n');
};

export const buildCardCsv = (card: StatisticsCard): string => {
  const cols = card.data?.cols ?? [];
  const rows = card.data?.rows ?? [];
  return serializeCsv(
    cols.map((col) => col.display_name),
    rows,
  );
};

export const buildCardCsvFilename = (name: string): string => {
  const slug = name
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${slug || 'indicateur'}.csv`;
};
