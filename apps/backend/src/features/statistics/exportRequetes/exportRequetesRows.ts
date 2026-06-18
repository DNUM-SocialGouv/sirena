import { EXPORT_REQUETES_HEADERS } from './exportRequetesColumns.js';
import type { ExportRequetesCsvRow } from './exportRequetesCsv.js';
import { formatExportDate } from './exportRequetesFormatters.js';

export type ExportRequeteRecord = {
  numero: string | null;
  createdAt: Date | null;
  situations: ExportSituationRecord[];
};

type ExportSituationRecord = {
  numero: number | null;
};

export function buildExportRequetesRows(requetes: ExportRequeteRecord[]): ExportRequetesCsvRow[] {
  return requetes.flatMap((requete) =>
    requete.situations.map((situation) => {
      const row = createEmptyExportRow();

      row[0] = requete.numero;
      row[16] = situation.numero;
      row[50] = formatExportDate(requete.createdAt);

      return row;
    }),
  );
}

function createEmptyExportRow(): ExportRequetesCsvRow {
  return Array.from({ length: EXPORT_REQUETES_HEADERS.length }, () => '');
}
