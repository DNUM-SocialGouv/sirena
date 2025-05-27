ARG NODE_VERSION=23-alpine
FROM node:$NODE_VERSION AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install --global corepack@latest && \
    corepack enable pnpm

FROM base AS builder

USER node
WORKDIR /app

COPY --chown=node:node package*.json pnpm* ./

COPY --chown=node:node ./packages/database/package.json packages/database/
COPY --chown=node:node ./apps/backend/package.json apps/backend/

# Install all dependencies for build
RUN pnpm install --frozen-lockfile

COPY --chown=node:node ./packages/database packages/database
COPY --chown=node:node ./apps/backend apps/backend

WORKDIR /app/apps/backend
RUN pnpm --filter @sirena/backend build:prod

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

FROM base AS server

USER node
WORKDIR /app

# Copy only the necessary files from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages/database ./packages/database
COPY --from=builder --chown=node:node /app/apps/backend/dist ./apps/backend/dist
COPY --chown=node:node ./scripts/backend.entrypoint.sh scripts/

ENTRYPOINT ["/app/scripts/backend.entrypoint.sh"]
CMD ["node", "apps/backend/dist/index.js"]
