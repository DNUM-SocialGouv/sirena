ARG NODE_VERSION=24-alpine
FROM node:$NODE_VERSION AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

ARG APP_VERSION
ENV VITE_APP_VERSION=$APP_VERSION
ARG SENTRY_ENABLED
ENV VITE_SENTRY_ENABLED=$SENTRY_ENABLED
ARG SENTRY_ENVIRONMENT
ENV VITE_SENTRY_ENVIRONMENT=$SENTRY_ENVIRONMENT
ARG SENTRY_DSN_FRONTEND
ENV VITE_SENTRY_DSN_FRONTEND=$SENTRY_DSN_FRONTEND
ARG VITE_IS_LOGGED_TOKEN_NAME
ENV VITE_IS_LOGGED_TOKEN_NAME=$VITE_IS_LOGGED_TOKEN_NAME

RUN npm install --global corepack@latest && \
    corepack enable pnpm

FROM base AS builder

WORKDIR /app

COPY --chown=node:node package*.json pnpm* ./

COPY --chown=node:node ./packages/ui/package.json packages/ui/
COPY --chown=node:node ./apps/backend/package.json apps/backend/
COPY --chown=node:node ./packages/backend-utils/package.json packages/backend-utils/
COPY --chown=node:node ./apps/frontend/package.json apps/frontend/
COPY --chown=node:node ./packages/common/package.json packages/common/

RUN pnpm install --frozen-lockfile 

COPY --chown=node:node ./packages/ui packages/ui
COPY --chown=node:node ./apps/backend apps/backend
COPY --chown=node:node ./packages/backend-utils packages/backend-utils
COPY --chown=node:node ./packages/common packages/common
COPY --chown=node:node ./apps/frontend apps/frontend

RUN pnpm --filter @sirena/common build
RUN pnpm --filter @sirena/backend-utils build
RUN pnpm --filter @sirena/backend db:generate
RUN pnpm --filter @sirena/backend build
RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) \
    && pnpm --filter pnpm --filter @sirena/frontend build

FROM nginxinc/nginx-unprivileged:stable-alpine AS frontend

RUN rm /etc/nginx/conf.d/default.conf

COPY ./nginx/frontend.conf /etc/nginx/conf.d/

USER nginx

# copy React build output
COPY --from=builder --chown=nginx:nginx /app/apps/frontend/dist   /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]