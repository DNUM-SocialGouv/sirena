#!/bin/bash
# 
# This script sets up a local Kubernetes environment for testing the Sirena application.
# You will certainly have to tune it.
# It assumes you have a running minikube, and some CLI like `gh`.
# 
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="sirena-test"
ENVIRONMENT="test"
DEFAULT_REGISTRY="ghcr.io/dnum-socialgouv/sirena"
REGISTRY="${REGISTRY:-${DEFAULT_REGISTRY}}"

echo -e "${GREEN}🚀 Starting local Kubernetes test environment setup${NC}"

# Ask for image tag
if [ -z "${IMAGE_TAG}" ]; then
    echo -e "${YELLOW}Available recent tags from ${DEFAULT_REGISTRY}:${NC}"
    # Try to list tags if gh CLI is available
    if command -v gh &> /dev/null && [ "${REGISTRY}" = "${DEFAULT_REGISTRY}" ]; then
        echo "Fetching available tags..."
        gh api /orgs/DNUM-SocialGouv/packages/container/sirena/versions --jq '.[0:10] | .[] | .metadata.container.tags[] | select(. != "latest")' 2>/dev/null || echo "Could not fetch tags"
    fi
    read -p "Enter the image tag to use (e.g., 'latest', 'v1.0.0', commit SHA): " IMAGE_TAG
    if [ -z "${IMAGE_TAG}" ]; then
        IMAGE_TAG="latest"
    fi
fi
echo -e "${GREEN}✅ Using remote images with tag: ${IMAGE_TAG}${NC}"

# Detect container runtime
if command -v docker &> /dev/null; then
    CONTAINER_RUNTIME="docker"
elif command -v podman &> /dev/null; then
    CONTAINER_RUNTIME="podman"
else
    echo -e "${RED}❌ Neither docker nor podman is installed. Please install one of them.${NC}"
    exit 1
fi
echo "✅ Using container runtime: ${CONTAINER_RUNTIME}"

# Check dependencies
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}❌ $1 is not installed. Please install it first.${NC}"
        exit 1
    fi
}

echo "🔍 Checking dependencies..."
check_command kubectl
check_command pnpm

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "${SCRIPT_DIR}/.." && pwd )"

# Check for cdk8s - use local version if global not available
if command -v cdk8s &> /dev/null; then
    CDK8S="cdk8s"
elif [ -f "${SCRIPT_DIR}/node_modules/.bin/cdk8s" ]; then
    CDK8S="${SCRIPT_DIR}/node_modules/.bin/cdk8s"
else
    echo -e "${YELLOW}⚠️  cdk8s not found globally, will install locally${NC}"
    CDK8S="npx cdk8s"
fi

# Check if we can connect to a Kubernetes cluster
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ Cannot connect to Kubernetes cluster. Please ensure you have a running cluster (minikube, kind, etc.)${NC}"
    exit 1
fi

echo "✅ Connected to Kubernetes cluster"

# Create namespace
echo "📁 Creating namespace ${NAMESPACE}..."
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

# Pull images from registry
echo -e "${YELLOW}📦 Pulling images from registry...${NC}"

# Add platform flag for x64 if requested
PLATFORM_FLAG=""
if [ "${FORCE_X64}" = "true" ] || [ "${CONTAINER_PLATFORM}" = "linux/amd64" ]; then
    PLATFORM_FLAG="--platform linux/amd64"
    echo "🔧 Forcing x64/amd64 platform for compatibility"
fi

echo "Pulling backend image: ${REGISTRY}:${IMAGE_TAG}-backend"
${CONTAINER_RUNTIME} pull ${PLATFORM_FLAG} "${REGISTRY}:${IMAGE_TAG}-backend" || {
    echo -e "${RED}❌ Failed to pull backend image. Make sure the tag exists and you have access.${NC}"
    exit 1
}
echo "Pulling frontend image: ${REGISTRY}:${IMAGE_TAG}-frontend"
${CONTAINER_RUNTIME} pull ${PLATFORM_FLAG} "${REGISTRY}:${IMAGE_TAG}-frontend" || {
    echo -e "${RED}❌ Failed to pull frontend image. Make sure the tag exists and you have access.${NC}"
    exit 1
}

# Load images into cluster if needed (for Kind)
if kubectl get nodes -o jsonpath='{.items[0].metadata.name}' | grep -q "kind"; then
    echo "📦 Detected Kind cluster - loading images..."
    kind load docker-image "${REGISTRY}:${IMAGE_TAG}-backend"
    kind load docker-image "${REGISTRY}:${IMAGE_TAG}-frontend"
    # Also load PostgreSQL image for Kind
    if [ "${CONTAINER_RUNTIME}" = "podman" ]; then
        kind load docker-image "docker.io/library/postgres:17-alpine"
    fi
fi

# Create secrets directly (no external-secrets)
echo "🔐 Creating test secrets..."

# Backend secrets
kubectl create secret generic backend -n "${NAMESPACE}" \
  --from-literal=PC_CLIENT_ID="test-client-id" \
  --from-literal=PC_CLIENT_SECRET="test-client-secret" \
  --from-literal=AUTH_TOKEN_SECRET_KEY="test-auth-token-secret" \
  --from-literal=REFRESH_TOKEN_SECRET_KEY="test-refresh-token-secret" \
  --from-literal=DEMAT_SOCIAL_API_TOKEN="test-demat-social-token" \
  --from-literal=SUPER_ADMIN_LIST_EMAIL="admin@test.local" \
  --from-literal=SENTRY_DSN_BACKEND="" \
  --dry-run=client -o yaml | kubectl apply -f -

# Database secrets
kubectl create secret generic db -n "${NAMESPACE}" \
  --from-literal=dbname="sirena_test" \
  --from-literal=username="sirena_user" \
  --from-literal=password="test_password" \
  --from-literal=host="postgres-service" \
  --from-literal=port="5432" \
  --from-literal=url="postgresql://sirena_user:test_password@postgres-service:5432/sirena_test" \
  --dry-run=client -o yaml | kubectl apply -f -

# Redis secrets (matching the external secret structure)
kubectl create secret generic redis -n "${NAMESPACE}" \
  --from-literal=host="redis-service" \
  --from-literal=port="6379" \
  --from-literal=password="redis_test_password" \
  --from-literal=url="redis://:redis_test_password@redis-service:6379" \
  --dry-run=client -o yaml | kubectl apply -f -

# GHCR registry secret (for image pulls if needed)
kubectl create secret docker-registry ghcr-registry -n "${NAMESPACE}" \
  --docker-server=ghcr.io \
  --docker-username=test-user \
  --docker-password=test-password \
  --dry-run=client -o yaml | kubectl apply -f -

# Pull PostgreSQL image if using podman
if [ "${CONTAINER_RUNTIME}" = "podman" ]; then
    echo "📦 Pre-pulling PostgreSQL image for podman..."
    ${CONTAINER_RUNTIME} pull ${PLATFORM_FLAG} docker.io/library/postgres:17-alpine || {
        echo -e "${YELLOW}⚠️  Warning: Could not pre-pull PostgreSQL image${NC}"
    }
fi

# Deploy PostgreSQL for testing
echo "🐘 Deploying PostgreSQL..."
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
  namespace: ${NAMESPACE}
spec:
  ports:
  - port: 5432
    targetPort: 5432
  selector:
    app: postgres
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: ${NAMESPACE}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: docker.io/library/postgres:17-alpine
        env:
        - name: POSTGRES_DB
          value: sirena_test
        - name: POSTGRES_USER
          value: sirena_user
        - name: POSTGRES_PASSWORD
          value: test_password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        emptyDir: {}
EOF

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/postgres -n "${NAMESPACE}"

# Create a modified version of external-secrets.ts that doesn't use ExternalSecret
echo "📝 Creating modified charts for local testing..."
cd "${SCRIPT_DIR}"

cat > charts/external-secrets-local.ts << 'EOF'
import { Chart } from 'cdk8s';
import type { Construct } from 'constructs';

export class ExternalSecrets extends Chart {
  constructor(scope: Construct, id: string, _environnement: string) {
    super(scope, id, {
      disableResourceNameHashes: true,
    });
    // No-op for local testing - secrets are created directly via kubectl
  }
}
EOF

# Temporarily backup and replace external-secrets.ts
if [ -f charts/external-secrets.ts ]; then
    mv charts/external-secrets.ts charts/external-secrets.ts.bak
fi
cp charts/external-secrets-local.ts charts/external-secrets.ts

# Install CDK8s charts dependencies
echo -e "${YELLOW}📦 Installing CDK8s dependencies...${NC}"
pnpm install

# Update the image references to use our local registry
export COMMON_CONFIG_imageRegistry="${REGISTRY}/sirena"

# Synthesize CDK8s charts
echo "🔨 Synthesizing CDK8s charts..."
export IMAGE_TAG="${IMAGE_TAG}"
export ENVIRONNEMENT="${ENVIRONMENT}"

# Use npm run synth which is configured in package.json
npm run synth || {
    echo -e "${RED}❌ Failed to synthesize CDK8s charts${NC}"
    # Restore original external-secrets.ts before exiting
    if [ -f charts/external-secrets.ts.bak ]; then
        mv charts/external-secrets.ts.bak charts/external-secrets.ts
    fi
    rm -f charts/external-secrets-local.ts
    exit 1
}

# Restore original external-secrets.ts
if [ -f charts/external-secrets.ts.bak ]; then
    mv charts/external-secrets.ts.bak charts/external-secrets.ts
fi
rm -f charts/external-secrets-local.ts

# Check if dist directory has files
if [ ! -d "dist" ] || [ -z "$(ls -A dist 2>/dev/null)" ]; then
    echo -e "${RED}❌ No Kubernetes manifests were generated in dist/ directory${NC}"
    exit 1
fi

# List generated files for debugging
echo "📋 Generated manifests:"
ls -la dist/

# Apply the generated manifests
echo "🚀 Applying Kubernetes manifests..."
kubectl apply -f dist/ -n "${NAMESPACE}" --recursive

# Wait for Redis deployment from CDK8s
echo "⏳ Waiting for Redis to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/redis -n "${NAMESPACE}" || echo "Redis deployment might take a moment..."

# Update image references
echo "🔄 Updating deployments to use correct images..."
kubectl set image deployment/backend backend="${REGISTRY}:${IMAGE_TAG}-backend" -n "${NAMESPACE}"
kubectl set image deployment/frontend frontend="${REGISTRY}:${IMAGE_TAG}-frontend" -n "${NAMESPACE}"
kubectl set image deployment/worker worker="${REGISTRY}:${IMAGE_TAG}-worker" -n "${NAMESPACE}"

# If using NodePort for ingress (common in local setups)
echo "🌐 Checking ingress configuration..."
INGRESS_CLASS=$(kubectl get ingressclass -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "nginx")
echo "Using ingress class: ${INGRESS_CLASS}"

# Port forward services for local access
echo -e "${GREEN}🌐 Setting up port forwarding...${NC}"
echo "Services will be available at:"
echo ""
echo "Backend API: http://localhost:4000/api"
echo "Frontend: http://localhost:5173"
echo "PostgreSQL: localhost:5432"
echo ""
echo "To start port forwarding, run these commands in separate terminals:"
echo ""
echo "# Backend API:"
echo "kubectl port-forward -n ${NAMESPACE} service/backend 4000:80"
echo ""
echo "# Frontend:"
echo "kubectl port-forward -n ${NAMESPACE} service/frontend 5173:80"
echo ""
echo "# PostgreSQL:"
echo "kubectl port-forward -n ${NAMESPACE} service/postgres-service 5432:5432"
echo ""
echo "# Redis (if needed):"
echo "kubectl port-forward -n ${NAMESPACE} service/redis-service 6379:6379"
echo ""

# Show status
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "🔍 Check deployment status:"
echo "kubectl get all -n ${NAMESPACE}"
echo ""
echo "📊 View logs:"
echo "kubectl logs -f deployment/backend -n ${NAMESPACE}"
echo "kubectl logs -f deployment/frontend -n ${NAMESPACE}"
echo ""
echo "🧹 To clean up:"
echo "kubectl delete namespace ${NAMESPACE}"
echo ""
echo "💡 Note: Access services via port-forward instead of ingress for local testing"

cd "${PROJECT_ROOT}"
