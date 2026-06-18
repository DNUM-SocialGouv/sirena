import { EXPORT_REQUETES_HEADERS } from './exportRequetesColumns.js';
import type { ExportRequetesCsvRow } from './exportRequetesCsv.js';
import { formatExportDate } from './exportRequetesFormatters.js';

export type ExportRequeteRecord = {
  id: string | null;
  createdAt: Date | null;
  situations: ExportSituationRecord[];
};

type ExportSituationRecord = Record<string, unknown>;

export function buildExportRequetesRows(requetes: ExportRequeteRecord[]): ExportRequetesCsvRow[] {
  return requetes.flatMap((requete) => {
    if (requete.situations.length === 0) {
      return [buildExportRequeteRow(requete, null)];
    }

    return requete.situations.map((situation, index) => buildExportRequeteRow(requete, situation, index));
  });
}

function buildExportRequeteRow(
  requete: ExportRequeteRecord,
  situation: ExportSituationRecord | null,
  situationIndex?: number,
): ExportRequetesCsvRow {
  const row = createEmptyExportRow();

  row[0] = requete.id;
  row[16] = situation ? (situationIndex ?? 0) + 1 : '';
  row[50] = formatExportDate(requete.createdAt);

  return row;
}

function createEmptyExportRow(): ExportRequetesCsvRow {
  return Array.from({ length: EXPORT_REQUETES_HEADERS.length }, () => '');
}
