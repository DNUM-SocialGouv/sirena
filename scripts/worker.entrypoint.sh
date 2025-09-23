#!/bin/sh
set -e

cd /app/apps/backend
exec node dist/src/start-worker.js
