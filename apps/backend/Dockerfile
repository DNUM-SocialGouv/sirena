ARG NODE_VERSION=23-alpine
FROM node:$NODE_VERSION AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install --global corepack@latest && \
    corepack enable pnpm

# Stage pour les dépendances
FROM base AS deps

USER node
WORKDIR /app

COPY --chown=node:node package*.json pnpm* ./
COPY --chown=node:node ./packages/database/package.json packages/database/
COPY --chown=node:node ./apps/backend/package.json apps/backend/

RUN pnpm install --frozen-lockfile

# Stage de build
FROM deps AS builder

COPY --chown=node:node ./packages/database packages/database
COPY --chown=node:node ./apps/backend apps/backend

RUN pnpm --filter @sirena/database db:generate
RUN pnpm --filter @sirena/backend build

# Stage final
FROM base AS server

USER node
WORKDIR /app

# Copier seulement les dépendances de production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=deps --chown=node:node /app/package*.json ./
COPY --from=deps --chown=node:node /app/pnpm* ./

# Copier les builds
COPY --from=builder --chown=node:node /app/packages/database packages/database
COPY --from=builder --chown=node:node /app/apps/backend apps/backend

COPY --chown=node:node ./scripts/backend.entrypoint.sh scripts/

ENTRYPOINT ["/app/scripts/backend.entrypoint.sh"]
