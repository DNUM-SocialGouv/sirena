import { describe, expect, it } from 'vitest';

import { serializeCsv } from './csvSerializer.js';

describe('serializeCsv', () => {
  it('produces a UTF-8 BOM-prefixed semicolon CSV with a header row and one data row', () => {
    const csv = serializeCsv(['Nom', 'Date'], [['Alice', '18/06/2026']]);

    expect(csv).toBe('\uFEFFNom;Date\nAlice;18/06/2026');
  });

  it('quotes cells containing semicolons, quotes or line breaks and doubles embedded quotes', () => {
    const csv = serializeCsv(['Description'], [['Alerte; "urgente"\nà traiter']]);

    expect(csv).toBe('\uFEFFDescription\n"Alerte; ""urgente""\nà traiter"');
  });

  it('exports null and undefined values as empty cells', () => {
    const csv = serializeCsv(['Nom', 'Date', 'Commentaire'], [['Alice', null, undefined]]);

    expect(csv).toBe('\uFEFFNom;Date;Commentaire\nAlice;;');
  });

  it('neutralizes string cells that spreadsheet tools could interpret as formulas', () => {
    const csv = serializeCsv(['Formule', 'Plus', 'Moins', 'Arobase'], [['=1+1', '+1+1', '-1+1', '@SUM(1,1)']]);

    expect(csv).toBe("\uFEFFFormule;Plus;Moins;Arobase\n'=1+1;'+1+1;'-1+1;'@SUM(1,1)");
  });

  it('neutralizes formulas before applying standard CSV quote escaping', () => {
    const csv = serializeCsv(['Description'], [['=HYPERLINK("https://attacker.example","click")']]);

    expect(csv).toBe('\uFEFFDescription\n"\'=HYPERLINK(""https://attacker.example"",""click"")"');
  });
});
