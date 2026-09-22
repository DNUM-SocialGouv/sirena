import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSeedContext } from './context.js';
import { buildFaker, pastDate } from './faker.helpers.js';
import { buildE2eSeedConfig } from './profiles.js';

vi.mock('../../libs/prisma.js', () => ({ prisma: { user: { findMany: vi.fn().mockResolvedValue([]) } } }));
vi.mock('./entites.js', () => ({
  ARS_IDF_REG_LIB: 'Île-de-France',
  resolveArsEntites: vi.fn().mockResolvedValue({}),
}));
vi.mock('./referentials.js', () => ({ loadReferentials: vi.fn().mockResolvedValue({}) }));

afterEach(() => {
  vi.useRealTimers();
  buildFaker(null);
});

describe('seed reference date', () => {
  it('keeps the request reference and generated dates stable across execution months', async () => {
    vi.useFakeTimers();
    const generate = async (executionDate: string) => {
      vi.setSystemTime(new Date(executionDate));
      const config = buildE2eSeedConfig();
      const ctx = await buildSeedContext(config.fakerSeed, config.referenceDate);
      return {
        now: ctx.now,
        dates: [pastDate(ctx.faker, 8), pastDate(ctx.faker, 6), pastDate(ctx.faker, 2)],
      };
    };

    const first = await generate('2026-09-22T12:00:00.000Z');
    const second = await generate('2027-01-03T12:00:00.000Z');

    expect(second).toEqual(first);
    expect(first.now).toEqual(new Date('2026-09-16T12:00:00.000Z'));
    for (const date of first.dates) {
      expect(date.getTime()).toBeLessThan(first.now.getTime());
    }
  });

  it('restores current dates for interactive runs after an e2e run', async () => {
    vi.useFakeTimers();
    const now = new Date('2027-01-03T12:00:00.000Z');
    vi.setSystemTime(now);
    const config = buildE2eSeedConfig();
    await buildSeedContext(config.fakerSeed, config.referenceDate);

    const ctx = await buildSeedContext(config.fakerSeed);
    const date = pastDate(ctx.faker, 1);

    expect(ctx.now).toEqual(now);
    expect(date.getTime()).toBeLessThan(now.getTime());
    expect(date.getTime()).toBeGreaterThanOrEqual(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  });
});
