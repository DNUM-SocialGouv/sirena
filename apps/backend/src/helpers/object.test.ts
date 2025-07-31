import { describe, expect, it } from 'vitest';
import { pick } from './object';

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
