import { Counter, Gauge, Histogram } from 'prom-client';
import { createMetricsRegistry } from './metrics.common';

export const register = createMetricsRegistry();

export const fileProcessingCounter = new Counter({
  name: 'sirena_file_processing_total',
  help: 'Total number of files processed',
  labelNames: ['scan_status', 'sanitize_status', 'file_type'],
  registers: [register],
});

export const fileProcessingDuration = new Histogram({
  name: 'sirena_file_processing_duration_seconds',
  help: 'Duration of file processing in seconds',
  labelNames: ['file_type'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});

export const fileScanCounter = new Counter({
  name: 'sirena_file_scan_total',
  help: 'Total number of file scans by status',
  labelNames: ['status'],
  registers: [register],
});

export const fileSanitizeCounter = new Counter({
  name: 'sirena_file_sanitize_total',
  help: 'Total number of file sanitizations by status',
  labelNames: ['status'],
  registers: [register],
});

export function recordFileProcessing(
  scanStatus: string,
  sanitizeStatus: string,
  fileType: 'pdf' | 'other',
  durationSeconds: number,
): void {
  fileProcessingCounter.inc({ scan_status: scanStatus, sanitize_status: sanitizeStatus, file_type: fileType });
  fileProcessingDuration.observe({ file_type: fileType }, durationSeconds);
  fileScanCounter.inc({ status: scanStatus });
  fileSanitizeCounter.inc({ status: sanitizeStatus });
}

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
