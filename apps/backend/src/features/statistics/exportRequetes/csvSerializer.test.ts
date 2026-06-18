import { describe, expect, it } from 'vitest';

import { serializeCsv } from './csvSerializer.js';

describe('serializeCsv', () => {
  it('produces a UTF-8 BOM-prefixed semicolon CSV with a header row and one data row', () => {
    const csv = serializeCsv(['Nom', 'Date'], [['Alice', '18/06/2026']]);

    expect(csv).toBe('\uFEFFNom;Date\nAlice;18/06/2026');
  });
});
