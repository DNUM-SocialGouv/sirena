import { Counter, Gauge, Histogram } from 'prom-client';
import { createMetricsRegistry } from './metrics.common';

export const register = createMetricsRegistry();

export const cronJobRunsCounter = new Counter({
  name: 'sirena_cron_job_runs_total',
  help: 'Total number of cron job runs',
  labelNames: ['job_name', 'status'],
  registers: [register],
});

export const cronJobDuration = new Histogram({
  name: 'sirena_cron_job_duration_seconds',
  help: 'Duration of cron job execution in seconds',
  labelNames: ['job_name'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register],
});

export const cronJobLastRunTimestamp = new Gauge({
  name: 'sirena_cron_job_last_run_timestamp_seconds',
  help: 'Timestamp of the last cron job execution (Unix timestamp in seconds)',
  labelNames: ['job_name', 'status'],
  registers: [register],
});

export const cronJobLastRunSuccess = new Gauge({
  name: 'sirena_cron_job_last_run_success',
  help: 'Whether the last cron job run was successful (1 = success, 0 = error)',
  labelNames: ['job_name'],
  registers: [register],
});

export function recordCronJobRun(jobName: string, status: 'success' | 'error', durationSeconds: number): void {
  cronJobRunsCounter.inc({ job_name: jobName, status });
  cronJobDuration.observe({ job_name: jobName }, durationSeconds);

  const now = Date.now() / 1000; // Convert to seconds
  cronJobLastRunTimestamp.set({ job_name: jobName, status }, now);
  cronJobLastRunSuccess.set({ job_name: jobName }, status === 'success' ? 1 : 0);
}

export async function getPrometheusMetrics(): Promise<string> {
  return await register.metrics();
}

export function getPrometheusContentType(): string {
  return register.contentType;
}
