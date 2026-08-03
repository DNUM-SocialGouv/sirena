import { describe, expect, it } from 'vitest';
import { transcodeMotifsDeclaratifs } from './motifsDeclaratifs.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('motifsDeclaratifs.transco.ts', () => {
  it('should return an empty array when no idDicos are provided', () => {
    expect(transcodeMotifsDeclaratifs([])).toEqual([]);
  });

  it('should transcode known idDicos to SIRENA motifDeclaratifIds', () => {
    expect(transcodeMotifsDeclaratifs([809, 811, 813])).toEqual([
      'PROBLEME_FACTURATION',
      'PROBLEME_LOCAUX',
      'PROBLEME_INFORMATION',
    ]);
  });

  it('should transcode multiple ids mapping to the same SIRENA value', () => {
    expect(transcodeMotifsDeclaratifs([823, 815, 819])).toEqual(['AUTRE', 'AUTRE', 'AUTRE']);
  });

  it('should throw SirecTranscoError for an unknown idDico', () => {
    expect(() => transcodeMotifsDeclaratifs([999])).toThrow(SirecTranscoError);
  });

  it('should include the unknown idDico and table name in the error', () => {
    let error: SirecTranscoError | null = null;
    try {
      transcodeMotifsDeclaratifs([999]);
    } catch (err) {
      error = err as SirecTranscoError;
    }
    expect(error?.idDico).toBe(999);
    expect(error?.tableName).toBe('motifsDeclaratifs');
  });

  it('should throw on the first unknown idDico even if others are valid', () => {
    expect(() => transcodeMotifsDeclaratifs([809, 999, 811])).toThrow(SirecTranscoError);
  });
});
