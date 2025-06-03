import { beforeEach, describe, expect, it, vi } from 'vitest';

// 2) MOCK envVars and any other config before importing
vi.mock('@/config/env', () => ({
  envVars: {},
}));
import { objectToQueryParams } from './auth.service';

describe('auth.service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('objectToQueryParams()', () => {
    it('should skip undefined, null, empty, and falsey values but stringify objects/arrays', () => {
      const input = {
        foo: 'bar',
        emptyString: '',
        zero: 0,
        isFalse: false,
        isNull: null,
        isUndefined: undefined,
        anArray: [1, 2, 3],
        anObject: { a: 1, b: 'two' },
      };

      const params = objectToQueryParams(input);
      const result: Record<string, string> = {};
      params.forEach((value, key) => {
        result[key] = value;
      });

      expect(result).toHaveProperty('foo', 'bar');
      expect(result).not.toHaveProperty('emptyString');
      expect(result).not.toHaveProperty('zero');
      expect(result).not.toHaveProperty('isFalse');
      expect(result).not.toHaveProperty('isNull');
      expect(result).not.toHaveProperty('isUndefined');
      expect(result).toHaveProperty('anArray', JSON.stringify([1, 2, 3]));
      expect(result).toHaveProperty('anObject', JSON.stringify({ a: 1, b: 'two' }));
    });
  });
});
