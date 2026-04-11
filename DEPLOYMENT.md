# 🚀 OpenQA Production Deployment Guide

Complete guide for deploying OpenQA in production environments.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
  - [Docker (Recommended)](#docker-recommended)
  - [VPS/Bare Metal](#vpsbare-metal)
  - [Cloud Platforms](#cloud-platforms)
- [Security Checklist](#security-checklist)
- [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

- **Node.js 20+** (if not using Docker)
- **LLM API Key** (OpenAI, Anthropic, or self-hosted Ollama)
- **Domain name** (recommended for HTTPS)
- **SSL certificate** (Let's Encrypt recommended)

---

## Deployment Options

### 🐳 Docker (Recommended)

**Easiest and most reliable method for production.**

#### 1. Quick Start

```bash
# Clone repository
git clone https://github.com/Orka-Community/OpenQA.git
cd OpenQA

# Copy and configure environment
cp .env.production .env
nano .env  # Fill in your API keys and settings

# Generate JWT secret
openssl rand -hex 32  # Copy this to OPENQA_JWT_SECRET in .env

# Start with Docker Compose
docker-compose -f docker-compose.production.yml up -d

# Check logs
docker-compose -f docker-compose.production.yml logs -f
```

#### 2. With Nginx Reverse Proxy (HTTPS)

```bash
# Update nginx.conf with your domain
nano nginx.conf  # Change 'your-domain.com'

# Get SSL certificate (Let's Encrypt)
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates
sudo mkdir -p ssl
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/

# Start with Nginx
docker-compose -f docker-compose.production.yml --profile with-nginx up -d
```

#### 3. Access & Setup

```bash
# Visit your domain
https://your-domain.com

# First-time setup:
# 1. You'll be redirected to /setup
# 2. Create admin account (use strong password!)
# 3. Login and configure your target application
```

---

### 🖥️ VPS/Bare Metal

**For traditional server deployments (Ubuntu/Debian).**

#### 1. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools
sudo apt install -y build-essential python3 git
```

#### 2. Create User & Install OpenQA

```bash
# Create dedicated user
sudo useradd -r -m -s /bin/bash openqa

# Install OpenQA
sudo su - openqa
git clone https://github.com/Orka-Community/OpenQA.git /opt/openqa
cd /opt/openqa
npm ci --only=production
npm run build
```

#### 3. Configure Environment

```bash
# Copy and edit environment
cp .env.production .env
nano .env

# Generate JWT secret
openssl rand -hex 32  # Add to .env as OPENQA_JWT_SECRET

# Create data directory
mkdir -p /opt/openqa/data
```

#### 4. Setup Systemd Service

```bash
# Exit openqa user
exit

# Install service
sudo cp /opt/openqa/openqa.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable openqa
sudo systemctl start openqa

# Check status
sudo systemctl status openqa
sudo journalctl -u openqa -f
```

#### 5. Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/openqa

# Paste this config:
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4242;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/openqa /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

### ☁️ Cloud Platforms

#### Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables in Railway dashboard
# Deploy
railway up
```

**Required Environment Variables:**
- `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
- `OPENQA_JWT_SECRET` (generate with `openssl rand -hex 32`)
- `SAAS_URL`
- `NODE_ENV=production`

#### Render

1. **Create Web Service** on Render dashboard
2. **Connect GitHub repository**
3. **Configure:**
   - Build Command: `npm ci && npm run build`
   - Start Command: `node dist/cli/index.js start`
   - Environment: Add all variables from `.env.production`

#### Fly.io

```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app
flyctl launch

# Set secrets
flyctl secrets set OPENAI_API_KEY=sk-xxx
flyctl secrets set OPENQA_JWT_SECRET=$(openssl rand -hex 32)
flyctl secrets set SAAS_URL=https://your-app.com

# Deploy
flyctl deploy
```

---

## 🔒 Security Checklist

### Critical (Must Do)

- [ ] **Set strong `OPENQA_JWT_SECRET`** (min 32 random characters)
- [ ] **Never set `OPENQA_AUTH_DISABLED=true`** in production
- [ ] **Use HTTPS** (SSL/TLS certificate)
- [ ] **Create strong admin password** (min 12 chars, mixed case, numbers, symbols)
- [ ] **Set `NODE_ENV=production`**
- [ ] **Restrict CORS origins** (`CORS_ORIGINS=https://your-domain.com`)

### Recommended

- [ ] **Enable firewall** (allow only 80, 443, SSH)
- [ ] **Setup fail2ban** for SSH protection
- [ ] **Regular backups** of `/app/data` or `/opt/openqa/data`
- [ ] **Monitor logs** (`journalctl -u openqa -f` or Docker logs)
- [ ] **Update regularly** (`git pull && npm ci && npm run build`)
- [ ] **Use environment-specific API keys** (separate dev/prod)
- [ ] **Setup monitoring** (UptimeRobot, Datadog, etc.)

### Optional

- [ ] **Rate limiting** (Nginx or Cloudflare)
- [ ] **DDoS protection** (Cloudflare)
- [ ] **Database backups** (automated daily)
- [ ] **Log aggregation** (Papertrail, Loggly)
- [ ] **Alerting** (Slack, Discord, PagerDuty)

---

## 📊 Monitoring & Maintenance

### Health Check

```bash
# Check if service is running
curl http://localhost:4242/api/health

# Expected response: {"status":"ok"}
```

### Logs

```bash
# Docker
docker-compose -f docker-compose.production.yml logs -f openqa

# Systemd
sudo journalctl -u openqa -f --since "1 hour ago"
```

### Backups

```bash
# Backup database and data
tar -czf openqa-backup-$(date +%Y%m%d).tar.gz /opt/openqa/data

# Restore
tar -xzf openqa-backup-20260411.tar.gz -C /
```

### Updates

```bash
# Docker
cd /path/to/OpenQA
git pull
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Systemd
sudo systemctl stop openqa
sudo su - openqa
cd /opt/openqa
git pull
npm ci --only=production
npm run build
exit
sudo systemctl start openqa
```

### Resource Monitoring

```bash
# Check CPU/Memory usage
docker stats openqa  # Docker
top -u openqa        # Systemd
```

---

## 🆘 Troubleshooting

### Service won't start

```bash
# Check logs
docker-compose logs openqa  # Docker
sudo journalctl -u openqa -n 50  # Systemd

# Common issues:
# - Missing environment variables
# - Invalid JWT secret
# - Port already in use
# - Database permissions
```

### Can't access dashboard

```bash
# Check if service is listening
sudo netstat -tlnp | grep 4242

# Check firewall
sudo ufw status
sudo ufw allow 4242/tcp

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

### Authentication issues

```bash
# Reset admin password (requires DB access)
# Stop service first
sudo systemctl stop openqa

# Delete users table to trigger setup again
# Or manually update password hash in database
```

---

## 📞 Support

- **Documentation**: https://github.com/Orka-Community/OpenQA
- **Issues**: https://github.com/Orka-Community/OpenQA/issues
- **Discord**: https://discord.com/invite/DScfpuPysP

---

## 📝 License

MIT License - see LICENSE file for details
