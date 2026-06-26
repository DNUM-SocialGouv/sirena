import { stringify } from 'csv-stringify/sync';

export type CsvValue = string | number | boolean | null | undefined;

export function serializeCsv(headers: string[], rows: CsvValue[][]): string {
  return stringify([headers, ...rows], {
    bom: true,
    delimiter: ';',
    record_delimiter: '\n',
    eof: false,
    escape_formulas: true,
    quoted_match: /[;"\n\r]/,
  });
}
