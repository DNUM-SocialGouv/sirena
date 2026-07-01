#!/bin/sh
set -e

cd /app/apps/backend
exec node dist/start-worker.js
