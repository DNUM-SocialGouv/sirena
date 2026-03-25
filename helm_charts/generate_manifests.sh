#!/usr/bin/env bash
set -euo pipefail

export ENVIRONNEMENT=${1}
export IMAGE_TAG=${2}

rm -rf ./generated_manifests || true

for subchart in backend frontend worker external-secrets; do
  cd charts/${subchart}
  helm dependency update
  cd -
done;


helm template . -f values/${ENVIRONNEMENT}.yaml \
   --set backend.SDPSN-devops-charts.deployment.image="ghcr.io/dnum-socialgouv/sirena:${IMAGE_TAG}-backend" \
   --set backend.SDPSN-devops-charts.deployment.initContainer.image="ghcr.io/dnum-socialgouv/sirena:${IMAGE_TAG}-backend"\
   --set frontend.SDPSN-devops-charts.deployment.image="ghcr.io/dnum-socialgouv/sirena:${IMAGE_TAG}-frontend-${ENVIRONNEMENT}"\
   --set worker.SDPSN-devops-charts.deployment.image="ghcr.io/dnum-socialgouv/sirena:${IMAGE_TAG}-worker"\
   --output-dir ./generated_manifests
