#!/bin/bash
set -e

echo "Running Semgrep security analysis..."

CONTAINER_RUNTIME=""
if command -v docker &> /dev/null; then
    CONTAINER_RUNTIME="docker"
elif command -v podman &> /dev/null; then
    CONTAINER_RUNTIME="podman"
fi

SEMGREP_ARGS=(
    --config=auto
    --verbose
)

if [ "${CI:-false}" = "true" ]; then
    SEMGREP_ARGS+=(--json --output=semgrep-results.json)
fi

if command -v semgrep &> /dev/null; then
    semgrep "${SEMGREP_ARGS[@]}" .
elif [ -n "${CONTAINER_RUNTIME}" ]; then
    echo "Using ${CONTAINER_RUNTIME} to run Semgrep..."
    ${CONTAINER_RUNTIME} run --rm \
        -v "$(pwd):/src" \
        -w /src \
        semgrep/semgrep:latest \
        semgrep "${SEMGREP_ARGS[@]}" .
else
    echo "Error: semgrep is not installed and neither docker nor podman is available"
    echo "Install semgrep with: pip install semgrep"
    echo "Or install docker/podman to run semgrep in a container"
    exit 1
fi

echo "Semgrep scan completed successfully"
