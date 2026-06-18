import { type CsvValue, serializeCsv } from './csvSerializer.js';
import { EXPORT_REQUETES_HEADERS } from './exportRequetesColumns.js';
import { buildExportRequetesRows, type ExportRequeteRecord } from './exportRequetesRows.js';

export type ExportRequetesCsvRow = CsvValue[];

export function buildExportRequetesCsv(rows: ExportRequetesCsvRow[]): string {
  return serializeCsv([...EXPORT_REQUETES_HEADERS], rows);
}

export function buildExportRequetesCsvFromRecords(requetes: ExportRequeteRecord[]): string {
  return buildExportRequetesCsv(buildExportRequetesRows(requetes));
}
