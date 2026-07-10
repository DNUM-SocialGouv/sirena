import { describe, expect, it } from 'vitest';

import {
  deriveDepartmentCodeFromPostalCode,
  formatExportBoolean,
  formatExportDate,
  formatExportList,
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
