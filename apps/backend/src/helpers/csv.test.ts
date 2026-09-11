import { describe, expect, it } from 'vitest';
import { CsvHeaderError, parseCsvLine, readCsvRows, resolveColumns } from './csv.js';

describe('parseCsvLine', () => {
  it('should split plain fields on the delimiter', () => {
    expect(parseCsvLine('01001;ABERGEMENT;01400', ';')).toEqual(['01001', 'ABERGEMENT', '01400']);
  });

  it('should support a comma delimiter', () => {
    expect(parseCsvLine('a,b,c', ',')).toEqual(['a', 'b', 'c']);
  });

  it('should keep the delimiter inside a quoted field', () => {
    expect(parseCsvLine('"Saint-Georges, le Haut","01D"', ',')).toEqual(['Saint-Georges, le Haut', '01D']);
  });

  it('should unescape doubled quotes inside a quoted field', () => {
    expect(parseCsvLine('"L""Abergement","01D"', ',')).toEqual(['L"Abergement', '01D']);
  });

  it('should preserve empty fields, including trailing ones', () => {
    expect(parseCsvLine('01001;;01400;', ';')).toEqual(['01001', '', '01400', '']);
  });

  it('should return a single field when the line holds no delimiter', () => {
    expect(parseCsvLine('01001', ';')).toEqual(['01001']);
  });

  it('should return one empty field for an empty line', () => {
    expect(parseCsvLine('', ';')).toEqual(['']);
  });

  it('should parse a fully quoted line, as produced by t_geo_com', () => {
    expect(parseCsvLine('"COM_CODE","COM_LIB","CTCD_CODE_ACTUEL"', ',')).toEqual([
      'COM_CODE',
      'COM_LIB',
      'CTCD_CODE_ACTUEL',
    ]);
  });
});

describe('resolveColumns', () => {
  const header = ['SOURCE', 'DATE_MAJ', 'COM_CODE', 'COM_LIB'];

  it('should map each requested column to its index', () => {
    expect(resolveColumns(header, ['COM_CODE', 'COM_LIB'])).toEqual({ COM_CODE: 2, COM_LIB: 3 });
  });

  it('should resolve columns whatever their order in the header', () => {
    expect(resolveColumns(['COM_LIB', 'COM_CODE'], ['COM_CODE', 'COM_LIB'])).toEqual({ COM_CODE: 1, COM_LIB: 0 });
  });

  it('should throw a CsvHeaderError naming the missing column', () => {
    expect(() => resolveColumns(header, ['COM_CODE', 'CTCD_CODE_ACTUEL'])).toThrow(CsvHeaderError);
    expect(() => resolveColumns(header, ['CTCD_CODE_ACTUEL'])).toThrow(/CTCD_CODE_ACTUEL/);
  });

  it('should throw when the payload is not the expected CSV at all', () => {
    expect(() => resolveColumns(['<!DOCTYPE html>'], ['COM_CODE'])).toThrow(CsvHeaderError);
  });
});

describe('readCsvRows', () => {
  const asLines = async function* (lines: string[]) {
    for (const line of lines) {
      yield line;
    }
  };

  const options = { label: 'Référentiel', delimiter: ';', columns: ['CODE', 'LIB'] as const };

  const readAll = async (
    lines: string[],
    onRow: (field: (column: 'CODE' | 'LIB') => string) => boolean = () => true,
  ) => {
    const rows: Array<Record<string, string>> = [];
    const stats = await readCsvRows(asLines(lines), options, (field) => {
      rows.push({ CODE: field('CODE'), LIB: field('LIB') });
      return onRow(field);
    });
    return { rows, stats };
  };

  it('should read every data row by column name, whatever the header order', async () => {
    const { rows, stats } = await readAll(['LIB;DATE;CODE', 'Ain;2026;01', 'Aisne;2026;02']);

    expect(rows).toEqual([
      { CODE: '01', LIB: 'Ain' },
      { CODE: '02', LIB: 'Aisne' },
    ]);
    expect(stats).toEqual({ totalRows: 2, malformedRows: 0 });
  });

  it('should trim the fields it hands over', async () => {
    const { rows } = await readAll(['CODE;LIB', ' 01 ; Ain ']);

    expect(rows).toEqual([{ CODE: '01', LIB: 'Ain' }]);
  });

  it('should count a row whose column count differs from the header without reading it', async () => {
    const { rows, stats } = await readAll(['CODE;LIB', '01;Ain', '02']);

    expect(rows).toEqual([{ CODE: '01', LIB: 'Ain' }]);
    expect(stats).toEqual({ totalRows: 2, malformedRows: 1 });
  });

  it('should count a row the caller declares unusable', async () => {
    const { stats } = await readAll(['CODE;LIB', '01;Ain', '02;Aisne'], (field) => field('CODE') !== '02');

    expect(stats).toEqual({ totalRows: 2, malformedRows: 1 });
  });

  it('should ignore blank lines', async () => {
    const { rows, stats } = await readAll(['CODE;LIB', '01;Ain', '', '   ']);

    expect(rows).toHaveLength(1);
    expect(stats.totalRows).toBe(1);
  });

  it('should throw when an expected column is missing from the header', async () => {
    await expect(readAll(['CODE;DATE', '01;2026'])).rejects.toThrow(CsvHeaderError);
  });

  it('should throw a labelled error when the payload holds no header at all', async () => {
    await expect(readAll([])).rejects.toThrow(/Référentiel vide : aucun en-tête/);
  });
});
