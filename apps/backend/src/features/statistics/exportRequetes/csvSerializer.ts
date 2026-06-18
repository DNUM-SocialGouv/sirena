export type CsvValue = string | number | boolean | null | undefined;

const UTF8_BOM = '\uFEFF';
const CSV_DELIMITER = ';';
const CSV_LINE_BREAK = '\n';

export function serializeCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.join(CSV_DELIMITER), ...rows.map((row) => row.map(formatCsvValue).join(CSV_DELIMITER))];

  return `${UTF8_BOM}${lines.join(CSV_LINE_BREAK)}`;
}

function formatCsvValue(value: CsvValue): string {
  return value == null ? '' : String(value);
}
