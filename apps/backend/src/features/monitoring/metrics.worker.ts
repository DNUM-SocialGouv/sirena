import { Counter, Gauge, Histogram } from 'prom-client';
import { createMetricsRegistry } from './metrics.common.js';

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

export const clamavScanDuration = new Histogram({
  name: 'sirena_clamav_scan_duration_seconds',
  help: 'Duration of ClamAV scan only (excluding sanitization)',
  labelNames: ['file_type', 'scan_status'],
  buckets: [0.5, 1, 2, 5, 10, 30, 60, 120],
  registers: [register],
});

export const clamavUpGauge = new Gauge({
  name: 'sirena_clamav_up',
  help: 'Whether ClamAV is reachable (1 = up, 0 = down)',
  registers: [register],
});

export const clamavLatencyGauge = new Gauge({
  name: 'sirena_clamav_latency_seconds',
  help: 'Latency of the last ClamAV health check in seconds',
  registers: [register],
});

export const fileScanSizeHistogram = new Histogram({
  name: 'sirena_file_scan_bytes',
  help: 'Size of scanned files in bytes',
  labelNames: ['scan_status'],
  buckets: [1024, 10240, 102400, 1048576, 10485760, 52428800, 104857600, 209715200],
  registers: [register],
});

export const fileQueuePendingGauge = new Gauge({
  name: 'sirena_file_queue_pending_total',
  help: 'Number of files pending processing',
  registers: [register],
});

export const fileQueueStuckGauge = new Gauge({
  name: 'sirena_file_queue_stuck_total',
  help: 'Number of files stuck in processing (exceeded timeout)',
  registers: [register],
});

export const clamavErrorsCounter = new Counter({
  name: 'sirena_clamav_errors_total',
  help: 'Total ClamAV errors by reason',
  labelNames: ['reason'],
  registers: [register],
});

export function recordClamavScanDuration(fileType: 'pdf' | 'other', scanStatus: string, durationSeconds: number): void {
  clamavScanDuration.observe({ file_type: fileType, scan_status: scanStatus }, durationSeconds);
}

export function recordClamavHealth(up: boolean, latencyMs: number): void {
  clamavUpGauge.set(up ? 1 : 0);
  clamavLatencyGauge.set(latencyMs / 1000);
}

export function recordFileScanSize(scanStatus: string, sizeBytes: number): void {
  fileScanSizeHistogram.observe({ scan_status: scanStatus }, sizeBytes);
}

export function recordFileQueueDepth(pending: number, stuck: number): void {
  fileQueuePendingGauge.set(pending);
  fileQueueStuckGauge.set(stuck);
}

export function recordClamavError(reason: 'timeout' | 'connection_refused' | 'unknown'): void {
  clamavErrorsCounter.inc({ reason });
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

export const fileIntegrityOrphanDbGauge = new Gauge({
  name: 'sirena_file_integrity_orphan_db_total',
  help: 'Number of DB files not linked to any entity',
  registers: [register],
});

export const fileIntegrityOrphanDbSizeGauge = new Gauge({
  name: 'sirena_file_integrity_orphan_db_bytes',
  help: 'Total size of orphan DB files in bytes',
  registers: [register],
});

export const fileIntegrityDanglingDbGauge = new Gauge({
  name: 'sirena_file_integrity_dangling_db_total',
  help: 'Number of DB files missing from S3',
  registers: [register],
});

export const fileIntegrityDanglingDbSizeGauge = new Gauge({
  name: 'sirena_file_integrity_dangling_db_bytes',
  help: 'Total size of dangling DB files in bytes',
  registers: [register],
});

export const fileIntegrityOrphanS3Gauge = new Gauge({
  name: 'sirena_file_integrity_orphan_s3_total',
  help: 'Number of S3 files without DB entry',
  registers: [register],
});

export const fileIntegrityOrphanS3SizeGauge = new Gauge({
  name: 'sirena_file_integrity_orphan_s3_bytes',
  help: 'Total size of orphan S3 files in bytes',
  registers: [register],
});

export function recordFileIntegrity(result: {
  orphanDbFiles: number;
  orphanDbFilesSize: number;
  dbFilesWithoutS3: number;
  dbFilesWithoutS3Size: number;
  s3FilesWithoutDb: number;
  s3FilesWithoutDbSize: number;
}): void {
  fileIntegrityOrphanDbGauge.set(result.orphanDbFiles);
  fileIntegrityOrphanDbSizeGauge.set(result.orphanDbFilesSize);
  fileIntegrityDanglingDbGauge.set(result.dbFilesWithoutS3);
  fileIntegrityDanglingDbSizeGauge.set(result.dbFilesWithoutS3Size);
  fileIntegrityOrphanS3Gauge.set(result.s3FilesWithoutDb);
  fileIntegrityOrphanS3SizeGauge.set(result.s3FilesWithoutDbSize);
}

export async function getPrometheusMetrics(): Promise<string> {
  return await register.metrics();
}

export function getPrometheusContentType(): string {
  return register.contentType;
}
