#!/bin/sh
set -e

echo "Running migrations..."
pnpm --filter @sirena/database db:migrate

echo "Starting the studio..."
exec pnpm --filter @sirena/database db:studio