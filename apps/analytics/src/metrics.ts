import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

export const register = new Registry();
collectDefaultMetrics({ register });

// Sync runs
export const syncRunsTotal = new Counter({
  name: 'sirena_analytics_sync_runs_total',
  help: 'Total sync runs',
  labelNames: ['sync_type', 'status'] as const,
  registers: [register],
});

export const syncDuration = new Histogram({
  name: 'sirena_analytics_sync_duration_seconds',
  help: 'Sync duration in seconds',
  labelNames: ['sync_type'] as const,
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [register],
});

export const syncRecordsProcessed = new Counter({
  name: 'sirena_analytics_sync_records_processed_total',
  help: 'Total records processed per entity',
  labelNames: ['entity'] as const,
  registers: [register],
});

export const syncLastRunTimestamp = new Gauge({
  name: 'sirena_analytics_sync_last_run_timestamp_seconds',
  help: 'Last sync run Unix timestamp',
  labelNames: ['sync_type'] as const,
  registers: [register],
});

export const syncLastRunSuccess = new Gauge({
  name: 'sirena_analytics_sync_last_run_success',
  help: 'Whether last sync succeeded (1=yes, 0=no)',
  labelNames: ['sync_type'] as const,
  registers: [register],
});

export const syncErrorsTotal = new Counter({
  name: 'sirena_analytics_sync_errors_total',
  help: 'Total sync errors per entity',
  labelNames: ['entity'] as const,
  registers: [register],
});

// Reconciliation
export const driftPercent = new Gauge({
  name: 'sirena_analytics_drift_percent',
  help: 'Current drift percentage between source and analytics',
  labelNames: ['table'] as const,
  registers: [register],
});

export const orphansDeletedTotal = new Counter({
  name: 'sirena_analytics_orphans_deleted_total',
  help: 'Total orphan records deleted during reconciliation',
  labelNames: ['table'] as const,
  registers: [register],
});

export const missingResyncedTotal = new Counter({
  name: 'sirena_analytics_missing_resynced_total',
  help: 'Total missing records re-synced during reconciliation',
  labelNames: ['table'] as const,
  registers: [register],
});

export function recordSyncRun(syncType: string, status: string, durationMs: number): void {
  syncRunsTotal.inc({ sync_type: syncType, status });
  syncDuration.observe({ sync_type: syncType }, durationMs / 1000);
  syncLastRunTimestamp.set({ sync_type: syncType }, Date.now() / 1000);
  syncLastRunSuccess.set({ sync_type: syncType }, status === 'SUCCESS' ? 1 : 0);
}

export function recordRecordsProcessed(entity: string, count: number): void {
  if (count > 0) syncRecordsProcessed.inc({ entity }, count);
}

export function recordSyncError(entity: string): void {
  syncErrorsTotal.inc({ entity });
}

export function recordReconciliation(table: string, drift: number, orphans: number, missing: number): void {
  driftPercent.set({ table }, drift);
  if (orphans > 0) orphansDeletedTotal.inc({ table }, orphans);
  if (missing > 0) missingResyncedTotal.inc({ table }, missing);
}

export async function getPrometheusMetrics(): Promise<string> {
  return register.metrics();
}

export function getPrometheusContentType(): string {
  return register.contentType;
}
