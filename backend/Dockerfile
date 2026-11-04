FROM node:22-alpine
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY prisma prisma
COPY lib/presale.ts lib/presale.ts
COPY lib/presale-ledger lib/presale-ledger
RUN pnpm --filter @oxxx/admin... install --frozen-lockfile

COPY backend backend
RUN pnpm --filter @oxxx/admin exec prisma generate --schema /app/prisma/schema.prisma
RUN chmod +x /app/backend/docker-entrypoint.sh \
  && mkdir -p /app/backend/var/storage \
  && chown -R node:node /app

USER node
WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 4000
CMD ["./docker-entrypoint.sh"]
