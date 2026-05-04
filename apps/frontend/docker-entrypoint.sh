#!/bin/sh
set -e

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  IS_LOGGED_TOKEN_NAME: "${IS_LOGGED_TOKEN_NAME:-}",
  SENTRY_ENABLED: "${SENTRY_ENABLED:-}",
  SENTRY_DSN_FRONTEND: "${SENTRY_DSN_FRONTEND:-}",
  APP_ENV: "${APP_ENV:-}",
  MATOMO_URL: "${MATOMO_URL:-}",
  MATOMO_SITE_ID: "${MATOMO_SITE_ID:-}",
};
EOF

exec nginx -g 'daemon off;'
