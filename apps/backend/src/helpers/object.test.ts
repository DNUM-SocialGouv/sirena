import { describe, expect, it } from 'vitest';
import { isEqual, pick } from './object.js';

describe('pick', () => {
  it('should pick specified keys from an object', () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    const result = pick(obj, ['a', 'c']);

    expect(result).toEqual({ a: 1, c: 3 });
  });

  it('should return empty object when no keys specified', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = pick(obj, []);

    expect(result).toEqual({});
  });

  it('should ignore non-existent keys', () => {
    const obj = { a: 1, b: 2 };
    // biome-ignore lint/suspicious/noExplicitAny: <test purposes>
    const result = pick(obj, ['a', 'nonExistent'] as any);

    expect(result).toEqual({ a: 1 });
  });

  it('should handle falsy values correctly', () => {
    const obj = {
      zero: 0,
      empty: '',
      nullVal: null,
      undefinedVal: undefined,
      false: false,
    };
    const result = pick(obj, ['zero', 'empty', 'nullVal', 'undefinedVal', 'false']);

    expect(result).toEqual({
      zero: 0,
      empty: '',
      nullVal: null,
      undefinedVal: undefined,
      false: false,
    });
  });

  it('should handle empty object', () => {
    const obj = {};
    // biome-ignore lint/suspicious/noExplicitAny: <test purposes>
    const result = pick(obj, ['a', 'b'] as any);

    expect(result).toEqual({});
  });

  it('should preserve object references', () => {
    const nested = { x: 1 };
    const obj = { a: nested, b: 'test' };
    const result = pick(obj, ['a']);

    expect(result.a).toBe(nested);
  });
});

describe('isEqual', () => {
  it('should return true for identical primitive values', () => {
    expect(isEqual(1, 1)).toBe(true);
    expect(isEqual('test', 'test')).toBe(true);
    expect(isEqual(true, true)).toBe(true);
    expect(isEqual(null, null)).toBe(true);
    expect(isEqual(undefined, undefined)).toBe(true);
  });

  it('should return false for different primitive values', () => {
    expect(isEqual(1, 2)).toBe(false);
    expect(isEqual('test', 'other')).toBe(false);
    expect(isEqual(true, false)).toBe(false);
    expect(isEqual(null, undefined)).toBe(false);
  });

  it('should return true for identical arrays', () => {
    expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(isEqual([], [])).toBe(true);
    expect(isEqual(['a', 'b'], ['a', 'b'])).toBe(true);
  });

  it('should return false for different arrays', () => {
    expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
    expect(isEqual(['a'], ['b'])).toBe(false);
  });

  it('should return true for identical objects', () => {
    expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(isEqual({}, {})).toBe(true);
    expect(isEqual({ x: null }, { x: null })).toBe(true);
  });

  it('should return false for different objects', () => {
    expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    expect(isEqual({ x: 1 }, { y: 1 })).toBe(false);
  });

  it('should handle nested objects', () => {
    const obj1 = { a: { b: { c: 1 } }, d: [1, 2], nested: { a: { b: { c: 1 } } } };
    const obj2 = { a: { b: { c: 1 } }, d: [1, 2], nested: { a: { b: { c: 1 } } } };
    const obj3 = { a: { b: { c: 1 } }, d: [1, 2], nested: { a: { b: { c: 2 } } } };

    expect(isEqual(obj1, obj2)).toBe(true);
    expect(isEqual(obj1, obj3)).toBe(false);
  });

  it('should handle nested arrays', () => {
    expect(isEqual([[1, 2], [3, 4], [[1, 2]]], [[1, 2], [3, 4], [[1, 2]]])).toBe(true);
    expect(isEqual([[1, 2], [3, 4], [[1, 2]]], [[1, 2], [3, 5], [[1, 2]]])).toBe(false);
  });

  it('should handle mixed types correctly', () => {
    expect(isEqual(1, '1')).toBe(false);
    expect(isEqual(null, 0)).toBe(false);
    expect(isEqual(undefined, null)).toBe(false);
    expect(isEqual([], {})).toBe(false);
  });

  it('should handle NaN values correctly', () => {
    expect(isEqual(NaN, NaN)).toBe(true);
    expect(isEqual(0 / 0, 0 / 0)).toBe(true);
    expect(isEqual(Number.NaN, Number.NaN)).toBe(true);

    expect(isEqual(NaN, 0)).toBe(false);
    expect(isEqual(NaN, 1)).toBe(false);
    expect(isEqual(0, NaN)).toBe(false);
    expect(isEqual(NaN, 'NaN')).toBe(false);
    expect(isEqual(NaN, null)).toBe(false);
    expect(isEqual(NaN, undefined)).toBe(false);
  });

  it('should handle nested structures with Dates and NaN', () => {
    const obj1 = {
      created: new Date('2023-01-01'),
      stats: { value: NaN, count: 42 },
      updated: new Date('2023-01-02'),
    };

    const obj2 = {
      created: new Date('2023-01-01'),
      stats: { value: NaN, count: 42 },
      updated: new Date('2023-01-02'),
    };

    const obj3 = {
      created: new Date('2023-01-01'),
      stats: { value: 0, count: 42 },
      updated: new Date('2023-01-02'),
    };

    expect(isEqual(obj1, obj2)).toBe(true);
    expect(isEqual(obj1, obj3)).toBe(false);
  });

  it('should handle complex scenarios', () => {
    const complex1 = {
      users: [
        { id: 1, profile: { settings: { theme: 'dark', notifications: [{ type: 'email', enabled: true }] } } },
        { id: 2, profile: { settings: { theme: 'light', notifications: [{ type: 'sms', enabled: false }] } } },
      ],
      config: {
        database: { host: 'localhost', options: { ssl: true, pool: { min: 1, max: 10 } } },
      },
    };

    const complex2 = {
      users: [
        { id: 1, profile: { settings: { theme: 'dark', notifications: [{ type: 'email', enabled: true }] } } },
        { id: 2, profile: { settings: { theme: 'light', notifications: [{ type: 'sms', enabled: false }] } } },
      ],
      config: {
        database: { host: 'localhost', options: { ssl: true, pool: { min: 1, max: 10 } } },
      },
    };

    const complex3 = {
      users: [
        { id: 1, profile: { settings: { theme: 'dark', notifications: [{ type: 'email', enabled: true }] } } },
        { id: 2, profile: { settings: { theme: 'light', notifications: [{ type: 'sms', enabled: true }] } } },
      ],
      config: {
        database: { host: 'localhost', options: { ssl: true, pool: { min: 1, max: 10 } } },
      },
    };

    expect(isEqual(complex1, complex2)).toBe(true);
    expect(isEqual(complex1, complex3)).toBe(false);
  });

  it('should early return false when comparing null and object', () => {
    expect(isEqual({}, null)).toBe(false);
  });

  it('should early return false when comparing object and date', () => {
    expect(isEqual({}, new Date())).toBe(false);
  });
});
