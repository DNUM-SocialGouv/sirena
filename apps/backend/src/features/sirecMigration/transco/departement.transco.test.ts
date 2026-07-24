import { describe, expect, it } from 'vitest';
import { transcodeDepartement } from './departement.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('departement.transco.ts', () => {
  it('should return the label for a known id', () => {
    expect(transcodeDepartement(740)).toBe('Paris');
  });

  it('should return null when id is null', () => {
    expect(transcodeDepartement(null)).toBeNull();
  });

  it('should throw SirecTranscoError for an unknown id', () => {
    expect(() => transcodeDepartement(99999)).toThrow(SirecTranscoError);
  });
});
