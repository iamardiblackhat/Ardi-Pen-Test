# API image for a free container host (Render). Replaces the GCP VM process.
# The database is not in this image. Point DATABASE_URL at Supabase.

FROM node:24-bookworm-slim AS build

RUN corepack enable && corepack prepare pnpm@11.28.5 --activate

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/api-server run build

FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends nmap ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build --chown=node:node /app/artifacts/api-server/dist ./dist

USER node
ENV NODE_ENV=production
CMD ["node", "--enable-source-maps", "dist/index.mjs"]
