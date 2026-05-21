import { describe, expect, it } from 'vitest';
import { transcodeDeclarant } from './declarant.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('declarant.transco.ts', () => {
  it('should return true when declarant is 34 (usager victime)', () => {
    expect(transcodeDeclarant(34)).toBe(true);
  });

  it('should return false when declarant is 36 (différent de la victime)', () => {
    expect(transcodeDeclarant(36)).toBe(false);
  });

  it('should return null when declarant is null', () => {
    expect(transcodeDeclarant(null)).toBeNull();
  });

  it('should throw SirecTranscoError for an unknown id', () => {
    expect(() => transcodeDeclarant(99999)).toThrow(SirecTranscoError);
  });
});
