ARG NODE_VERSION=23-alpine
FROM node:$NODE_VERSION AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN npm install --global corepack@latest && \
    corepack enable pnpm

FROM base AS server

USER node
WORKDIR /app

COPY --chown=node:node package*.json pnpm* ./

COPY --chown=node:node ./packages/database/package.json packages/database/
COPY --chown=node:node ./apps/backend/package.json apps/backend/

RUN pnpm install --frozen-lockfile 

COPY --chown=node:node ./packages/database packages/database
COPY --chown=node:node ./apps/backend apps/backend

COPY --chown=node:node ./scripts/backend.entrypoint.sh scripts/

ENTRYPOINT ["/app/scripts/backend.entrypoint.sh"]
CMD ["pnpm", "--filter", "@sirena/backend", "dev"]
