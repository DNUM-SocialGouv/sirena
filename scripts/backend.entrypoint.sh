#!/bin/sh
set -e

cd /app/apps/backend
exec node dist/index.js
