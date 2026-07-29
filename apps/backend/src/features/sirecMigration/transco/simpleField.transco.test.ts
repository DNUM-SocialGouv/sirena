import { describe, expect, it } from 'vitest';
import { transcodeSimpleField } from './simpleField.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('simpleField.transco.ts', () => {
  it('should return the label for a known id', () => {
    expect(transcodeSimpleField(740, 'departement')).toBe('Paris');
  });

  it('should return null when id is null', () => {
    expect(transcodeSimpleField(null, 'departement')).toBeNull();
  });

  it('should throw SirecTranscoError with the given table name for an unknown id', () => {
    expect(() => transcodeSimpleField(99999, 'monChamp')).toThrow(SirecTranscoError);
    try {
      transcodeSimpleField(99999, 'monChamp');
    } catch (e) {
      expect((e as SirecTranscoError).tableName).toBe('monChamp');
    }
  });
});
