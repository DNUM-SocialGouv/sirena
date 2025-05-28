#!/bin/sh
set -e

echo "Starting the studio..."
exec pnpm --filter @sirena/backend db:studio