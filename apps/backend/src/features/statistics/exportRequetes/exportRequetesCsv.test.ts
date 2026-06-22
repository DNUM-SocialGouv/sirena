import { describe, expect, it } from 'vitest';

import { EXPORT_REQUETES_COLUMNS, type ExportRequetesColumnKey } from './exportRequetesColumns.js';
import { buildExportRequetesCsv, buildExportRequetesCsvFromRecords } from './exportRequetesCsv.js';

describe('buildExportRequetesCsv', () => {
  it('exports the 59 XLSX business columns as a semicolon-separated CSV header when there are no rows', () => {
    const csv = buildExportRequetesCsv([]);
    const header = csv.replace(/^\uFEFF/, '');
    const columns = header.split(';');

    expect(csv).toMatch(/^\uFEFF/);
    expect(header).not.toContain('\n');
    expect(columns).toHaveLength(EXPORT_REQUETES_COLUMNS.length);
    expect(headerCell(columns, 'numeroRequete')).toBe('Numéro de requête');
    expect(headerCell(columns, 'numeroSituation')).toBe('Numéro de situation');
    expect(headerCell(columns, 'raisonsClotureEntiteAdministrative')).toBe(
      'Raison(s) clôture de la requête pour mon entité administrative',
    );
  });

  it('exports requête records as CSV data rows below the header', () => {
    const csv = buildExportRequetesCsvFromRecords([
      {
        id: 'REQ-2026-0001',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [{}],
      },
    ]);
    const lines = csv.replace(/^\uFEFF/, '').split('\n');
    const row = lines[1].split(';');

    expect(lines).toHaveLength(2);
    expect(row).toHaveLength(EXPORT_REQUETES_COLUMNS.length);
    expect(csvCell(row, 'numeroRequete')).toBe('REQ-2026-0001');
    expect(csvCell(row, 'numeroSituation')).toBe('1');
    expect(csvCell(row, 'dateCreationRequeteSirena')).toBe('18/06/2026');
  });
});

function headerCell(row: string[], key: ExportRequetesColumnKey): string | undefined {
  return row[columnIndex(key)];
}

function csvCell(row: string[], key: ExportRequetesColumnKey): string | undefined {
  return row[columnIndex(key)];
}

function columnIndex(key: ExportRequetesColumnKey): number {
  return EXPORT_REQUETES_COLUMNS.findIndex((column) => column.key === key);
}
