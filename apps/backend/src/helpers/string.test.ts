import { describe, expect, it } from 'vitest';
import { capitalizeFirst } from './string.js';

describe('string helpers', () => {
  describe('capitalizeFirst', () => {
    it('should capitalize the first letter and lowercase the rest', () => {
      expect(capitalizeFirst('jean')).toBe('Jean');
      expect(capitalizeFirst('JEAN')).toBe('Jean');
      expect(capitalizeFirst('jEaN')).toBe('Jean');
    });

    it('should handle single-character strings', () => {
      expect(capitalizeFirst('j')).toBe('J');
      expect(capitalizeFirst('J')).toBe('J');
    });

    it('should return empty string when input is empty', () => {
      expect(capitalizeFirst('')).toBe('');
    });
  });
});
