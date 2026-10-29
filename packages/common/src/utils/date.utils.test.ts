import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getOver90DaysCutoffDate,
  getStartOfDayInTimeZone,
  isCreatedOver90DaysAgo,
  isDayReachedInParis,
  isSupportedTimeZone,
  toWallClockDate,
} from './date.utils.js';

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

describe('isSupportedTimeZone', () => {
  it('accepts an IANA timezone name', () => {
    expect(isSupportedTimeZone('Pacific/Noumea')).toBe(true);
  });

  it('rejects an unknown timezone name', () => {
    expect(isSupportedTimeZone('Mars/Olympus_Mons')).toBe(false);
  });
});

describe('toWallClockDate', () => {
  it('exposes the Paris summer wall clock through the UTC fields', () => {
    const result = toWallClockDate(new Date('2026-04-20T16:03:12.000Z'), 'Europe/Paris');

    expect(result.toISOString()).toBe('2026-04-20T18:03:12.000Z');
  });

  it('exposes the Paris winter wall clock through the UTC fields', () => {
    const result = toWallClockDate(new Date('2026-01-15T16:03:12.000Z'), 'Europe/Paris');

    expect(result.toISOString()).toBe('2026-01-15T17:03:12.000Z');
  });

  it('uses the given timezone, including overseas ones', () => {
    const result = toWallClockDate(new Date('2026-04-20T16:03:12.000Z'), 'Indian/Reunion');

    expect(result.toISOString()).toBe('2026-04-20T20:03:12.000Z');
  });

  it('shifts the day when the reader is on the other side of the date line', () => {
    const result = toWallClockDate(new Date('2026-04-20T16:03:12.000Z'), 'Pacific/Noumea');

    expect(result.toISOString()).toBe('2026-04-21T03:03:12.000Z');
  });

  it('handles midnight without rolling over to hour 24', () => {
    const result = toWallClockDate(new Date('2026-04-19T22:00:00.000Z'), 'Europe/Paris');

    expect(result.toISOString()).toBe('2026-04-20T00:00:00.000Z');
  });

  it('falls back to Europe/Paris when no timezone is given', () => {
    const result = toWallClockDate(new Date('2026-04-20T16:03:12.000Z'));

    expect(result.toISOString()).toBe('2026-04-20T18:03:12.000Z');
  });

  it('falls back to Europe/Paris when the timezone is unknown', () => {
    const result = toWallClockDate(new Date('2026-04-20T16:03:12.000Z'), 'Mars/Olympus_Mons');

    expect(result.toISOString()).toBe('2026-04-20T18:03:12.000Z');
  });
});

describe('getStartOfDayInTimeZone', () => {
  it('returns midnight in Paris during winter time (UTC+1)', () => {
    expect(getStartOfDayInTimeZone('2026-01-15').toISOString()).toBe('2026-01-14T23:00:00.000Z');
  });

  it('returns midnight in Paris during summer time (UTC+2)', () => {
    expect(getStartOfDayInTimeZone('2026-07-01').toISOString()).toBe('2026-06-30T22:00:00.000Z');
  });

  it('handles the days of the DST changes', () => {
    expect(getStartOfDayInTimeZone('2026-03-29').toISOString()).toBe('2026-03-28T23:00:00.000Z');
    expect(getStartOfDayInTimeZone('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z');
  });

  it('supports another timezone', () => {
    expect(getStartOfDayInTimeZone('2026-07-01', 'Indian/Reunion').toISOString()).toBe('2026-06-30T20:00:00.000Z');
  });
});

describe('isDayReachedInParis', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const atInstant = (iso: string, day: string) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
    return isDayReachedInParis(day);
  };

  it('treats the current Paris day as reached', () => {
    expect(atInstant('2026-03-11T09:00:00.000Z', '2026-03-11T00:00:00.000Z')).toBe(true);
  });

  it('treats a later day as not reached', () => {
    expect(atInstant('2026-03-11T09:00:00.000Z', '2026-03-12T00:00:00.000Z')).toBe(false);
  });

  it('treats an earlier day as reached', () => {
    expect(atInstant('2026-03-11T09:00:00.000Z', '2026-02-28T00:00:00.000Z')).toBe(true);
  });

  // 23:30 UTC is already the next day in Paris, and that is the day the server compares against.
  it('follows the Paris day, not the UTC one', () => {
    expect(atInstant('2026-03-10T23:30:00.000Z', '2026-03-11T00:00:00.000Z')).toBe(true);
  });
});
