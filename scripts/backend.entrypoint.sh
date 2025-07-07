#!/bin/sh
set -e

echo "Init migrations"
pnpm --filter @sirena/backend db:deploy

echo "Init seed"
pnpm --filter @sirena/backend db:seed

cd /app/apps/backend
exec node_modules/.bin/tsx src/index.ts
