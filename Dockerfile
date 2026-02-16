# ── Build stage ──
FROM oven/bun:1 AS build

WORKDIR /build

# Copy x-dl dependency first (changes less often)
COPY x-dl/ ./x-dl/

# Copy xdl-web
COPY xdl-web/package.json xdl-web/bun.lock ./xdl-web/

# Install dependencies
WORKDIR /build/xdl-web
RUN bun install --frozen-lockfile

# Copy source and build frontend
COPY xdl-web/ ./
RUN bun run build

# ── Production stage ──
FROM oven/bun:1-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy x-dl source (needed at runtime for imports)
COPY --from=build /build/x-dl /x-dl

# Copy xdl-web with node_modules and built dist
COPY --from=build /build/xdl-web/package.json /build/xdl-web/bun.lock ./
COPY --from=build /build/xdl-web/node_modules ./node_modules
COPY --from=build /build/xdl-web/api ./api
COPY --from=build /build/xdl-web/dist ./dist

# Install Playwright Chromium
RUN bunx playwright install --with-deps chromium

# Create data directory for signups
RUN mkdir -p /app/api/data

EXPOSE 3001

CMD ["bun", "run", "api/server.ts"]
