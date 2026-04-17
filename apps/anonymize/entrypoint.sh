#!/usr/bin/env bash
set -euo pipefail

CONFIG_TEMPLATE="/app/greenmask.yml"
CONFIG_PATH="/tmp/greenmask-resolved.yml"
START_TIME=$(date +%s)

log() {
  echo "[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] $1"
}

push_metrics() {
  local status="$1"
  local duration="$2"

  if [ -z "${PUSHGATEWAY_URL:-}" ]; then
    return 0
  fi

  log "Pushing metrics to Pushgateway: ${PUSHGATEWAY_URL}"

  cat <<METRICS | curl -sf --max-time 10 --data-binary @- "${PUSHGATEWAY_URL}/metrics/job/sirena_anonymize" || log "WARNING: failed to push metrics"
# HELP sirena_anonymize_last_run_success Whether the last anonymization run succeeded (1=success, 0=failure).
# TYPE sirena_anonymize_last_run_success gauge
sirena_anonymize_last_run_success $([ "$status" = "success" ] && echo 1 || echo 0)
# HELP sirena_anonymize_last_run_timestamp_seconds Unix timestamp of the last anonymization run.
# TYPE sirena_anonymize_last_run_timestamp_seconds gauge
sirena_anonymize_last_run_timestamp_seconds $(date +%s)
# HELP sirena_anonymize_duration_seconds Duration of the last anonymization run in seconds.
# TYPE sirena_anonymize_duration_seconds gauge
sirena_anonymize_duration_seconds ${duration}
METRICS
}

cleanup() {
  local exit_code=$?
  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - START_TIME))

  if [ $exit_code -eq 0 ]; then
    push_metrics "success" "$duration"
    log "Anonymization completed successfully in ${duration}s"
  else
    push_metrics "failure" "$duration"
    log "ERROR: Anonymization failed after ${duration}s (exit code: ${exit_code})"
  fi

  rm -rf /tmp/greenmask-dumps/*
}

trap cleanup EXIT

# ── Validate inputs ─────────────────────────────────────────────────
if [ -z "${PG_URL_FROM:-}" ]; then
  log "ERROR: PG_URL_FROM is required"
  exit 1
fi

if [ -z "${PG_URL_TO:-}" ]; then
  log "ERROR: PG_URL_TO is required"
  exit 1
fi

log "=== Sirena database anonymization ==="
log "Source: ${PG_URL_FROM%%@*}@***"
log "Target: ${PG_URL_TO%%@*}@***"

# ── Resolve env vars in config ──────────────────────────────────────
envsubst < "${CONFIG_TEMPLATE}" > "${CONFIG_PATH}"

# ── Step 1: Dump with anonymization ─────────────────────────────────
log "Step 1/2: Dumping with anonymization..."
greenmask --config="${CONFIG_PATH}" dump

# ── Step 2: Restore to target ───────────────────────────────────────
log "Step 2/2: Restoring anonymized data..."
greenmask --config="${CONFIG_PATH}" restore latest

log "=== Done ==="
