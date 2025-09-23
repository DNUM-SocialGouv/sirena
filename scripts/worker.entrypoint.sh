#!/bin/sh
set -e

cd /app/apps/backend
exec node_modules/.bin/tsx src/start-worker.ts
