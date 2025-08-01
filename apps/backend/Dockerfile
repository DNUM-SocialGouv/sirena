ARG NODE_VERSION=23-alpine
FROM node:$NODE_VERSION AS base

ARG APP_VERSION

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV APP_VERSION=$APP_VERSION

RUN npm install --global corepack@latest && \
    corepack enable pnpm

# Stage pour les dépendances
FROM base AS deps

WORKDIR /app

COPY --chown=node:node package*.json pnpm* ./
COPY --chown=node:node ./apps/backend/package.json apps/backend/
COPY --chown=node:node ./packages/backend-utils/package.json packages/backend-utils/
COPY --chown=node:node ./packages/common/package.json packages/common/

RUN pnpm install --frozen-lockfile

# Stage de build
FROM deps AS builder

COPY --chown=node:node ./apps/backend apps/backend
COPY --chown=node:node ./packages/backend-utils packages/backend-utils
COPY --chown=node:node ./packages/common packages/common

RUN pnpm --filter @sirena/backend-utils build
RUN pnpm --filter @sirena/common build
RUN pnpm --filter @sirena/backend db:generate
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) \
    export APP_VERSION=$APP_VERSION \
    && pnpm --filter @sirena/backend build:ci

# Stage final
FROM base AS server

USER node
WORKDIR /app

# Copier seulement les dépendances de production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/package*.json ./
COPY --from=deps --chown=node:node /app/pnpm* ./

# Copier les builds
COPY --from=builder --chown=node:node /app/apps/backend apps/backend
COPY --from=builder --chown=node:node /app/packages/backend-utils packages/backend-utils
COPY --from=builder --chown=node:node /app/packages/common packages/common

COPY --chown=node:node ./scripts/backend.entrypoint.sh scripts/

ENTRYPOINT ["/app/scripts/backend.entrypoint.sh"]
