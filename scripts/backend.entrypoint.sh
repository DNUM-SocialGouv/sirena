#!/bin/sh
set -e

echo "Init migrations"
pnpm --filter @sirena/backend db:deploy

echo "Init seed"
pnpm --filter @sirena/backend db:seed

cd /app/apps/backend
exec node dist/src/index.js
