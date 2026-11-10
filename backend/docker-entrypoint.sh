#!/bin/sh
set -eu
cd /app/backend
app_database_url="$DATABASE_URL"
migrate_url="${DATABASE_MIGRATION_URL:-$DATABASE_URL}"
DATABASE_URL="$migrate_url" ./node_modules/.bin/prisma migrate deploy --schema /app/prisma/schema.prisma
DATABASE_URL="$migrate_url" ./node_modules/.bin/tsx src/scripts/ensure-app-role.ts
DATABASE_URL="$migrate_url" ./node_modules/.bin/tsx src/scripts/seed.ts
export DATABASE_URL="$app_database_url"
exec ./node_modules/.bin/tsx src/index.ts
