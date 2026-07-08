import { type CsvValue, serializeCsv } from './csvSerializer.js';
import { EXPORT_REQUETES_HEADERS } from './exportRequetesColumns.js';
import {
  type BuildExportRequetesRowsOptions,
  buildExportRequetesRows,
  type ExportRequeteRecord,
} from './exportRequetesRows.js';

export type ExportRequetesCsvRow = CsvValue[];

export function buildExportRequetesCsv(rows: ExportRequetesCsvRow[]): string {
  return serializeCsv([...EXPORT_REQUETES_HEADERS], rows);
}

export function buildExportRequetesCsvFromRecords(
  requetes: ExportRequeteRecord[],
  options: BuildExportRequetesRowsOptions = {},
): string {
  return buildExportRequetesCsv(buildExportRequetesRows(requetes, options));
}
