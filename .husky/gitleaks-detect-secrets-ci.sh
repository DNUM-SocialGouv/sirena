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

# Get all tracked files (ignores .gitignored and untracked files)
ALL_FILES=$(git ls-files \
  | grep -v "^${BASELINE_FILE}$" || true)

if [[ -z "$ALL_FILES" ]]; then
  echo "✅  No files to scan."
  exit 0
fi

echo "🔍 Scanning all tracked files with Gitleaks:"

scan_file() {
  local file="$1"
  echo "—> Scanning ${file}"

  if command -v gitleaks &> /dev/null; then
    gitleaks detect \
      --no-git \
      --source "${ROOT_DIR}/${file}" \
      --baseline-path "${ROOT_DIR}/${BASELINE_FILE}" \
      --redact
  else
    docker run --rm \
      -v "${ROOT_DIR}:/src" \
      zricethezav/gitleaks:latest detect \
        --no-git \
        --source "/src/${file}" \
        --baseline-path "/src/${BASELINE_FILE}" \
        --redact
  fi
}

while IFS= read -r file; do
  scan_file "$file"
done <<< "$ALL_FILES"