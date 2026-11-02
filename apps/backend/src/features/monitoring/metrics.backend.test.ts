import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../libs/prisma.js';

const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() };

vi.mock('../../libs/asyncLocalStorage.js', () => ({
  getLoggerStore: vi.fn(() => logger),
}));

vi.mock('../../helpers/sse.js', () => ({
  sseEventManager: { getConnectionCounts: () => ({}) },
}));

type RequeteFixture = {
  daysSinceCreation: number;
  /** One entry per linked entite, holding its number of processing steps. */
  entites: readonly number[];
};

type RequeteAggregate = {
  total: number;
  unassigned: number;
  withoutSteps: number;
  stale: number;
  totalDaysUnassigned: number;
  oldestUnassignedDays: number;
};

const EMPTY_AGGREGATE: RequeteAggregate = {
  total: 0,
  unassigned: 0,
  withoutSteps: 0,
  stale: 0,
  totalDaysUnassigned: 0,
  oldestUnassignedDays: 0,
};

type Category = 'unassigned' | 'withoutSteps' | 'stale' | 'processed';

// Categories are mutually exclusive: an unassigned request is never counted as being without steps,
// and a request without steps is never counted as stale however old it is.
function categorize({ daysSinceCreation, entites }: RequeteFixture): Category {
  if (entites.length === 0) {
    return 'unassigned';
  }
  if (!entites.some((steps) => steps > 0)) {
    return 'withoutSteps';
  }
  return daysSinceCreation >= 30 ? 'stale' : 'processed';
}

// Reference aggregation the SQL must honour: only unassigned requests feed the age gauges.
function aggregate(fixtures: readonly RequeteFixture[]): RequeteAggregate {
  const unassignedDays = fixtures
    .filter((fixture) => categorize(fixture) === 'unassigned')
    .map((fixture) => fixture.daysSinceCreation);

  return {
    total: fixtures.length,
    unassigned: unassignedDays.length,
    withoutSteps: fixtures.filter((fixture) => categorize(fixture) === 'withoutSteps').length,
    stale: fixtures.filter((fixture) => categorize(fixture) === 'stale').length,
    totalDaysUnassigned: unassignedDays.reduce((sum, days) => sum + days, 0),
    oldestUnassignedDays: Math.max(0, ...unassignedDays),
  };
}

const FIXTURES: readonly RequeteFixture[] = [
  { daysSinceCreation: 40, entites: [] },
  { daysSinceCreation: 2, entites: [] },
  // Old but assigned without steps: counted as "without steps", never as "stale".
  { daysSinceCreation: 50, entites: [0] },
  { daysSinceCreation: 31, entites: [1] },
  { daysSinceCreation: 5, entites: [3] },
  // Steps on a single entite are enough to treat the whole request as processed.
  { daysSinceCreation: 60, entites: [0, 2] },
];

const EXPECTED: RequeteAggregate = {
  total: 6,
  unassigned: 2,
  withoutSteps: 1,
  stale: 2,
  totalDaysUnassigned: 42,
  oldestUnassignedDays: 40,
};

async function importMetrics() {
  vi.resetModules();
  return import('./metrics.backend.js');
}

async function gaugeValue(gauge: { get: () => Promise<{ values: { value: number }[] }> }): Promise<number> {
  const { values } = await gauge.get();
  return values[0]?.value ?? Number.NaN;
}

describe('metrics.backend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('updateMetricsFromDatabase()', () => {
    it('freezes the six gauge values for a dataset covering the three exclusive categories', async () => {
      expect(aggregate(FIXTURES)).toEqual(EXPECTED);
      vi.mocked(prisma.$queryRaw).mockResolvedValue([EXPECTED]);

      const metrics = await importMetrics();
      await metrics.updateMetricsFromDatabase();

      expect(await gaugeValue(metrics.totalRequestsGauge)).toBe(6);
      expect(await gaugeValue(metrics.unassignedRequestsGauge)).toBe(2);
      expect(await gaugeValue(metrics.requestsWithoutStepsGauge)).toBe(1);
      expect(await gaugeValue(metrics.staleRequestsGauge)).toBe(2);
      expect(await gaugeValue(metrics.averageDaysSinceCreationGauge)).toBe(21);
      expect(await gaugeValue(metrics.oldestUnassignedRequestDaysGauge)).toBe(40);
    });

    it('issues a single parameterized aggregate query without materializing any Requete row', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([EXPECTED]);

      const metrics = await importMetrics();
      await metrics.updateMetricsFromDatabase();

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const [strings, ...values] = vi.mocked(prisma.$queryRaw).mock.calls[0] ?? [];
      expect(Array.isArray(strings)).toBe(true);
      expect(values.length).toBeGreaterThan(0);
      expect(prisma.requete.findMany).not.toHaveBeenCalled();
      expect(prisma.requete.findFirst).not.toHaveBeenCalled();
    });

    it('reports zero age when no request is unassigned', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([{ ...EMPTY_AGGREGATE, total: 3, withoutSteps: 3 }]);

      const metrics = await importMetrics();
      await metrics.updateMetricsFromDatabase();

      expect(await gaugeValue(metrics.averageDaysSinceCreationGauge)).toBe(0);
      expect(await gaugeValue(metrics.oldestUnassignedRequestDaysGauge)).toBe(0);
    });

    it('serves cached values for ten minutes', async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([EXPECTED]);
      vi.useFakeTimers();
      const start = Date.now();

      const metrics = await importMetrics();
      await metrics.updateMetricsFromDatabase();
      vi.setSystemTime(start + 9 * 60 * 1000);
      await metrics.updateMetricsFromDatabase();

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);

      vi.setSystemTime(start + 11 * 60 * 1000);
      await metrics.updateMetricsFromDatabase();

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    });
  });
});
