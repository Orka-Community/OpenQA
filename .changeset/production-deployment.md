---
"@openqa/cli": minor
---

**Production Deployment Support**

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
