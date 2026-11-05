import { afterAll, beforeAll, expect, it } from 'vitest';
import { prisma } from '../../libs/prisma.js';
import { aggregateRequeteMetrics, type RequeteMetricsRow } from './metrics.backend.js';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const STALE_THRESHOLD_DAYS = 30;

/** One entry per linked entite, holding its number of processing steps. */
type RequeteFixture = { daysSinceCreation: number; entites: readonly number[] };

// One request sits on the stale threshold itself, so that turning `days >= 30` into `days > 30`
// fails here. Every age keeps hours of margin inside its day, out of reach of any clock
// difference between the database and this process, which would otherwise make this flaky.
const FIXTURES: readonly RequeteFixture[] = [
  { daysSinceCreation: 40.25, entites: [] },
  { daysSinceCreation: 2.25, entites: [] },
  { daysSinceCreation: 50.25, entites: [0] },
  { daysSinceCreation: 30.25, entites: [1] },
  { daysSinceCreation: 31.25, entites: [1] },
  { daysSinceCreation: 5.25, entites: [3] },
  { daysSinceCreation: 60.25, entites: [0, 2] },
];

const runId = `metrics-smoke-${Date.now()}`;
const requeteIds: string[] = [];
const entiteIds: string[] = [];

beforeAll(async () => {
  for (const [index, fixture] of FIXTURES.entries()) {
    const requeteId = `${runId}-${index}`;
    await prisma.requete.create({
      data: { id: requeteId, createdAt: new Date(Date.now() - fixture.daysSinceCreation * MS_PER_DAY) },
    });
    requeteIds.push(requeteId);

    for (const [entiteIndex, stepCount] of fixture.entites.entries()) {
      const entite = await prisma.entite.create({
        data: {
          nomComplet: `${runId}-${index}-${entiteIndex}`,
          label: `${runId}-${index}-${entiteIndex}`,
          entiteTypeId: 'ARS',
        },
      });
      entiteIds.push(entite.id);

      await prisma.requeteEntite.create({ data: { requeteId, entiteId: entite.id, statutId: 'EN_COURS' } });
      for (let step = 0; step < stepCount; step += 1) {
        await prisma.requeteEtape.create({ data: { requeteId, entiteId: entite.id, nom: `step-${step}` } });
      }
    }
  }
});

afterAll(async () => {
  await prisma.requeteEtape.deleteMany({ where: { requeteId: { in: requeteIds } } });
  await prisma.requeteEntite.deleteMany({ where: { requeteId: { in: requeteIds } } });
  await prisma.requete.deleteMany({ where: { id: { in: requeteIds } } });
  await prisma.entite.deleteMany({ where: { id: { in: entiteIds } } });
  await prisma.$disconnect();
});

type ReferenceRow = { createdAt: Date; requeteEntites: { requeteEtape: { id: string }[] }[] };

/**
 * The classification the SQL replaced: an unassigned request is never counted as being without
 * steps, and a request without steps is never counted as stale however old it is.
 */
function aggregateInMemory(rows: readonly ReferenceRow[], now: number): RequeteMetricsRow {
  let unassigned = 0;
  let withoutSteps = 0;
  let stale = 0;
  let totalDaysUnassigned = 0;
  let oldestUnassignedDays = 0;

  for (const row of rows) {
    const days = Math.floor(Math.abs(now - row.createdAt.getTime()) / MS_PER_DAY);
    const hasEntites = row.requeteEntites.length > 0;
    const hasSteps = row.requeteEntites.some((entite) => entite.requeteEtape.length > 0);

    if (!hasEntites) {
      unassigned += 1;
      totalDaysUnassigned += days;
      oldestUnassignedDays = Math.max(oldestUnassignedDays, days);
    } else if (!hasSteps) {
      withoutSteps += 1;
    } else if (days >= STALE_THRESHOLD_DAYS) {
      stale += 1;
    }
  }

  return { total: rows.length, unassigned, withoutSteps, stale, totalDaysUnassigned, oldestUnassignedDays };
}

it('aggregates the six gauges exactly like the in-memory classification it replaced', async () => {
  // Repeatable read: both sides must see the same snapshot, since the aggregate spans the whole
  // table and other smoke tests write to it.
  const [fromSql, reference] = await prisma.$transaction(
    async (tx) => {
      const [aggregated] = await aggregateRequeteMetrics(tx);
      const rows = await tx.requete.findMany({
        select: { createdAt: true, requeteEntites: { select: { requeteEtape: { select: { id: true } } } } },
      });

      return [aggregated, aggregateInMemory(rows, Date.now())] as const;
    },
    { isolationLevel: 'RepeatableRead' },
  );

  expect(fromSql).toEqual(reference);
  // The fixtures must actually exercise the three categories, whatever else the table holds.
  expect(reference.unassigned).toBeGreaterThanOrEqual(2);
  expect(reference.withoutSteps).toBeGreaterThanOrEqual(1);
  expect(reference.stale).toBeGreaterThanOrEqual(3);
});
