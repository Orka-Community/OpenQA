# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM node:22-alpine

LABEL org.opencontainers.image.title="OpenQA" \
      org.opencontainers.image.description="Autonomous QA Testing Agent — powered by Orka" \
      org.opencontainers.image.url="https://hub.docker.com/r/orklab/openqa" \
      org.opencontainers.image.source="https://github.com/Orka-Community/OpenQA" \
      org.opencontainers.image.vendor="Orka Team"

WORKDIR /app

# 1. Patch ALL Alpine packages (fixes musl, openssl, zlib, busybox CVEs)
#    Must run BEFORE any apk add so new packages are also at latest
RUN apk upgrade --no-cache

# 2. Only the minimal libs required by Playwright's Chromium at runtime
#    su-exec lets the entrypoint fix volume permissions then drop to openqa user
RUN apk add --no-cache \
    su-exec \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# 3. Production deps (includes the `playwright` npm package)
COPY package*.json ./
RUN npm ci --production

# 4. Let Playwright download its own Chromium binary (kept up-to-date by Microsoft,
#    not the outdated Alpine chromium package which carries the critical CVEs)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
RUN npx playwright install chromium

# 5. Copy compiled app
COPY --from=builder /app/dist ./dist

# 6. Create unprivileged user — do NOT set USER here; the entrypoint will
#    fix volume permissions (needs root) then exec as openqa via su-exec
RUN addgroup -S openqa && adduser -S openqa -G openqa && \
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
