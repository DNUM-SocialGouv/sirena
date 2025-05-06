#!/bin/sh
set -e

echo "Init migrations"
pnpm --filter @sirena/database db:deploy
echo "generate types"
pnpm --filter @sirena/database db:generate

exec "$@"