import { describe, expect, it } from 'vitest';
import { SirecTranscoError } from './sirecTransco.error.js';
import { transcodeVictimeLienPlaignant } from './victimeLienPlaignant.transco.js';

describe('victimeLienPlaignant.transco.ts', () => {
  it('should return null when idSirec is null', () => {
    expect(transcodeVictimeLienPlaignant(null)).toBeNull();
  });

  it('should map 46 to MEMBRE_FAMILLE', () => {
    expect(transcodeVictimeLienPlaignant(46)).toBe('MEMBRE_FAMILLE');
  });

  it('should map 107 to AUTRE', () => {
    expect(transcodeVictimeLienPlaignant(107)).toBe('AUTRE');
  });

  it('should throw SirecTranscoError for unknown id', () => {
    expect(() => transcodeVictimeLienPlaignant(999)).toThrow(SirecTranscoError);
  });

  it('should throw SirecTranscoError with correct id for unknown id', () => {
    expect(() => transcodeVictimeLienPlaignant(1)).toThrow(SirecTranscoError);
  });
});
