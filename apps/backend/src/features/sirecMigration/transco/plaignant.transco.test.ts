import { describe, expect, it } from 'vitest';
import { transcodePlaignant } from './plaignant.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('plaignant.transco.ts', () => {
  it('should return true when plaignant is 34 (usager victime)', () => {
    expect(transcodePlaignant(34)).toBe(true);
  });

  it('should return false when plaignant is 36 (différent de la victime)', () => {
    expect(transcodePlaignant(36)).toBe(false);
  });

  it('should return null when plaignant is null', () => {
    expect(transcodePlaignant(null)).toBeNull();
  });

  it('should throw SirecTranscoError for an unknown id', () => {
    expect(() => transcodePlaignant(99999)).toThrow(SirecTranscoError);
  });
});
