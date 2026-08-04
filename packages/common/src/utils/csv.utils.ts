export type CsvValue = string | number | boolean | null | undefined;

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
