import { describe, expect, it } from 'vitest';
import { CsvHeaderError, parseCsvLine, resolveColumns } from './csv.js';

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
