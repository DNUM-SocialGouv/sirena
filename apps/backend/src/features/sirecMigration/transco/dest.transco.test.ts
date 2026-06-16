import { describe, expect, it } from 'vitest';
import { transcodeDest } from './dest.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('dest.transco.ts', () => {
  it('should return the label for a known id', () => {
    expect(transcodeDest(12)).toBe('Courriel');
  });

  it('should return null when id is null', () => {
    expect(transcodeDest(null)).toBeNull();
  });

  it('should throw SirecTranscoError for an unknown id', () => {
    expect(() => transcodeDest(99999)).toThrow(SirecTranscoError);
  });
});
