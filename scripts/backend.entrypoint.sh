#!/bin/sh
set -e

echo "Init migrations"
pnpm --filter @sirena/backend db:deploy

cd /app/apps/backend
exec node_modules/.bin/tsx src/index.ts
