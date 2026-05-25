import { describe, expect, it } from 'vitest';
import { SirecTranscoError } from './sirecTransco.error.js';
import { transcodeVictimeSexe } from './victimeSexe.transco.js';

describe('victimeSexe.transco.ts', () => {
  it('should return null when idSirec is null', () => {
    expect(transcodeVictimeSexe(null)).toBeNull();
  });

  it('should return CIVILITE.M when idSirec is 38', () => {
    expect(transcodeVictimeSexe(38)).toBe('M');
  });

  it('should return CIVILITE.MME when idSirec is 40', () => {
    expect(transcodeVictimeSexe(40)).toBe('MME');
  });

  it('should throw SirecTranscoError for unknown id', () => {
    expect(() => transcodeVictimeSexe(99)).toThrow(SirecTranscoError);
  });

  it('should throw SirecTranscoError with correct id and tableName for unknown id', () => {
    expect(() => transcodeVictimeSexe(99)).toThrow(
      'No SIRENA mapping found for SIREC id_dico 99 in victimeSexe transco table',
    );
  });
});
