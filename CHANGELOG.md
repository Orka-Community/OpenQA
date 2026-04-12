# @openqa/cli

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
