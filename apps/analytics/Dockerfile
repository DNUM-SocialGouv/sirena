ARG NODE_VERSION=24-alpine
FROM node:$NODE_VERSION AS base

ARG APP_VERSION

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV APP_VERSION=$APP_VERSION

RUN npm install --global corepack@latest && \
    corepack enable pnpm

# Stage pour les dépendances
FROM base AS deps

WORKDIR /app

COPY --chown=node:node package*.json pnpm* ./
COPY --chown=node:node ./apps/analytics/package.json apps/analytics/
COPY --chown=node:node ./packages/common/package.json packages/common/
COPY --chown=node:node ./packages/db/package.json packages/db/

RUN pnpm install --frozen-lockfile

# Stage de build
FROM deps AS builder

ARG BUILD_PG_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV PG_URL=$BUILD_PG_URL

COPY --chown=node:node ./apps/analytics apps/analytics
COPY --chown=node:node ./packages/common packages/common
COPY --chown=node:node ./packages/db packages/db

RUN pnpm db:generate
RUN pnpm --filter @sirena/analytics db:generate

RUN pnpm --filter @sirena/common build
RUN pnpm --filter @sirena/db build
RUN pnpm --filter @sirena/analytics build

# Stage final
FROM base AS server

USER node
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/package*.json ./
COPY --from=deps --chown=node:node /app/pnpm* ./

COPY --from=builder --chown=node:node /app/apps/analytics apps/analytics
COPY --from=builder --chown=node:node /app/packages/common packages/common
COPY --from=builder --chown=node:node /app/packages/db packages/db

COPY --chown=node:node ./scripts/analytics.entrypoint.sh scripts/

ENTRYPOINT ["/app/scripts/analytics.entrypoint.sh"]
