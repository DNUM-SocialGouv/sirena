import { describe, expect, it } from 'vitest';
import { extractCardIds, extractValuesSourceCardIds, isDeepEqual, normalize } from './snapshot.js';

describe('normalize', () => {
  it('sorts keys and strips volatile fields recursively', () => {
    const normalized = normalize({
      b: 1,
      a: { updated_at: 'now', view_count: 3, z: [{ created_at: 'x', y: 2 }] },
    });
    expect(JSON.stringify(normalized)).toBe('{"a":{"z":[{"y":2}]},"b":1}');
  });
});

describe('isDeepEqual', () => {
  it('ignores key order and volatile fields', () => {
    expect(isDeepEqual({ a: 1, b: 2, updated_at: 'x' }, { b: 2, a: 1 })).toBe(true);
    expect(isDeepEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
});

describe('extractCardIds', () => {
  it('collects dashcard cards and their extra series', () => {
    expect(
      extractCardIds({
        dashcards: [{ card_id: 7, series: [{ id: 9 }] }, { card_id: 7 }, { card_id: 3 }],
      }),
    ).toEqual([3, 7, 9]);
  });
});

describe('extractValuesSourceCardIds', () => {
  it('finds the cards feeding a filter dropdown, however deeply nested', () => {
    expect(
      extractValuesSourceCardIds({
        parameters: [{ values_source_config: { card_id: 46 } }],
        dashcards: [{ card: { parameters: [{ values_source_config: { card_id: 46 } }] } }],
      }),
    ).toEqual([46]);
  });

  it('ignores static value lists', () => {
    expect(extractValuesSourceCardIds({ parameters: [{ values_source_config: { values: [['A']] } }] })).toEqual([]);
  });
});
