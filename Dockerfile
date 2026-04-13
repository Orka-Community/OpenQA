# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-slim

LABEL org.opencontainers.image.title="OpenQA" \
      org.opencontainers.image.description="Autonomous QA Testing Agent — powered by Orka" \
      org.opencontainers.image.url="https://hub.docker.com/r/orklab/openqa" \
      org.opencontainers.image.source="https://github.com/Orka-Community/OpenQA" \
      org.opencontainers.image.vendor="Orka Team"

WORKDIR /app

# 1. Update system packages
RUN apt-get update && apt-get upgrade -y

# 2. Install Playwright system dependencies and gosu
RUN apt-get install -y \
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

# 3. Production deps (includes the `playwright` npm package)
COPY package*.json ./
RUN npm ci --production

# 4. Install Playwright browsers with all dependencies
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install --with-deps chromium

# 5. Copy compiled app
COPY --from=builder /app/dist ./dist

# 6. Create unprivileged user — do NOT set USER here; the entrypoint will
#    fix volume permissions (needs root) then exec as openqa via gosu
RUN groupadd -r openqa && useradd -r -g openqa openqa && \
    chown -R openqa:openqa /app /ms-playwright

# 7. Entrypoint script fixes /data volume permissions then drops to openqa
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 8. Configurable port (default: 4242)
ENV WEB_PORT=4242
ENV WEB_HOST=0.0.0.0
EXPOSE ${WEB_PORT}

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "dist/cli/daemon.js"]
