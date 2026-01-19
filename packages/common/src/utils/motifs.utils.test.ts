import { describe, expect, it } from 'vitest';
import type { MotifOption } from './motifs.utils.js';
import { getAllOptionsFlat, labelsToValues, labelToValue, valuesToLabels, valueToLabel } from './motifs.utils.js';

const TEST_OPTIONS: MotifOption[] = [
  {
    label: 'Catégorie A',
    value: 'cat-a',
    children: [
      { label: 'Option A1', value: 'opt-a1' },
      { label: 'Option A2', value: 'opt-a2' },
      {
        label: 'Sous-catégorie A3',
        value: 'cat-a3',
        children: [
          { label: 'Option A3.1', value: 'opt-a3-1' },
          { label: 'Option A3.2', value: 'opt-a3-2' },
        ],
      },
    ],
  },
  {
    label: 'Catégorie B',
    value: 'cat-b',
    children: [
      { label: 'Option B1', value: 'opt-b1' },
      { label: 'Option B2', value: 'opt-b2' },
    ],
  },
];

describe('motifs.utils', () => {
  describe('getAllOptionsFlat', () => {
    it('should flatten recursive structure', () => {
      const flat = getAllOptionsFlat(TEST_OPTIONS);
      expect(flat).toHaveLength(9);
      expect(flat.map((o) => o.value)).toEqual([
        'cat-a',
        'opt-a1',
        'opt-a2',
        'cat-a3',
        'opt-a3-1',
        'opt-a3-2',
        'cat-b',
        'opt-b1',
        'opt-b2',
      ]);
    });
  });

  describe('valueToLabel', () => {
    it('should convert value to label', () => {
      expect(valueToLabel('opt-a1', TEST_OPTIONS)).toBe('Option A1');
      expect(valueToLabel('opt-a3-1', TEST_OPTIONS)).toBe('Option A3.1');
      expect(valueToLabel('cat-b', TEST_OPTIONS)).toBe('Catégorie B');
    });

    it('should return undefined for unknown value', () => {
      expect(valueToLabel('unknown', TEST_OPTIONS)).toBeUndefined();
    });
  });

  describe('labelToValue', () => {
    it('should convert label to value', () => {
      expect(labelToValue('Option A1', TEST_OPTIONS)).toBe('opt-a1');
      expect(labelToValue('Option A3.1', TEST_OPTIONS)).toBe('opt-a3-1');
      expect(labelToValue('Catégorie B', TEST_OPTIONS)).toBe('cat-b');
    });

    it('should return undefined for unknown label', () => {
      expect(labelToValue('Unknown Label', TEST_OPTIONS)).toBeUndefined();
    });
  });

  describe('labelsToValues', () => {
    it('should convert array of labels to values', () => {
      const labels = ['Option A1', 'Option A3.1', 'Option B2'];
      const values = labelsToValues(labels, TEST_OPTIONS);
      expect(values).toEqual(['opt-a1', 'opt-a3-1', 'opt-b2']);
    });

    it('should keep unknown labels as-is', () => {
      const labels = ['Option A1', 'Unknown', 'Option B2'];
      const values = labelsToValues(labels, TEST_OPTIONS);
      expect(values).toEqual(['opt-a1', 'Unknown', 'opt-b2']);
    });
  });

  describe('valuesToLabels', () => {
    it('should convert array of values to labels', () => {
      const values = ['opt-a1', 'opt-a3-1', 'opt-b2'];
      const labels = valuesToLabels(values, TEST_OPTIONS);
      expect(labels).toEqual(['Option A1', 'Option A3.1', 'Option B2']);
    });

    it('should keep unknown values as-is', () => {
      const values = ['opt-a1', 'unknown', 'opt-b2'];
      const labels = valuesToLabels(values, TEST_OPTIONS);
      expect(labels).toEqual(['Option A1', 'unknown', 'Option B2']);
    });
  });
});
