# ⚡ OpenQA Production Quick Start

Choose your deployment method and get started in **5 minutes**.

---

## 🐳 Option 1: Docker (Recommended)

**Fastest and most reliable method.**

```bash
# 1. Clone and configure
git clone https://github.com/Orka-Community/OpenQA.git
cd OpenQA
cp .env.production .env

# 2. Edit .env - Add your API keys
nano .env
# Required:
#   - OPENAI_API_KEY or ANTHROPIC_API_KEY
#   - OPENQA_JWT_SECRET (generate: openssl rand -hex 32)
#   - SAAS_URL (your app URL)

# 3. Start
docker-compose -f docker-compose.production.yml up -d

# 4. Access
open http://localhost:4242
```

**Done!** Visit http://localhost:4242/setup to create your admin account.

---

## ☁️ Option 2: Railway (One-Click)

**Easiest cloud deployment - no server management.**

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy
git clone https://github.com/Orka-Community/OpenQA.git
cd OpenQA
railway init
railway up

# 4. Set environment variables in Railway dashboard
# Required: OPENAI_API_KEY, OPENQA_JWT_SECRET, SAAS_URL
```

**Done!** Railway will give you a public URL.

---

## 🚀 Option 3: Render (Auto-Deploy)

**Zero configuration - just connect GitHub.**

1. **Fork** the OpenQA repository on GitHub
2. **Go to** [render.com](https://render.com)
3. **Create New → Web Service**
4. **Connect** your forked repository
5. **Render auto-detects** `render.yaml` and configures everything
6. **Add environment variables** in Render dashboard:
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`
   - `OPENQA_JWT_SECRET` (auto-generated)
   - `SAAS_URL`
7. **Deploy!**

**Done!** Render gives you a `https://openqa-xxx.onrender.com` URL.

---

## 🪰 Option 4: Fly.io (Global Edge)

**Deploy to 30+ regions worldwide.**

```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
flyctl auth login

# 3. Deploy
git clone https://github.com/Orka-Community/OpenQA.git
cd OpenQA
flyctl launch  # Auto-detects fly.toml

# 4. Set secrets
flyctl secrets set OPENAI_API_KEY=sk-xxx
flyctl secrets set OPENQA_JWT_SECRET=$(openssl rand -hex 32)
flyctl secrets set SAAS_URL=https://your-app.com

# 5. Deploy
flyctl deploy
```

**Done!** Access at `https://openqa.fly.dev`

---

## 🖥️ Option 5: VPS (Ubuntu/Debian)

**Traditional server deployment with systemd.**

```bash
# Run the automated installer
curl -fsSL https://openqa.orkajs.com/install-production.sh | bash

# Choose option 2 (VPS/Bare Metal)
# Follow the prompts
```

**Manual steps:**

```bash
# 1. Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential git

# 2. Create user and install
sudo useradd -r -m -s /bin/bash openqa
sudo -u openqa git clone https://github.com/Orka-Community/OpenQA.git /opt/openqa
cd /opt/openqa
sudo -u openqa npm ci --only=production
sudo -u openqa npm run build

# 3. Configure
sudo -u openqa cp .env.production .env
sudo nano /opt/openqa/.env  # Add API keys

# 4. Install systemd service
sudo cp openqa.service /etc/systemd/system/
sudo systemctl enable openqa
sudo systemctl start openqa

# 5. Setup Nginx (optional, for HTTPS)
sudo apt install nginx certbot python3-certbot-nginx
sudo cp nginx.conf /etc/nginx/sites-available/openqa
sudo ln -s /etc/nginx/sites-available/openqa /etc/nginx/sites-enabled/
sudo certbot --nginx -d your-domain.com
```

**Done!** Access at `https://your-domain.com`

---

## 🔐 First-Time Setup

After deployment, **regardless of method**:

1. **Visit your OpenQA URL**
2. **You'll be redirected to `/setup`**
3. **Create admin account:**
   - Username: Your email or username
   - Password: Strong password (min 8 chars)
4. **Login and configure:**
   - Go to `/config`
   - Set your target application URL
   - Configure test settings

---

## ✅ Security Checklist

Before going live:

- [ ] Set strong `OPENQA_JWT_SECRET` (32+ random chars)
- [ ] Use strong admin password
- [ ] Enable HTTPS (SSL certificate)
- [ ] Never set `OPENQA_AUTH_DISABLED=true`
- [ ] Set `NODE_ENV=production`
- [ ] Restrict CORS origins
- [ ] Enable firewall (ports 80, 443 only)
- [ ] Setup automated backups

---

## 📊 Verify Installation

```bash
# Check health
curl https://your-openqa-url.com/api/health
# Expected: {"status":"ok"}

# Check logs (Docker)
docker-compose logs -f openqa

# Check logs (Systemd)
sudo journalctl -u openqa -f

# Check logs (Cloud platforms)
# Use platform dashboard
```

---

## 🆘 Troubleshooting

### Can't access dashboard
- Check if service is running
- Check firewall rules
- Check logs for errors

### Authentication not working
- Verify `OPENQA_JWT_SECRET` is set
- Clear browser cookies
- Check if `/setup` was completed

### LLM errors
- Verify API key is correct
- Check API key has credits
- Check network connectivity

---

## 📚 Next Steps

- **[Full Deployment Guide](./DEPLOYMENT.md)** - Detailed production setup
- **[README](./README.md)** - Complete documentation
- **[Discord](https://discord.com/invite/DScfpuPysP)** - Get help from community

---

## 🎯 Quick Reference

| Method | Time | Difficulty | Cost | Best For |
|--------|------|------------|------|----------|
| Docker | 5 min | Easy | Free | Local/VPS |
| Railway | 3 min | Easiest | $5/mo | Quick deploy |
| Render | 2 min | Easiest | Free tier | Hobby projects |
| Fly.io | 5 min | Easy | Free tier | Global edge |
| VPS | 15 min | Medium | $5/mo | Full control |

---

**Need help?** Join our [Discord](https://discord.com/invite/DScfpuPysP) 💬
