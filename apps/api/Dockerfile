# Build context: the repository root (`docker compose build` does it). Workspace: apps/api + packages/contracts.
FROM node:24-slim

# Prisma's schema engine needs OpenSSL; `migrate deploy` runs at startup.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Every workspace manifest is needed so `npm ci` can check the lockfile; only the API's dependencies are installed.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/contracts/package.json packages/contracts/
RUN npm ci --workspace apps/api --include-workspace-root

COPY packages/contracts packages/contracts
COPY apps/api apps/api

WORKDIR /app/apps/api
RUN npx prisma generate

# Photos live in a volume; the folder must belong to the user that runs the API.
ENV PORT=3000 PHOTOS_DIR=/data/photos
RUN mkdir -p /data/photos && chown -R node:node /data
USER node

EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://localhost:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Pending migrations are applied before the server starts.
CMD ["sh", "-c", "npx prisma migrate deploy && exec /app/node_modules/.bin/tsx src/main.ts"]
