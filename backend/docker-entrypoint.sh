#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if nc -z postgres 5432 2>/dev/null; then
    echo "PostgreSQL is reachable!"
    break
  fi
  echo "Waiting for PostgreSQL (attempt $i/30)..."
  sleep 2
done

echo "Pushing database schema..."
npx prisma db push --accept-data-loss || true

echo "Starting StreamFlix Backend in production mode on port 4000..."
exec node dist/main
