import { describe, expect, it } from 'vitest';

import { buildExportRequetesCsv, buildExportRequetesCsvFromRecords } from './exportRequetesCsv.js';

describe('buildExportRequetesCsv', () => {
  it('exports the 59 XLSX business columns as a semicolon-separated CSV header when there are no rows', () => {
    const csv = buildExportRequetesCsv([]);
    const header = csv.replace(/^\uFEFF/, '');
    const columns = header.split(';');

    expect(csv).toMatch(/^\uFEFF/);
    expect(header).not.toContain('\n');
    expect(columns).toHaveLength(59);
    expect(columns[0]).toBe('Numéro de requête');
    expect(columns[16]).toBe('Numéro de situation');
    expect(columns[58]).toBe('Raison(s) clôture de la requête pour mon entité administrative');
  });

  it('exports requête records as CSV data rows below the header', () => {
    const csv = buildExportRequetesCsvFromRecords([
      {
        numero: 'REQ-2026-0001',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [{ numero: 1 }],
      },
    ]);
    const lines = csv.replace(/^\uFEFF/, '').split('\n');
    const row = lines[1].split(';');

    expect(lines).toHaveLength(2);
    expect(row).toHaveLength(59);
    expect(row[0]).toBe('REQ-2026-0001');
    expect(row[16]).toBe('1');
    expect(row[50]).toBe('18/06/2026');
  });
});
