import { describe, expect, it } from 'vitest';
import { transcodeCourrierSignal } from './courrierSignal.transco.js';
import { SirecTranscoError } from './sirecTransco.error.js';

describe('courrierSignal.transco.ts', () => {
  it('should return the label for a known id', () => {
    expect(transcodeCourrierSignal(10)).toBe('Courrier');
  });

  it('should return null when id is null', () => {
    expect(transcodeCourrierSignal(null)).toBeNull();
  });

  it('should throw SirecTranscoError for an unknown id', () => {
    expect(() => transcodeCourrierSignal(99999)).toThrow(SirecTranscoError);
  });
});
