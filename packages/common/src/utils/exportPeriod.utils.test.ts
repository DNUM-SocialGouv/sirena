import { describe, expect, it } from 'vitest';

import { EXPORT_REQUETES_ERROR_CODES } from '../constants/exportRequetes.constant.js';
import {
  addDaysToIsoDate,
  getDefaultExportPeriod,
  isValidIsoDate,
  shiftIsoDateByMonths,
  validateExportPeriod,
} from './exportPeriod.utils.js';

const TODAY = '2026-10-26';

describe('isValidIsoDate', () => {
  it('accepts a real calendar date', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
  });

  it('rejects impossible dates and other formats', () => {
    expect(isValidIsoDate('2026-02-29')).toBe(false);
    expect(isValidIsoDate('2026-13-01')).toBe(false);
    expect(isValidIsoDate('26/10/2026')).toBe(false);
    expect(isValidIsoDate('')).toBe(false);
    expect(isValidIsoDate(undefined)).toBe(false);
  });
});

describe('shiftIsoDateByMonths', () => {
  it('keeps the day of the month when it exists', () => {
    expect(shiftIsoDateByMonths('2026-10-26', -1)).toBe('2026-09-26');
  });

  it('falls back to the last day of a shorter month', () => {
    expect(shiftIsoDateByMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(shiftIsoDateByMonths('2024-03-31', -1)).toBe('2024-02-29');
    expect(shiftIsoDateByMonths('2026-05-31', -1)).toBe('2026-04-30');
  });

  it('crosses year boundaries in both directions', () => {
    expect(shiftIsoDateByMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(shiftIsoDateByMonths('2023-10-26', 36)).toBe('2026-10-26');
    expect(shiftIsoDateByMonths('2024-02-29', 36)).toBe('2027-02-28');
  });

  it('throws on an invalid date', () => {
    expect(() => shiftIsoDateByMonths('2026-02-30', 1)).toThrow();
  });
});

describe('addDaysToIsoDate', () => {
  it('moves across month and year boundaries', () => {
    expect(addDaysToIsoDate('2026-10-26', 1)).toBe('2026-10-27');
    expect(addDaysToIsoDate('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDaysToIsoDate('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('getDefaultExportPeriod', () => {
  it('ends today and starts on the same day of the previous month', () => {
    expect(getDefaultExportPeriod('2026-10-20')).toEqual({ startDate: '2026-09-20', endDate: '2026-10-20' });
  });

  it('starts on the last day of the previous month when the day does not exist (CA2)', () => {
    expect(getDefaultExportPeriod('2026-03-31')).toEqual({ startDate: '2026-02-28', endDate: '2026-03-31' });
  });
});

describe('validateExportPeriod', () => {
  it('accepts a valid period', () => {
    expect(validateExportPeriod({ startDate: '2026-09-26', endDate: TODAY }, TODAY)).toBeNull();
  });

  it('accepts a single day period', () => {
    expect(validateExportPeriod({ startDate: TODAY, endDate: TODAY }, TODAY)).toBeNull();
  });

  it('requires both dates', () => {
    expect(validateExportPeriod({ startDate: '', endDate: TODAY }, TODAY)).toEqual({
      field: 'startDate',
      code: EXPORT_REQUETES_ERROR_CODES.START_DATE_REQUIRED,
    });
    expect(validateExportPeriod({ startDate: TODAY, endDate: null }, TODAY)).toEqual({
      field: 'endDate',
      code: EXPORT_REQUETES_ERROR_CODES.END_DATE_REQUIRED,
    });
  });

  it('rejects a start date after the end date (CA5)', () => {
    expect(validateExportPeriod({ startDate: '2026-10-10', endDate: '2026-10-01' }, TODAY)).toEqual({
      field: 'startDate',
      code: EXPORT_REQUETES_ERROR_CODES.START_AFTER_END,
    });
  });

  it('rejects an end date after today (CA6)', () => {
    expect(validateExportPeriod({ startDate: '2026-10-01', endDate: '2026-10-27' }, TODAY)).toEqual({
      field: 'endDate',
      code: EXPORT_REQUETES_ERROR_CODES.END_DATE_IN_FUTURE,
    });
  });

  it('rejects a period longer than 36 months (CA7)', () => {
    expect(validateExportPeriod({ startDate: '2023-10-25', endDate: TODAY }, TODAY)).toEqual({
      field: 'startDate',
      code: EXPORT_REQUETES_ERROR_CODES.PERIOD_TOO_LONG,
    });
  });

  it('accepts a period of exactly 36 months (CA8)', () => {
    expect(validateExportPeriod({ startDate: '2023-10-26', endDate: TODAY }, TODAY)).toBeNull();
  });
});
