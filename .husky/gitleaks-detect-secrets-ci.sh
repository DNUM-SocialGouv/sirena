#!/usr/bin/env bash
set -euo pipefail

# Resolve directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BASELINE_FILE="gitleaks-ignored-secrets.json"

# Ensure baseline exists
if [[ ! -f "${ROOT_DIR}/${BASELINE_FILE}" ]]; then
  echo "⚠️  Baseline file not found at ${ROOT_DIR}/${BASELINE_FILE}"
  exit 1
fi

echo "🔍 Scanning entire codebase with Gitleaks:"

if command -v gitleaks &> /dev/null; then
  gitleaks detect \
    --source "${ROOT_DIR}" \
    --baseline-path "${ROOT_DIR}/${BASELINE_FILE}" \
    --redact \
    --no-git
else
  docker run --rm \
    -v "${ROOT_DIR}:/src" \
    zricethezav/gitleaks:latest detect \
      --source "/src" \
      --baseline-path "/src/${BASELINE_FILE}" \
      --redact \
      --no-git
fi