# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=24-alpine
# Pin both the nginx runtime image AND the source used to compile dynamic
# modules so they share the same ABI (--with-compat is enabled in the base).
ARG NGINX_VERSION=1.30.0
ARG HEADERS_MORE_VERSION=0.39
ARG ALPINE_VERSION=3.23

FROM node:$NODE_VERSION AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PNPM_STORE_DIR="/pnpm/store"

ARG SENTRY_ENABLED
ENV SENTRY_ENABLED=$SENTRY_ENABLED
ARG APP_VERSION
ENV APP_VERSION=$APP_VERSION
ENV VITE_APP_VERSION=$APP_VERSION

RUN corepack enable pnpm

FROM base AS deps

WORKDIR /app

COPY --chown=node:node package*.json pnpm* ./
COPY --chown=node:node ./packages/ui/package.json packages/ui/
COPY --chown=node:node ./apps/backend/package.json apps/backend/
COPY --chown=node:node ./packages/backend-utils/package.json packages/backend-utils/
COPY --chown=node:node ./apps/frontend/package.json apps/frontend/
COPY --chown=node:node ./packages/common/package.json packages/common/
COPY --chown=node:node ./packages/db/package.json packages/db/

RUN --mount=type=cache,id=pnpm-store-frontend,target=/pnpm/store,sharing=locked \
    pnpm install --frozen-lockfile --prefer-offline

FROM deps AS builder

ARG BUILD_PG_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"
ENV PG_URL=$BUILD_PG_URL

COPY --chown=node:node ./packages/ui packages/ui
COPY --chown=node:node ./apps/backend apps/backend
COPY --chown=node:node ./packages/backend-utils packages/backend-utils
COPY --chown=node:node ./packages/common packages/common
COPY --chown=node:node ./packages/db packages/db
COPY --chown=node:node ./apps/frontend apps/frontend

RUN pnpm db:generate

RUN pnpm --filter "@sirena/frontend^..." --workspace-concurrency=4 run build

RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN \
    export SENTRY_AUTH_TOKEN=$(cat /run/secrets/SENTRY_AUTH_TOKEN) \
    && pnpm --filter @sirena/frontend build

# Source maps are uploaded to Sentry by sentryVitePlugin during the build above.
# Drop them from the image so the original sources are not exposed publicly.
RUN find /app/apps/frontend/dist -name '*.map' -delete

# --- Compile headers-more as a dynamic module against the exact nginx version
# shipped by the runtime image. The .so is loaded via load_module in the final
# stage, which lets us use `more_clear_headers Server;` to fully remove the
# `Server` response header (stock nginx only exposes `server_tokens off`).
FROM alpine:${ALPINE_VERSION} AS nginx-modules-builder

ARG NGINX_VERSION
ARG HEADERS_MORE_VERSION

RUN apk add --no-cache \
        build-base \
        curl \
        linux-headers \
        openssl-dev \
        pcre2-dev \
        zlib-dev

WORKDIR /build
RUN curl -fSL "https://nginx.org/download/nginx-${NGINX_VERSION}.tar.gz" | tar -xz \
 && curl -fSL "https://github.com/openresty/headers-more-nginx-module/archive/v${HEADERS_MORE_VERSION}.tar.gz" | tar -xz \
 && cd "nginx-${NGINX_VERSION}" \
 && ./configure \
        --with-compat \
        --add-dynamic-module="/build/headers-more-nginx-module-${HEADERS_MORE_VERSION}" \
 && make -j"$(nproc)" modules \
 && mkdir -p /modules \
 && cp objs/ngx_http_headers_more_filter_module.so /modules/


FROM nginxinc/nginx-unprivileged:${NGINX_VERSION}-alpine AS frontend

COPY --from=nginx-modules-builder /modules/ngx_http_headers_more_filter_module.so \
     /usr/lib/nginx/modules/

# `load_module` must live in the main context of nginx.conf (outside http {}),
# so we prepend it to the file. The base image lets the nginx user write here.
RUN sed -i '1i load_module modules/ngx_http_headers_more_filter_module.so;' \
        /etc/nginx/nginx.conf \
 && nginx -t

RUN rm /etc/nginx/conf.d/default.conf

COPY ./nginx/frontend.conf /etc/nginx/conf.d/

COPY --from=builder --chown=nginx:nginx /app/apps/frontend/dist   /usr/share/nginx/html
COPY --chown=nginx:nginx ./apps/frontend/docker-entrypoint.sh /docker-entrypoint.sh

USER nginx

EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
