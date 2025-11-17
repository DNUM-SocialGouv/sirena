#!/usr/bin/env bash
set -euo pipefail

export ENVIRONNEMENT=${1}
export IMAGE_TAG=${2}

rm -rf ./generated_manifests || true

# BACKEND
helm template backend . -f values/backend.yaml -f values/env_specific/backend/${ENVIRONNEMENT}.yaml --set SDPSN-devops-charts.deployment.image="ghcr.io/dnum-socialgouv/sirena:${IMAGE_TAG}-backend" --set SDPSN-devops-charts.deployment.initContainer.image="ghcr.io/dnum-socialgouv/sirena:${IMAGE_TAG}-backend" --output-dir ./generated_manifests
mv ./generated_manifests/sirena/charts/SDPSN-devops-charts/templates ./generated_manifests/backend
rm -rf ./generated_manifests/sirena

# FRONTEND
helm template frontend . -f values/frontend.yaml -f values/env_specific/frontend/${ENVIRONNEMENT}.yaml --set SDPSN-devops-charts.deployment.image="ghcr.io/dnum-socialgouv/sirena:${IMAGE_TAG}-frontend" --output-dir ./generated_manifests
mv ./generated_manifests/sirena/charts/SDPSN-devops-charts/templates ./generated_manifests/frontend
rm -rf ./generated_manifests/sirena

# EXTERNAL-SECRETS
helm template external-secrets . -f values/external-secrets.yaml -f values/env_specific/external-secrets/${ENVIRONNEMENT}.yaml --output-dir ./generated_manifests
mv ./generated_manifests/sirena/charts/SDPSN-devops-charts/templates ./generated_manifests/external-secrets
mv ./generated_manifests/sirena/templates/* ./generated_manifests/external-secrets
rm -rf ./generated_manifests/sirena

# WORKER
helm template worker . -f values/worker.yaml --set SDPSN-devops-charts.deployment.image="ghcr.io/dnum-socialgouv/sirena:${IMAGE_TAG}-worker" --output-dir ./generated_manifests
mv ./generated_manifests/sirena/charts/SDPSN-devops-charts/templates ./generated_manifests/worker
rm -rf ./generated_manifests/sirena
