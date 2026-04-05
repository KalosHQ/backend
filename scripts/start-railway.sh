#!/usr/bin/env sh
set -eu

echo "Running Prisma migrations..."
pnpm prisma migrate deploy

echo "Starting API server..."
exec node dist/main
