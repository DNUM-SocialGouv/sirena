ARG NODE_VERSION=24-alpine
FROM node:$NODE_VERSION AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

ARG SENTRY_ENABLED
ENV SENTRY_ENABLED=$SENTRY_ENABLED
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
ENV VITE_APP_VERSION=$APP_VERSION

RUN npm install --global corepack@latest && \
    corepack enable pnpm

FROM base AS builder

ARG BUILD_PG_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV PG_URL=$BUILD_PG_URL

WORKDIR /app

COPY --chown=node:node package*.json pnpm* ./

COPY --chown=node:node ./packages/ui/package.json packages/ui/
COPY --chown=node:node ./apps/backend/package.json apps/backend/
COPY --chown=node:node ./packages/backend-utils/package.json packages/backend-utils/
COPY --chown=node:node ./apps/frontend/package.json apps/frontend/
COPY --chown=node:node ./packages/common/package.json packages/common/
COPY --chown=node:node ./packages/db/package.json packages/db/

RUN pnpm install --frozen-lockfile

COPY --chown=node:node ./packages/ui packages/ui
COPY --chown=node:node ./apps/backend apps/backend
COPY --chown=node:node ./packages/backend-utils packages/backend-utils
COPY --chown=node:node ./packages/common packages/common
COPY --chown=node:node ./packages/db packages/db
COPY --chown=node:node ./apps/frontend apps/frontend

RUN pnpm db:generate

RUN pnpm --filter @sirena/common build
RUN pnpm --filter @sirena/db build
RUN pnpm --filter @sirena/backend-utils build
RUN pnpm --filter @sirena/backend build
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) \
    && pnpm --filter @sirena/frontend build

FROM nginxinc/nginx-unprivileged:stable-alpine AS frontend

RUN rm /etc/nginx/conf.d/default.conf

COPY ./nginx/frontend.conf /etc/nginx/conf.d/

COPY --from=builder --chown=nginx:nginx /app/apps/frontend/dist   /usr/share/nginx/html
COPY --chown=nginx:nginx ./apps/frontend/docker-entrypoint.sh /docker-entrypoint.sh

USER nginx

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
