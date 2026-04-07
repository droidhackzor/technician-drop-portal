#!/usr/bin/env bash
set -euo pipefail

echo "[startup] syncing Prisma schema to database"
./node_modules/prisma/build/index.js db push --accept-data-loss

if [ "${SEED_ON_STARTUP:-true}" = "true" ]; then
  echo "[startup] seeding demo users if needed"
  if [ -f "./prisma/seed.js" ]; then
    node ./prisma/seed.js || true
  fi
fi

echo "[startup] starting app"
node server.js
