#!/usr/bin/env bash
set -euo pipefail

echo "[startup] running Prisma migrations"
./node_modules/prisma/build/index.js migrate deploy

echo "[startup] seeding demo users if needed"
if [ -f "./prisma/seed.js" ]; then
  node ./prisma/seed.js || true
elif [ -f "./prisma/seed.ts" ]; then
  npx tsx ./prisma/seed.ts || true
fi

echo "[startup] starting app"
node server.js
