import { describe, expect, it } from 'vitest';
import { transcodeSignalement } from './signalement.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('signalement.transco.ts', () => {
  it('should return true when value is 1', () => {
    expect(transcodeSignalement(1)).toBe(true);
  });

  it('should return true when value is 112', () => {
    expect(transcodeSignalement(112)).toBe(true);
  });

  it('should return false when value is 0', () => {
    expect(transcodeSignalement(0)).toBe(false);
  });

  it('should return false when value is 111', () => {
    expect(transcodeSignalement(111)).toBe(false);
  });

  it('should return null when value is null', () => {
    expect(transcodeSignalement(null)).toBeNull();
  });

  it('should throw SirecTranscoError for an unknown value', () => {
    expect(() => transcodeSignalement(99999)).toThrow(SirecTranscoError);
  });
});
