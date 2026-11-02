import { Counter, Gauge, Histogram } from '@prometheus-io/client';
import { sseEventManager } from '../../helpers/sse.js';
import { getLoggerStore } from '../../libs/asyncLocalStorage.js';
import { prisma } from '../../libs/prisma.js';
import { createMetricsRegistry } from './metrics.common.js';

export const register = createMetricsRegistry();

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
let lastUpdateTime = 0;

export const sseConnectionsGauge = new Gauge({
  name: 'sirena_sse_connections',
  help: 'Open SSE connections on this instance, per event type',
  labelNames: ['type'],
  registers: [register],
  collect() {
    for (const [type, count] of Object.entries(sseEventManager.getConnectionCounts())) {
      this.set({ type }, count);
    }
  },
});

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

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const STALE_THRESHOLD_DAYS = 30;

type RequeteMetricsRow = {
  total: number;
  unassigned: number;
  withoutSteps: number;
  stale: number;
  totalDaysUnassigned: number;
  oldestUnassignedDays: number;
};

// The three categories are mutually exclusive, and only unassigned requests feed the age gauges.
// MATERIALIZED keeps the planner from re-running both EXISTS per aggregate filter, which costs ~30x.
function aggregateRequeteMetrics(): Promise<RequeteMetricsRow[]> {
  return prisma.$queryRaw<RequeteMetricsRow[]>`
    WITH classified AS MATERIALIZED (
      SELECT
        floor(
          abs(extract(epoch FROM now()) - extract(epoch FROM r."createdAt")) * 1000 / ${MS_PER_DAY}
        ) AS days,
        EXISTS (SELECT 1 FROM "RequeteEntite" re WHERE re."requeteId" = r."id") AS has_entite,
        EXISTS (
          SELECT 1
          FROM "RequeteEntite" re
          JOIN "RequeteEtape" et ON et."requeteId" = re."requeteId" AND et."entiteId" = re."entiteId"
          WHERE re."requeteId" = r."id"
        ) AS has_etape
      FROM "Requete" r
    )
    SELECT
      count(*)::int AS "total",
      (count(*) FILTER (WHERE NOT has_entite))::int AS "unassigned",
      (count(*) FILTER (WHERE has_entite AND NOT has_etape))::int AS "withoutSteps",
      (count(*) FILTER (WHERE has_entite AND has_etape AND days >= ${STALE_THRESHOLD_DAYS}))::int AS "stale",
      coalesce(sum(days) FILTER (WHERE NOT has_entite), 0)::double precision AS "totalDaysUnassigned",
      coalesce(max(days) FILTER (WHERE NOT has_entite), 0)::int AS "oldestUnassignedDays"
    FROM classified
  `;
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
    const [metrics] = await aggregateRequeteMetrics();

    if (!metrics) {
      throw new Error('Requete metrics aggregate returned no row');
    }

    totalRequestsGauge.set(metrics.total);
    unassignedRequestsGauge.set(metrics.unassigned);
    requestsWithoutStepsGauge.set(metrics.withoutSteps);
    staleRequestsGauge.set(metrics.stale);

    if (metrics.unassigned > 0) {
      averageDaysSinceCreationGauge.set(metrics.totalDaysUnassigned / metrics.unassigned);
      oldestUnassignedRequestDaysGauge.set(metrics.oldestUnassignedDays);
    } else {
      averageDaysSinceCreationGauge.set(0);
      oldestUnassignedRequestDaysGauge.set(0);
    }

    logger.info(
      {
        total: metrics.total,
        unassigned: metrics.unassigned,
        withoutSteps: metrics.withoutSteps,
        stale: metrics.stale,
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

export const documentExportDownloadsCounter = new Counter({
  name: 'sirena_document_export_downloads_total',
  help: 'Openings of a document download link, by outcome (downloaded, denied, expired)',
  labelNames: ['outcome'],
  registers: [register],
});

export function recordDocumentExportDownload(outcome: 'downloaded' | 'denied' | 'expired'): void {
  documentExportDownloadsCounter.inc({ outcome });
}

export function recordRequestProcessing(status: string, operation: string, durationSeconds: number): void {
  requestsProcessedCounter.inc({ status });
  requestProcessingDuration.observe({ operation }, durationSeconds);
}
