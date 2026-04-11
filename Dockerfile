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
#    ⚠️  No `apk add chromium` — we use Playwright's own binary instead
RUN apk add --no-cache \
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

# 6. Drop root — run as unprivileged user (defense-in-depth)
RUN addgroup -S openqa && adduser -S openqa -G openqa && \
    chown -R openqa:openqa /app /ms-playwright
USER openqa

EXPOSE 3000

CMD ["node", "dist/cli/daemon.js"]
