#!/usr/bin/env bash
set -euo pipefail

echo "[startup] running Prisma migrations"
./node_modules/prisma/build/index.js migrate deploy

if [ "${SEED_ON_STARTUP:-true}" = "true" ]; then
  echo "[startup] seeding demo users if needed"
  node ./prisma/seed.js || true
fi

echo "[startup] starting app"
node server.js
