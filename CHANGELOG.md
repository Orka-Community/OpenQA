# @openqa/cli

## 3.1.1

### Patch Changes

- chore: update package

## 3.1.0

### Minor Changes

#### Approvals Queue — Human-in-the-Loop Review

A new **Approvals** page (`/approvals`) is now available in the sidebar. Findings with a confidence score between 50 and 74 are queued for human review instead of being auto-discarded or auto-promoted. Reviewers can approve (→ promoted to Kanban + Issues) or reject (→ archived) each finding.

- New route `GET /approvals` with dedicated UI
- Filter by status: Pending / Approved / Rejected
- Stats chips (pending count, approved count, rejected count)
- Badge on the dashboard sidebar showing pending count
- Approve/reject actions call existing `/api/approvals/:id/approve|reject` endpoints

#### Coverage — Real Metrics & CSV Export

The Coverage page no longer uses hardcoded denominators ("10 pages = 100%").

- Rings now display **raw counts** (pages visited, actions taken, forms tested, API calls) scaled relative to the local maximum — so the display is always truthful
- New **summary bar** shows absolute totals when data exists
- **Export CSV** now works: generates and downloads a real `openqa-coverage-YYYY-MM-DD.csv` file (was previously an `alert()` placeholder)

#### GitLab Mode — Full Parity with GitHub

GitLab sessions now behave exactly like GitHub sessions:

- Concurrency forced to 1 (API rate limits)
- Specialist selection mirrors GitHub: `github-code-reviewer`, `github-security-auditor`, `github-issue-analyzer` — or the full backend suite when a backend project is detected
- Dynamic agents disabled in GitLab mode (browser-based, not applicable to repos)
- `saasUrl` fallback in `/api/agent/start`: if no `saas.url` configured, derives URL from `gitlab.project` + `gitlab.url`

#### Bug Persistence — `create_kanban_ticket` now also creates bugs

When a finding is auto-approved (confidence ≥ 75) with `priority: high` or `priority: critical`, `create_kanban_ticket` now also inserts a record into the `bugs` table. This ensures **high/critical findings always appear on the Issues page**, not just the Kanban board.

### Patch Changes

- Dashboard sidebar: "Tests" renamed to "Actions" (in sync with shared sidebar component)
- Shared sidebar: "Approvals" entry added between Coverage and Logs
- `README.md`: corrected env var names (`OPENQA_PORT`/`OPENQA_HOST` instead of `WEB_PORT`/`WEB_HOST`), added GitLab section, full UI page table, architecture diagram
- `daemon.ts`: GitLab URL fallback added to `/api/agent/start` (derives `https://gitlab.com/<project>` when no `saas.url` set)
- Test suite: 270 tests passing, no regressions

## 2.1.28

### Patch Changes

- chore: update package

## 2.1.27

### Patch Changes

- chore: update package

## 3.0.0

### Major Changes

#### Backend Testing — Autonomous Project Detection

OpenQA can now test **backend API projects** in addition to web frontends. When a GitHub or GitLab URL is configured, OpenQA automatically detects the project type, language, and framework by reading manifest files — without any LLM call.

**Supported stacks (auto-detected):**

- **Node.js / TypeScript** — Express, Fastify, NestJS, Koa, Hapi, Next.js
- **Python** — FastAPI, Django, Flask, Aiohttp, Starlette, Sanic
- **Go** — Gin, Echo, Fiber, Chi, gorilla/mux, net/http
- **Rust** — Actix-web, Axum, Rocket, Warp
- **Java / Kotlin** — Spring Boot, Quarkus, Micronaut, Vert.x
- **Ruby** — Rails, Sinatra, Grape, Hanami
- **PHP** — Laravel, Symfony, Slim, Lumen
- **Elixir** — Phoenix
- **C# / .NET** — ASP.NET Core

**4 new backend specialists:**

- `backend-api-tester` — discovers and security-tests all live API endpoints (auth, injection, CORS, rate limiting)
- `backend-code-auditor` — static code analysis across any language (secrets, SQL concatenation, missing error handling)
- `backend-security-auditor` — OWASP API Security Top 10 (2023) full audit, both static and live
- `backend-dependency-scanner` — CVE detection, missing lockfiles, wildcard versions, absence of `npm audit` / `pip-audit` in CI

**New `BackendProfile` in `ProjectIntelligence`:**

```typescript
{
  projectType: 'backend-only' | 'frontend-only' | 'fullstack' | 'library' | 'cli' | 'mobile' | 'unknown',
  language: string,    // 'python', 'go', 'typescript', 'java', 'rust', ...
  framework: string,   // 'fastapi', 'express', 'gin', 'spring', ...
  hasSwaggerDocs: boolean,
  hasTestSuite: boolean,
  testCommand?: string,    // e.g. 'pytest', 'go test ./...'
  detectedEndpoints: string[],  // extracted from source code
}
```

#### HTTP Testing Tools — New `ApiHttpTools`

5 new tools for HTTP-level backend testing (no browser required):

| Tool                      | Description                                                          |
| ------------------------- | -------------------------------------------------------------------- |
| `test_http_endpoint`      | HTTP request + security header analysis + secret exposure detection  |
| `discover_api_endpoints`  | Probes 30+ common paths to map the live API surface                  |
| `test_endpoint_auth`      | 5 invalid token variants — flags endpoints accessible without auth   |
| `test_endpoint_injection` | 10 payloads: SQLi, NoSQLi, XSS, mass assignment, prototype pollution |
| `test_rate_limiting`      | 20 concurrent requests — detects missing 429 protection              |
| `check_cors_policy`       | Wildcard origin, credentials bypass, null origin                     |

#### Enterprise Features

**Deduplication pipeline:**

- SHA-256 fingerprint per finding (`title + url + category`)
- Duplicate findings silently skipped before any ticket is created

**Confidence scoring:**

- Every finding scored 0–100 based on evidence quality
- `≥ 75` → auto-approved, ticket created immediately
- `50–74` → queued for human review at `/approvals`
- `< 50` → discarded (false positive)

**Human approval workflow:**

- `GET /api/approvals` — list pending findings
- `POST /api/approvals/:id/approve` — approve → auto-creates Kanban ticket
- `POST /api/approvals/:id/reject` — reject with optional note

**Scheduled runs:**

- Full CRUD: `GET/POST /api/schedules`, `PUT /api/schedules/:id`, `DELETE /api/schedules/:id`
- Background cron job checks every 60 seconds, fires due sessions autonomously

**Session timeout:**

- Background job (every 5 min) marks sessions running > 2h as `failed`

**Session baseline & regression detection:**

- `GET /api/sessions/:id/baseline` — compares current session bugs vs previous session
- Detects regressions (bugs that reappeared) and improvements (bugs that were fixed)

**External integrations:**

- **Jira** — REST API v3, Basic auth, severity→priority mapping, ADF description format
- **Linear** — GraphQL API, priority 1–4, rich markdown description
- **Azure DevOps** — REST API v7, JSON Patch document format

**Executive report:**

- `GET /api/reports/:sessionId/executive` — single-page print-ready HTML
- QA score circle (green/amber/red), 3 key metrics, top 5 issues, recommendations

**GitHub Actions webhook:**

- `POST /api/webhook/github` — HMAC `X-Hub-Signature-256` validation
- Triggers an autonomous run on `push` and `pull_request` events

#### Browser Tools Enhancements

- `get_page_content` — returns structured JSON: title, 3000-char text sample, 40 links, all forms + fields, 25 buttons, 25 inputs
- `find_element_by_text` — semantic click by visible text (robust for React/Vue dynamic class names)
- `wait_for_element` — waits up to 10s for a CSS selector to appear (essential for SPAs)
- `check_console_errors` — captures JS runtime errors with proper cleanup
- Auto-installs Playwright Chromium if not present (`npx playwright install chromium --with-deps`)

#### Parallel Specialist Execution

Specialists now run in a **concurrency pool** instead of sequentially:

- SaaS mode: max 2 concurrent specialists
- GitHub mode: 1 at a time (API rate limit–aware)
- Rate limit errors trigger a 30-second pause and retry

#### Intelligence Phase — LLM Fallback for Opaque URLs

When static analysis confidence is low (unknown domain, no URL signals), a single small LLM call (~150 input tokens) classifies the app. The LLM result enriches but never overrides static evidence.

### Minor Changes

- GitHub mode: `Octokit` always initialized — public repos work without a token (60 req/hr anonymous)
- Session `isRunning` flag always reset via `try-finally` even if brain throws
- GitHub mode skips the `think()` loop (no browser to navigate — saved 10 wasted LLM calls per session)
- Specialists use a fast/cheap model (`gpt-4o-mini` / `claude-haiku`) — 20× more TPM headroom
- `tsconfig.json` now includes `"DOM"` lib for `page.evaluate()` callbacks

### Bug Fixes

- Fixed: GitHub "not configured" error on public repos without a token
- Fixed: Sessions stuck at 0 actions when LLM fails during Phase 1 analysis
- Fixed: `trackPageVisit` called with invalid `"inspect"` action type
- Fixed: `specialistModel` property missing from brain's `llmConfig` type
- Fixed: `TS2584` / `TS2304` on `document` / `HTMLElement` in browser tool evaluate callbacks

---

## 2.1.26

### Patch Changes

- chore: update package

## 2.1.25

### Patch Changes

- chore: update package

## 2.1.24

### Patch Changes

- chore: update package

## 2.1.23

### Patch Changes

- chore: update package

## 2.1.22

### Patch Changes

- chore: update package

## 2.1.21

### Patch Changes

- chore: update package

## 2.1.20

### Patch Changes

- chore: update package

## 2.1.19

### Patch Changes

- chore: update package

## 2.1.18

### Patch Changes

- chore: update package

## 2.1.17

### Patch Changes

- chore: update package

## 2.1.16

### Patch Changes

- chore: update package

## 2.1.15

### Patch Changes

- chore: update package

## 2.1.14

### Patch Changes

- chore: update package

## 2.1.13

### Patch Changes

- chore: update package

## 2.1.12

### Patch Changes

- chore: update package

## 2.1.11

### Patch Changes

- chore: update package

## 2.1.10

### Patch Changes

- chore: update package

## 2.1.9

### Patch Changes

- chore: update package

## 2.1.8

### Patch Changes

- chore: update package

## 2.1.7

### Patch Changes

- chore: update package

## 2.1.6

### Patch Changes

- chore: update package

## 2.1.5

### Patch Changes

- chore: update package

## 2.1.4

### Patch Changes

- chore: update package

## 2.1.3

### Patch Changes

- chore: update package

## 2.1.2

### Patch Changes

- chore: update package

## 2.1.1

### Patch Changes

- chore: update package

## 2.1.0

### Minor Changes

- 55fdbcd: **Environment Variables Management UI**

  Added a complete web-based interface for managing environment variables directly from the dashboard, eliminating the need to manually edit `.env` files.

  **New Features:**

  1. **Web Interface** (`/config/env`)

     - Beautiful, categorized UI for all environment variables
     - 8 categories: LLM, Security, Target App, GitHub, Web Server, Agent, Database, Notifications
     - Real-time validation with error messages
     - Masked display for sensitive values (passwords, API keys)
     - Responsive design with tabs for easy navigation

  2. **API Endpoints** (`/api/env/*`)

     - `GET /api/env` - List all environment variables
     - `GET /api/env/:key` - Get specific variable
     - `PUT /api/env/:key` - Update single variable
     - `POST /api/env/bulk` - Update multiple variables
     - `POST /api/env/test/:key` - Test API keys/URLs
     - `POST /api/env/generate/:key` - Generate secrets

  3. **Validation System**

     - Real-time validation for all inputs
     - Type-specific validation (URL, number, boolean, select)
     - Custom validators for API keys, tokens, webhooks
     - Required field enforcement

  4. **Testing Functionality**

     - Test OpenAI API keys
     - Test Anthropic API keys
     - Test Ollama server connectivity
     - Test GitHub tokens
     - Test Slack/Discord webhooks
     - Test target application URLs

  5. **Security Features**

     - Admin-only access (requires authentication)
     - Sensitive values masked in UI
     - Password-type inputs for secrets
     - Validation prevents dangerous configurations
     - Auto-generated JWT secrets

  6. **User Experience**
     - One-click secret generation
     - Bulk save with single click
     - Restart warnings when needed
     - Success/error notifications
     - Tooltips and descriptions for each variable
     - Placeholder examples

  **Technical Details:**

  - **Files Added:**

    - `cli/env-config.ts` - Schema and validation logic
    - `cli/env-routes.ts` - API endpoints
    - `cli/env.html.ts` - Web interface

  - **Integration:**

    - Integrated in both `server.ts` and `daemon.ts`
    - Accessible at `/config/env`
    - Protected by authentication middleware

  - **Supported Variables:** 30+ environment variables across 8 categories

  **Benefits:**

  - ✅ No need to SSH into server to edit `.env`
  - ✅ No risk of syntax errors in `.env` file
  - ✅ Immediate validation feedback
  - ✅ Test configurations before saving
  - ✅ Better UX for non-technical users
  - ✅ Centralized configuration management

- 55fdbcd: **Production Deployment Support**

  Added comprehensive production deployment infrastructure and documentation to make deploying OpenQA in production environments easy and secure.

  **New Files:**

  - `Dockerfile.production` - Production-optimized Docker image
  - `docker-compose.production.yml` - Complete orchestration with Nginx
  - `nginx.conf` - Reverse proxy with SSL, rate limiting, WebSocket support
  - `openqa.service` - Systemd service for VPS/bare metal
  - `.env.production` - Production environment template
  - `DEPLOYMENT.md` - Complete deployment guide (Docker, VPS, Cloud)
  - `QUICKSTART-PRODUCTION.md` - 5-minute quick start guide
  - `install-production.sh` - Interactive installer for all platforms
  - `fly.toml` - Fly.io configuration
  - `render.yaml` - Render.com blueprint
  - `.dockerignore` - Docker build optimization

  **Deployment Methods Supported:**

  1. 🐳 Docker with Docker Compose (recommended)
  2. 🖥️ VPS/Bare Metal with systemd
  3. ☁️ Railway (one-click deploy)
  4. 🎨 Render (auto-deploy from GitHub)
  5. 🪰 Fly.io (global edge deployment)

  **Features:**

  - One-line installation: `curl -fsSL https://openqa.orkajs.com/install-production.sh | bash`
  - Production-ready Docker image (multi-stage build, non-root user)
  - Nginx reverse proxy with SSL/TLS support
  - Systemd service with auto-restart
  - Health checks and monitoring
  - Resource limits and security hardening
  - Comprehensive documentation and troubleshooting guides

  **Security Enhancements:**

  - JWT secret generation
  - HTTPS/SSL by default
  - Rate limiting
  - CORS configuration
  - Firewall recommendations
  - Security checklist

  **Documentation Updates:**

  - Updated README.md with production deployment section
  - Added deployment comparison table
  - Added security checklist
  - Added links to detailed guides

### Patch Changes

- 55fdbcd: **SECURITY FIX**: Enable authentication by default on dashboard

  Fixed critical security vulnerability where the dashboard, kanban, and config pages were accessible without authentication in `server.ts`. All HTML pages and API endpoints now require authentication by default.

  **Breaking change for development**: If you were relying on unauthenticated access, you must now either:

  1. Create an admin account on first launch at `/setup`
  2. Set `OPENQA_AUTH_DISABLED=true` in your environment (NOT recommended for production)

  **What changed**:

  - Added authentication middleware to `server.ts` (was only in `daemon.ts`)
  - All `/`, `/kanban`, `/config` routes now require login
  - All `/api/*` routes (except `/api/auth/*`, `/api/setup`, `/api/health`) require JWT token
  - Added rate limiting on auth endpoints (30 req/min)
  - Added CORS configuration with credentials support

  **Security features**:

  - JWT-based authentication with httpOnly cookies
  - Scrypt password hashing
  - Role-based access control (admin/viewer)
  - CSRF protection via SameSite cookies
  - Rate limiting on mutation endpoints

  **UX improvements**:

  - Username validation now accepts email addresses (supports `._@-` characters)
  - Better error messages and hints in setup form

## 2.0.0

### Major Changes

- 8e70777: Fix dashboard URL mismatches (/api/start, /api/stop, /api/agents)
