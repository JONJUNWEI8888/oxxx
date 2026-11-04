#!/bin/sh
set -eu
cd /app/backend
./node_modules/.bin/prisma migrate deploy --schema /app/prisma/schema.prisma
./node_modules/.bin/tsx src/scripts/seed.ts
exec ./node_modules/.bin/tsx src/index.ts
