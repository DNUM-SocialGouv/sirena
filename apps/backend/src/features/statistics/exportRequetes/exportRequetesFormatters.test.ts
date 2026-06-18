import { describe, expect, it } from 'vitest';

import { formatExportDate } from './exportRequetesFormatters.js';

describe('formatExportDate', () => {
  it('formats dates as DD/MM/YYYY for the CSV export', () => {
    expect(formatExportDate(new Date('2026-06-18T14:30:00.000Z'))).toBe('18/06/2026');
  });

  it('formats missing dates as empty cells', () => {
    expect(formatExportDate(null)).toBe('');
    expect(formatExportDate(undefined)).toBe('');
  });
});
