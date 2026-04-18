# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json tsup.config.ts ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-slim

LABEL org.opencontainers.image.title="OpenQA" \
      org.opencontainers.image.description="Autonomous QA Testing Agent — powered by Orka" \
      org.opencontainers.image.url="https://hub.docker.com/r/orkalab/openqa" \
      org.opencontainers.image.source="https://github.com/Orka-Community/OpenQA" \
      org.opencontainers.image.vendor="Orka Team"

WORKDIR /app

RUN apt-get update && apt-get upgrade -y && apt-get install -y --no-install-recommends \
    gosu \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    libatspi2.0-0 \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Install Playwright's Chromium with all OS deps
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium

# Copy compiled app from builder
COPY --from=builder /app/dist ./dist

# Unprivileged user — entrypoint will fix /data permissions then drop to this user
RUN groupadd -r openqa && useradd -r -g openqa openqa \
    && mkdir -p /app/data \
    && chown -R openqa:openqa /app /ms-playwright

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENV NODE_ENV=production
ENV OPENQA_PORT=4242
ENV OPENQA_HOST=0.0.0.0
EXPOSE 4242

VOLUME /app/data

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/cli/daemon.js"]
