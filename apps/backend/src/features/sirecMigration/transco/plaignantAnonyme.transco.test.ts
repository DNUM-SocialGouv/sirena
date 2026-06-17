import { describe, expect, it } from 'vitest';
import { transcodePlaignantAnonyme } from './plaignantAnonyme.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('plaignantAnonyme.transco.ts', () => {
  it('should return true when value is 1', () => {
    expect(transcodePlaignantAnonyme(1)).toBe(true);
  });

  it('should return true when value is 112', () => {
    expect(transcodePlaignantAnonyme(112)).toBe(true);
  });

  it('should return false when value is 0', () => {
    expect(transcodePlaignantAnonyme(0)).toBe(false);
  });

  it('should return false when value is 111', () => {
    expect(transcodePlaignantAnonyme(111)).toBe(false);
  });

  it('should return null when value is null', () => {
    expect(transcodePlaignantAnonyme(null)).toBeNull();
  });

  it('should throw SirecTranscoError for an unknown value', () => {
    expect(() => transcodePlaignantAnonyme(99999)).toThrow(SirecTranscoError);
  });
});
