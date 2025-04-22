#!/bin/sh
set -e

echo "Starting the studio..."
exec pnpm --filter @sirena/database db:studio