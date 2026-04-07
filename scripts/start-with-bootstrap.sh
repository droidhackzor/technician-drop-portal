#!/bin/sh
set -eu

echo "[startup] running Prisma migrations"
npx prisma migrate deploy

if [ "${SEED_ON_STARTUP:-true}" = "true" ]; then
  echo "[startup] seeding demo users"
  npm run prisma:seed
fi

echo "[startup] starting Next.js"
exec node server.js
