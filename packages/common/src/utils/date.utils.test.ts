import { afterEach, describe, expect, it, vi } from 'vitest';

import { getOver90DaysCutoffDate, isCreatedOver90DaysAgo } from './date.utils.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-08-05T10:00:00.000Z');

describe('isCreatedOver90DaysAgo', () => {
  it('returns true when created exactly 90 calendar days before now', () => {
    const createdAt = new Date(NOW.getTime() - 90 * DAY_IN_MS);
    expect(isCreatedOver90DaysAgo(createdAt, NOW)).toBe(true);
  });

  it('returns true when created more than 90 days before now', () => {
    const createdAt = new Date(NOW.getTime() - 120 * DAY_IN_MS);
    expect(isCreatedOver90DaysAgo(createdAt, NOW)).toBe(true);
  });

  it('returns false when created 89 days before now', () => {
    const createdAt = new Date(NOW.getTime() - 89 * DAY_IN_MS);
    expect(isCreatedOver90DaysAgo(createdAt, NOW)).toBe(false);
  });

  it('compares whole calendar days, not exact elapsed time', () => {
    const createdAt = new Date(NOW.getTime() - 90 * DAY_IN_MS + 60 * 60 * 1000);
    expect(isCreatedOver90DaysAgo(createdAt, NOW)).toBe(true);
  });

  it('defaults to the current date when now is omitted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    const createdAt = new Date(NOW.getTime() - 100 * DAY_IN_MS);
    expect(isCreatedOver90DaysAgo(createdAt)).toBe(true);
    vi.useRealTimers();
  });
});

describe('getOver90DaysCutoffDate', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is equivalent to isCreatedOver90DaysAgo: createdAt < cutoff iff over 90 days', () => {
    const cutoff = getOver90DaysCutoffDate(NOW);

    const qualifies = new Date(NOW.getTime() - 90 * DAY_IN_MS);
    const doesNotQualify = new Date(NOW.getTime() - 89 * DAY_IN_MS);

    expect(qualifies.getTime() < cutoff.getTime()).toBe(isCreatedOver90DaysAgo(qualifies, NOW));
    expect(doesNotQualify.getTime() < cutoff.getTime()).toBe(isCreatedOver90DaysAgo(doesNotQualify, NOW));
  });

  it('defaults to the current date when now is omitted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(getOver90DaysCutoffDate().getTime()).toBe(getOver90DaysCutoffDate(NOW).getTime());
  });
});

describe('badge/filter equivalence across timezones', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const summerOffset: Record<string, number> = {
    UTC: 0,
    'Europe/Paris': -120,
    'America/Los_Angeles': 420,
    'Pacific/Kiritimati': -840,
  };

  it.each(Object.keys(summerOffset))(
    'createdAt < cutoff iff isCreatedOver90DaysAgo, hourly around the boundary (TZ=%s)',
    (tz) => {
      vi.stubEnv('TZ', tz);
      expect(new Date('2026-07-01T00:00:00.000Z').getTimezoneOffset()).toBe(summerOffset[tz]);
      const now = new Date('2026-08-05T12:00:00.000Z');
      const cutoff = getOver90DaysCutoffDate(now).getTime();
      const start = now.getTime() - 92 * DAY_IN_MS;
      for (let t = start; t <= start + 4 * DAY_IN_MS; t += 60 * 60 * 1000) {
        const createdAt = new Date(t);
        expect(createdAt.getTime() < cutoff).toBe(isCreatedOver90DaysAgo(createdAt, now));
      }
    },
  );
});
