import { describe, expect, it } from 'vitest';

import { buildExportRequetesRows } from './exportRequetesRows.js';

describe('buildExportRequetesRows', () => {
  it('builds one CSV row for one requête with one situation', () => {
    const rows = buildExportRequetesRows([
      {
        numero: 'REQ-2026-0001',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [{ numero: 1 }],
      },
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(59);
    expect(rows[0][0]).toBe('REQ-2026-0001');
    expect(rows[0][16]).toBe(1);
    expect(rows[0][50]).toBe('18/06/2026');
  });

  it('builds one CSV row per situation and repeats request-level fields', () => {
    const rows = buildExportRequetesRows([
      {
        numero: 'REQ-2026-0002',
        createdAt: new Date('2026-06-18T10:00:00.000Z'),
        situations: [{ numero: 1 }, { numero: 2 }],
      },
    ]);

    expect(rows).toHaveLength(2);
    expect(rows[0][0]).toBe('REQ-2026-0002');
    expect(rows[0][16]).toBe(1);
    expect(rows[0][50]).toBe('18/06/2026');
    expect(rows[1][0]).toBe('REQ-2026-0002');
    expect(rows[1][16]).toBe(2);
    expect(rows[1][50]).toBe('18/06/2026');
  });
});
