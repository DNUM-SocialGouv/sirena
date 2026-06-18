import { describe, expect, it } from 'vitest';
import { StatisticsDashboardQuerySchema } from './statistics.schema.js';

describe('StatisticsDashboardQuerySchema', () => {
  it('accepts an empty query', () => {
    const result = StatisticsDashboardQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data).toEqual({});
  });

  it('accepts a single bound', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ startDate: '2026-01-01' }).success).toBe(true);
    expect(StatisticsDashboardQuerySchema.safeParse({ endDate: '2026-01-31' }).success).toBe(true);
  });

  it('accepts a valid range', () => {
    const result = StatisticsDashboardQuerySchema.safeParse({ startDate: '2026-01-01', endDate: '2026-03-31' });
    expect(result.success).toBe(true);
  });

  it('accepts an equal start and end', () => {
    const result = StatisticsDashboardQuerySchema.safeParse({ startDate: '2026-01-01', endDate: '2026-01-01' });
    expect(result.success).toBe(true);
  });

  it('rejects a start date after the end date', () => {
    const result = StatisticsDashboardQuerySchema.safeParse({ startDate: '2026-03-31', endDate: '2026-01-01' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed date', () => {
    expect(StatisticsDashboardQuerySchema.safeParse({ startDate: '31-03-2026' }).success).toBe(false);
    expect(StatisticsDashboardQuerySchema.safeParse({ startDate: '2026-13-01' }).success).toBe(false);
  });
});
