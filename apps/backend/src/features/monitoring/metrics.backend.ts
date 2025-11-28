import { Counter, Gauge, Histogram } from 'prom-client';
import { getLoggerStore } from '@/libs/asyncLocalStorage';
import { prisma } from '@/libs/prisma';
import { createMetricsRegistry } from './metrics.common';

export const register = createMetricsRegistry();

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let lastUpdateTime = 0;

export const unassignedRequestsGauge = new Gauge({
  name: 'sirena_unassigned_requests_total',
  help: 'Total number of unassigned requests',
  registers: [register],
});

export const requestsWithoutStepsGauge = new Gauge({
  name: 'sirena_requests_without_steps_total',
  help: 'Total number of requests without processing steps',
  registers: [register],
});

export const staleRequestsGauge = new Gauge({
  name: 'sirena_stale_requests_total',
  help: 'Total number of stale requests (>30 days)',
  registers: [register],
});

export const oldestUnassignedRequestDaysGauge = new Gauge({
  name: 'sirena_oldest_unassigned_request_days',
  help: 'Number of days since the oldest unassigned request was created',
  registers: [register],
});

export const averageDaysSinceCreationGauge = new Gauge({
  name: 'sirena_average_days_since_creation',
  help: 'Average number of days since unassigned requests were created',
  registers: [register],
});

export const totalRequestsGauge = new Gauge({
  name: 'sirena_total_requests',
  help: 'Total number of requests in the system',
  registers: [register],
});

export const requestsProcessedCounter = new Counter({
  name: 'sirena_requests_processed_total',
  help: 'Total number of requests processed',
  labelNames: ['status'],
  registers: [register],
});

export const requestProcessingDuration = new Histogram({
  name: 'sirena_request_processing_duration_seconds',
  help: 'Duration of request processing in seconds',
  labelNames: ['operation'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

function daysSince(date: Date): number {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export async function updateMetricsFromDatabase(): Promise<void> {
  const logger = getLoggerStore();
  const now = Date.now();

  if (now - lastUpdateTime < CACHE_TTL_MS) {
    logger.debug('Using cached metrics');
    return;
  }

  try {
    lastUpdateTime = now;
    const allRequetes = await prisma.requete.findMany({
      include: {
        requeteEntites: {
          include: {
            requeteEtape: true,
          },
        },
      },
    });

    let unassignedCount = 0;
    let withoutStepsCount = 0;
    let staleCount = 0;
    let totalDaysUnassigned = 0;
    let oldestUnassignedDays = 0;

    for (const requete of allRequetes) {
      const daysSinceCreated = daysSince(requete.createdAt);
      const hasEntities = requete.requeteEntites.length > 0;
      const hasSteps = requete.requeteEntites.some((re) => re.requeteEtape.length > 0);

      if (!hasEntities) {
        unassignedCount++;
        totalDaysUnassigned += daysSinceCreated;
        if (daysSinceCreated > oldestUnassignedDays) {
          oldestUnassignedDays = daysSinceCreated;
        }
      } else if (!hasSteps) {
        withoutStepsCount++;
      } else if (daysSinceCreated >= 30) {
        staleCount++;
      }
    }

    totalRequestsGauge.set(allRequetes.length);
    unassignedRequestsGauge.set(unassignedCount);
    requestsWithoutStepsGauge.set(withoutStepsCount);
    staleRequestsGauge.set(staleCount);

    if (unassignedCount > 0) {
      averageDaysSinceCreationGauge.set(totalDaysUnassigned / unassignedCount);
      oldestUnassignedRequestDaysGauge.set(oldestUnassignedDays);
    } else {
      averageDaysSinceCreationGauge.set(0);
      oldestUnassignedRequestDaysGauge.set(0);
    }

    logger.info(
      {
        total: allRequetes.length,
        unassigned: unassignedCount,
        withoutSteps: withoutStepsCount,
        stale: staleCount,
      },
      'Metrics updated from database',
    );
  } catch (error) {
    logger.error({ err: error }, 'Failed to update metrics from database');
    throw error;
  }
}

export async function getPrometheusMetrics(): Promise<string> {
  await updateMetricsFromDatabase();
  return await register.metrics();
}

export function getPrometheusContentType(): string {
  return register.contentType;
}

export function recordRequestProcessing(status: string, operation: string, durationSeconds: number): void {
  requestsProcessedCounter.inc({ status });
  requestProcessingDuration.observe({ operation }, durationSeconds);
}
