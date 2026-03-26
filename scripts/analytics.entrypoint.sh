#!/bin/sh
set -e

cd /app/apps/analytics
exec node dist/index.js
