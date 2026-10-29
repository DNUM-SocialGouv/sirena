import { describe, expect, it } from 'vitest';

import {
  deriveDepartmentCodeFromPostalCode,
  EXPORT_CELL_MAX_LENGTH,
  formatExportBoolean,
  formatExportDate,
  formatExportDateInParis,
  formatExportList,
  toSingleLineText,
  truncateExportCell,
} from './exportRequetesFormatters.js';

describe('deriveDepartmentCodeFromPostalCode', () => {
  it('derives deterministic fallback codes for valid postal codes and rejects invalid values', () => {
    expect(deriveDepartmentCodeFromPostalCode('75001')).toBe('75');
    expect(deriveDepartmentCodeFromPostalCode('97110')).toBe('971');
    expect(deriveDepartmentCodeFromPostalCode('98000')).toBe('980');
    expect(deriveDepartmentCodeFromPostalCode('20167')).toBe('20');
    expect(deriveDepartmentCodeFromPostalCode('Clermont-Ferrand')).toBe('');
  });
});

describe('formatExportDate', () => {
  it('formats dates as DD/MM/YYYY for the CSV export', () => {
    expect(formatExportDate(new Date('2026-06-18T14:30:00.000Z'))).toBe('18/06/2026');
  });

  it('formats missing dates as empty cells', () => {
    expect(formatExportDate(null)).toBe('');
    expect(formatExportDate(undefined)).toBe('');
  });
});

describe('formatExportBoolean', () => {
  it('formats booleans as Oui or Non and missing values as empty cells', () => {
    expect(formatExportBoolean(true)).toBe('Oui');
    expect(formatExportBoolean(false)).toBe('Non');
    expect(formatExportBoolean(null)).toBe('');
    expect(formatExportBoolean(undefined)).toBe('');
  });
});

describe('formatExportList', () => {
  it('joins multiple values with a comma and a space and ignores missing values', () => {
    expect(formatExportList(['Motif A', null, 'Motif B', undefined])).toBe('Motif A, Motif B');
  });
});

describe('formatExportDateInParis', () => {
  it('formats a timestamp with the calendar day seen in Paris', () => {
    expect(formatExportDateInParis(new Date('2026-06-30T22:30:00.000Z'))).toBe('01/07/2026');
    expect(formatExportDateInParis(new Date('2026-01-15T22:30:00.000Z'))).toBe('15/01/2026');
  });

  it('keeps the day of a date-only value stored at UTC midnight', () => {
    expect(formatExportDateInParis(new Date('2026-06-19T00:00:00.000Z'))).toBe('19/06/2026');
  });

  it('returns an empty string without date', () => {
    expect(formatExportDateInParis(null)).toBe('');
  });
});

describe('toSingleLineText', () => {
  it('replaces every kind of line break with a single space', () => {
    expect(toSingleLineText('a\r\nb\rc\n\n  d\u2028e')).toBe('a b c d e');
  });

  it('returns an empty string for empty values', () => {
    expect(toSingleLineText(null)).toBe('');
    expect(toSingleLineText('')).toBe('');
  });
});

describe('truncateExportCell', () => {
  it('leaves a short value untouched', () => {
    expect(truncateExportCell('court')).toBe('court');
  });

  it('cuts a long value to the export limit and says so', () => {
    const value = truncateExportCell('x'.repeat(EXPORT_CELL_MAX_LENGTH + 10));

    expect(value).toHaveLength(EXPORT_CELL_MAX_LENGTH);
    expect(value.endsWith(' […] (texte tronqué)')).toBe(true);
  });
});
