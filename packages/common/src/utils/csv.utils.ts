export type CsvValue = string | number | boolean | null | undefined;

export const CSV_BOM = String.fromCharCode(0xfeff);
export const CSV_LINE_SEPARATOR = '\n';
const NEEDS_QUOTING = /[;"\n\r]/;
const FORMULA_START = /^[=+\-@\t\r]/;

const serializeCell = (value: unknown): string => {
  let text = value == null ? '' : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (NEEDS_QUOTING.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
};

export const serializeCsvRow = (row: unknown[]): string => row.map(serializeCell).join(';');

export const serializeCsv = (headers: string[], rows: unknown[][]): string =>
  CSV_BOM + [headers, ...rows].map(serializeCsvRow).join(CSV_LINE_SEPARATOR);
