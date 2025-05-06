ARG NODE_VERSION=23-alpine as base
FROM node:$NODE_VERSION AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install --global corepack@latest && \
    corepack enable pnpm

FROM base AS studio

USER node
WORKDIR /app

COPY --chown=node:node package*.json pnpm* ./
COPY --chown=node:node ./packages/database packages/database/

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @sirena/database db:generate

COPY --chown=node:node ./scripts/prisma-studio.entrypoint.sh scripts/

ENTRYPOINT ["/app/scripts/prisma-studio.entrypoint.sh"]