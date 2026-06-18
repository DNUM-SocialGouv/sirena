import { describe, expect, it } from 'vitest';

import { buildExportRequetesCsv } from './exportRequetesCsv.js';

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
});
