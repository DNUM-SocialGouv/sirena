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

mask_url() {
  echo "$1" | sed -E 's#^([a-z]+://)[^@/]+@#\1***@#'
}

log "=== Sirena database anonymization ==="
log "Source: $(mask_url "${PG_URL_FROM}")"
log "Target: $(mask_url "${PG_URL_TO}")"

# ── Resolve env vars in config ──────────────────────────────────────
envsubst < "${CONFIG_TEMPLATE}" > "${CONFIG_PATH}"

# ── Step 1: Validate config against source schema ───────────────────
# Fail-fast si une transformation reference une colonne disparue, si
# le schema source a derive, ou si Greenmask emet un warning de
# severite >= error (ex: data leakage detecte).
log "Step 1/3: Validating config against source schema..."
validate_exit=0
validate_output=$(greenmask --config="${CONFIG_PATH}" validate --warnings --format=json 2>&1) || validate_exit=$?

if [ "${validate_exit}" -ne 0 ]; then
  log "ERROR: Greenmask validate exited with code ${validate_exit}"
  echo "${validate_output}"
  exit 1
fi

# Compte les warnings de severite >= error en parcourant n'importe
# quelle structure JSON (array, NDJSON via -s, ou objet imbrique).
blocking=$(echo "${validate_output}" \
  | jq -s '[.. | objects | select(.severity? == "error" or .severity? == "critical")] | length' \
    2>/dev/null || echo "0")

if [ "${blocking}" != "0" ]; then
  log "ERROR: Greenmask validation found ${blocking} blocking warning(s)"
  echo "${validate_output}" | jq -s '.' 2>/dev/null || echo "${validate_output}"
  exit 1
fi

log "Validation OK"

# ── Step 2: Dump with anonymization ─────────────────────────────────
log "Step 2/3: Dumping with anonymization..."
greenmask --config="${CONFIG_PATH}" dump

# ── Step 3: Reset target schema then restore ─────────────────────────
log "Step 3/3: Resetting target public schema..."
psql "${PG_URL_TO}" -v ON_ERROR_STOP=1 -q -c 'DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;'

log "Restoring anonymized data..."
greenmask --config="${CONFIG_PATH}" restore latest

log "=== Done ==="
