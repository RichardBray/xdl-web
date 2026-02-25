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
RUN bunx vite build

# ── Production stage ──
# Use Playwright base image which already has Chromium + all system deps
FROM mcr.microsoft.com/playwright:v1.57.0-noble

# Install Bun
RUN apt-get update && apt-get install -y --no-install-recommends unzip && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

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

# Overwrite node_modules/x-dl with a real copy (not symlinks to the host)
COPY --from=build /build/x-dl ./node_modules/x-dl

# Install Chromium matching the exact playwright version in node_modules
# (no --with-deps: system deps already in base image)
RUN PLAYWRIGHT_BROWSERS_PATH=/ms-playwright ./node_modules/.bin/playwright install chromium

# Create data directory for signups
RUN mkdir -p /app/api/data

EXPOSE 3001

CMD ["bun", "run", "api/server.ts"]
