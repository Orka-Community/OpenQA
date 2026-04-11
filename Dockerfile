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

# Patch all Alpine packages (eliminates CVEs from already-fixed packages)
# Install only the minimal system libs needed by Playwright's Chromium
RUN apk upgrade --no-cache && \
    apk add --no-cache \
      # Playwright Chromium runtime deps
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      font-noto-emoji \
      # Sandbox / seccomp support
      libstdc++ \
      chromium-swiftshader

# Tell Playwright to use the system Chromium path
# (Playwright bundles its own binary via `playwright install` — done below)
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0

# Install production deps (includes playwright package)
COPY package*.json ./
RUN npm ci --production

# Let Playwright download its own, more up-to-date Chromium binary
# (avoids the CVE-laden Alpine chromium package entirely)
RUN npx playwright install --with-deps chromium 2>/dev/null || \
    npx playwright install chromium

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Run as non-root for defense-in-depth
RUN addgroup -S openqa && adduser -S openqa -G openqa && \
    chown -R openqa:openqa /app /ms-playwright 2>/dev/null || true
USER openqa

EXPOSE 3000

CMD ["node", "dist/cli/daemon.js"]
