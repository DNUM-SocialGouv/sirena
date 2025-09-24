#!/bin/sh
set -e

echo "Init db reset"
pnpm --filter @sirena/backend db:reset

echo "Init migrations"
pnpm --filter @sirena/backend db:deploy

echo "Init seed"
pnpm --filter @sirena/backend db:seed

cd /app/apps/backend
exec node_modules/.bin/tsx src/index.ts
