# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24-alpine
FROM node:$NODE_VERSION AS base

ARG APP_VERSION

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PNPM_STORE_DIR="/pnpm/store"
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV APP_VERSION=$APP_VERSION

RUN apk add --no-cache tzdata \
    && apk upgrade --no-cache \
    && corepack enable pnpm \
    && npm install -g npm@latest \
    && npm cache clean --force

# Stage pour les dépendances
FROM base AS deps

WORKDIR /app

COPY --chown=node:node package*.json pnpm* ./
COPY --chown=node:node ./apps/backend/package.json apps/backend/
COPY --chown=node:node ./packages/backend-utils/package.json packages/backend-utils/
COPY --chown=node:node ./packages/common/package.json packages/common/
COPY --chown=node:node ./packages/db/package.json packages/db/

RUN --mount=type=cache,id=pnpm-store-backend,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --prefer-offline

# Stage de build
FROM deps AS builder

ARG BUILD_PG_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV PG_URL=$BUILD_PG_URL

COPY --chown=node:node ./apps/backend apps/backend
COPY --chown=node:node ./packages/backend-utils packages/backend-utils
COPY --chown=node:node ./packages/common packages/common
COPY --chown=node:node ./packages/db packages/db

RUN pnpm db:generate

# Build dependencies of @sirena/backend in topological order, parallelizing
# siblings (common/db/backend-utils have no inter-deps among themselves).
RUN pnpm --filter "@sirena/backend^..." --workspace-concurrency=4 run build

RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) \
    export APP_VERSION=$APP_VERSION \
    && pnpm --filter @sirena/backend build:ci

# Stage final
FROM base AS server

USER node
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Europe/Paris

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package*.json /app/pnpm* ./

# Copier les builds
COPY --from=builder --chown=node:node /app/apps/backend apps/backend
COPY --from=builder --chown=node:node /app/packages/backend-utils packages/backend-utils
COPY --from=builder --chown=node:node /app/packages/common packages/common
COPY --from=builder --chown=node:node /app/packages/db packages/db

COPY --chown=node:node ./scripts/backend.entrypoint.sh scripts/

RUN cd apps/backend && node --input-type=module -e "await import('@sirena/db')"

ENTRYPOINT ["/app/scripts/backend.entrypoint.sh"]
