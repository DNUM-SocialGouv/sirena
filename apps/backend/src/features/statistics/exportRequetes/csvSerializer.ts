export type CsvValue = string | number | boolean | null | undefined;

const UTF8_BOM = '\uFEFF';
const CSV_DELIMITER = ';';
const CSV_LINE_BREAK = '\n';
const SPREADSHEET_FORMULA_PREFIX_PATTERN = /^[=+\-@]/;

export function serializeCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.join(CSV_DELIMITER), ...rows.map((row) => row.map(formatCsvValue).join(CSV_DELIMITER))];

  return `${UTF8_BOM}${lines.join(CSV_LINE_BREAK)}`;
}

function formatCsvValue(value: CsvValue): string {
  if (value == null) {
    return '';
  }

  const stringValue = typeof value === 'string' ? sanitizeSpreadsheetFormula(value) : String(value);

  if (!/[;"\n\r]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replaceAll('"', '""')}"`;
}

function sanitizeSpreadsheetFormula(value: string): string {
  if (!SPREADSHEET_FORMULA_PREFIX_PATTERN.test(value)) {
    return value;
  }

  return `'${value}`;
}
