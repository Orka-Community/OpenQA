<p align="center">
  <img src="https://orkajs.com/loutre-orka-qa.png" alt="OpenQA" width="180" />
</p>

<h1 align="center">OpenQA</h1>

<p align="center">
  <strong>Autonomous QA Testing Agent - Thinks, codes, and executes tests like a senior QA engineer. Powered by Orka Team</strong>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@openqa/cli"><img src="https://img.shields.io/npm/v/@openqa/cli.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@openqa/cli"><img src="https://img.shields.io/npm/dm/@openqa/cli.svg" alt="npm downloads"></a>
  <a href="https://github.com/Orka-Community/OpenQA/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@openqa/cli.svg" alt="license"></a>
  <a href="https://openqa.orkajs.com"><img src="https://img.shields.io/badge/docs-orkajs.com-blue.svg" alt="documentation"></a>
  <a href="https://discord.com/invite/DScfpuPysP"><img src="https://img.shields.io/badge/discord-join%20chat-7289da.svg" alt="discord"></a>
</p>

---

OpenQA is a **truly autonomous** QA testing agent that thinks, codes, and executes tests like a senior QA engineer. It analyzes your application, generates its own tests, creates custom agents, and continuously improves.

## ✨ Features

### 🧠 Autonomous Brain
### � Autonomous Brain
- **Self-thinking** - Analyzes your app and decides what to test
- **Self-coding** - Generates unit, functional, E2E, security, and regression tests
- **Self-improving** - Learns from results and adapts strategy
- **Dynamic Agents** - Creates specialized agents on-the-fly based on needs

### � Simple Configuration
- **Describe your SaaS** - Just provide name, description, and URL
- **Add directives** - Optional instructions to guide the agent
- **Connect repo** - Optional: clone and analyze your codebase
- **That's it!** - The agent figures out the rest

### 🔗 Git Integration
- **GitHub/GitLab** - Auto-detect merges on main branch
- **CI/CD Listener** - Trigger tests after successful deployments
- **Auto Issues** - Creates issues for critical bugs found

### 🧪 Test Generation
- **Unit Tests** - Isolated function/component tests
- **Functional Tests** - User workflow tests
- **E2E Tests** - Complete user journey tests
- **Security Tests** - SQL injection, XSS, auth bypass
- **Regression Tests** - Verify bug fixes
- **Performance Tests** - Load times, resource usage

## 🚀 Quick Start

### Development (Local)

```bash
# One-line installation
curl -fsSL https://openqa.orkajs.com/install.sh | bash

# Or via npm
npx @openqa/cli start
```

### Production Deployment

```bash
# Interactive production installer
curl -fsSL https://openqa.orkajs.com/install-production.sh | bash
```

**Supports:**
- 🐳 **Docker** (recommended)
- 🖥️ **VPS/Bare Metal** (Ubuntu/Debian with systemd)
- ☁️ **Cloud Platforms** (Railway, Render, Fly.io)

📖 **[Full Deployment Guide](./DEPLOYMENT.md)** - Complete production setup instructions

### Configure Your SaaS (3 lines!)

```bash
# Configure your application
curl -X POST http://localhost:3000/api/saas-config/quick \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My SaaS App",
    "description": "E-commerce platform with user auth, product catalog, and checkout",
    "url": "https://my-app.com"
  }'

# Start autonomous testing
curl -X POST http://localhost:3000/api/brain/run
```

**That's it!** OpenQA will:
1. Analyze your application
2. Generate appropriate tests
3. Create specialized agents as needed
4. Execute tests and report findings
5. Create GitHub issues for critical bugs

### Manual Installation

```bash
git clone https://github.com/orka-js/openqa.git
cd openqa
npm install && npm run build
cp .env.example .env  # Add your LLM API key
npm start
```

## 📖 Usage

### Start OpenQA

```bash
# Start in foreground (see logs)
openqa start

# Start in daemon mode (background)
openqa start --daemon
```

### Access Web Interfaces

Once started, open your browser:

- **Dashboard**: http://localhost:4242 - Main dashboard with real-time monitoring
- **Kanban**: http://localhost:4242/kanban - View and manage QA tickets
- **Config**: http://localhost:4242/config - Configure OpenQA settings

### 🔐 Dashboard Authentication

OpenQA includes a secure authentication system to protect your dashboard:

#### First-Time Setup

On first launch, you'll be redirected to `/setup` to create an admin account:

1. Visit http://localhost:4242
2. Create your admin username and password (min 8 characters)
3. You'll be automatically logged in

#### Login

After setup, access the dashboard at http://localhost:4242/login with your credentials.

#### User Management (Admin Only)

Admins can manage users via the API:

```bash
# List all users
curl http://localhost:4242/api/accounts \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create a viewer account
curl -X POST http://localhost:4242/api/accounts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username": "viewer1", "password": "securepass123", "role": "viewer"}'

# Change password
curl -X POST http://localhost:4242/api/auth/change-password \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword": "old", "newPassword": "newsecure123"}'
```

**Roles:**
- **admin** - Full access (manage users, configure, run tests)
- **viewer** - Read-only access (view tests, bugs, sessions)

**Security Features:**
- JWT-based authentication with httpOnly cookies
- Scrypt password hashing
- Rate limiting on auth endpoints
- CSRF protection via SameSite cookies

#### Disable Authentication (Development Only)

For local development, you can disable authentication:

```bash
export OPENQA_AUTH_DISABLED=true
openqa start
```

⚠️ **Never disable authentication in production!**

### CLI Commands

```bash
# Check status
openqa status

# View logs
openqa logs
openqa logs --follow

# Configuration
openqa config list
openqa config get llm.provider
openqa config set saas.url https://your-app.com

# Stop agent
openqa stop
```

## ⚙️ Configuration

### Environment Variables

```bash
# LLM Configuration
LLM_PROVIDER=openai              # openai, anthropic, or ollama
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=http://localhost:11434

# Target SaaS Application
SAAS_URL=https://your-app.com
SAAS_AUTH_TYPE=none              # none, basic, or session
SAAS_USERNAME=
SAAS_PASSWORD=

# GitHub Integration (Optional)
GITHUB_TOKEN=ghp_xxx
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo

# Agent Behavior
AGENT_INTERVAL_MS=3600000        # 1 hour between test sessions
AGENT_MAX_ITERATIONS=20          # Max actions per session
AGENT_AUTO_START=true            # Start testing automatically

# Web UI
WEB_PORT=3000
WEB_HOST=0.0.0.0

# Database
DB_PATH=./data/openqa.db
```

### Web-based Configuration

Prefer using the web interface at http://localhost:3000/config for easier configuration.

## 🧠 How the Brain Works

### The Thinking Loop

```
┌───────────┐     ┌───────────┐     ┌───────────┐
│  ANALYZE  │ →→→ │   THINK   │ →→→ │    ACT    │
└───────────┘     └───────────┘     └───────────┘
     │                  │                  │
     │                  │                  │
     └──────────────────┴──────────────────┘
                    LEARN
```

1. **ANALYZE** - Understands your app (description, URL, code if available)
2. **THINK** - Decides what tests are needed, what agents to create
3. **ACT** - Generates tests, creates agents, executes tests
4. **LEARN** - Reviews results, adjusts strategy, repeats

### What It Generates

| Test Type | Description | Example |
|-----------|-------------|----------|
| **Unit** | Isolated function tests | `test_validateEmail()` |
| **Functional** | User workflow tests | `test_loginFlow()` |
| **E2E** | Complete journeys | `test_purchaseCheckout()` |
| **Security** | Vulnerability tests | `test_sqlInjection()` |
| **Regression** | Bug fix verification | `test_issue123_fix()` |
| **Performance** | Speed/load tests | `test_pageLoadTime()` |

### Dynamic Agent Creation

The Brain creates specialized agents based on what it discovers:

```
🧠 Brain: "I see this app has a checkout flow. Let me create a specialist."
     ↓
🤖 Creates: "Checkout Flow Tester" agent with custom prompt
     ↓
🧪 Agent generates: 5 tests for cart, payment, confirmation
     ↓
✅ Executes tests, reports 2 bugs found
```

## 📊 Web Interfaces

### DevTools Dashboard

Real-time monitoring:
- Current agent status
- Live action logs
- Test session history
- Bugs detected
- Screenshots captured

### Kanban Board

Manage QA findings:
- **Backlog** - Future test ideas
- **To Do** - Bugs to fix
- **In Progress** - Being worked on
- **Done** - Resolved

Drag & drop tickets between columns.

### Configuration Panel

Simple configuration:
- **SaaS Info** - Name, description, URL
- **Repository** - Optional GitHub/GitLab URL for code analysis
- **Directives** - Custom instructions for the agent
- **LLM Settings** - Provider, API key, model
- **Git Listener** - Auto-test on merge/deploy

## 🔧 Advanced Usage

### Full Configuration

```bash
# Configure with all options
curl -X POST http://localhost:3000/api/saas-config \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My E-commerce App",
    "description": "Online store with user accounts, product catalog, shopping cart, and Stripe checkout",
    "url": "https://my-store.com",
    "repoUrl": "https://github.com/myorg/my-store",
    "directives": [
      "Focus on the checkout flow - it has had bugs before",
      "Test with both logged-in and guest users",
      "Check that discount codes work correctly",
      "Verify email notifications are sent"
    ],
    "auth": {
      "type": "session",
      "credentials": { "username": "test@example.com", "password": "testpass" }
    }
  }'
```

### Add Directives On-the-fly

```bash
# Add a new directive
curl -X POST http://localhost:3000/api/saas-config/directive \
  -H "Content-Type: application/json" \
  -d '{"directive": "Pay special attention to the new refund feature"}'
```

### Connect Repository for Code Analysis

```bash
# The Brain will clone and analyze your code
curl -X POST http://localhost:3000/api/saas-config/repository \
  -H "Content-Type: application/json" \
  -d '{"url": "https://github.com/myorg/my-app"}'
```

### Generate Specific Tests

```bash
# Generate a security test
curl -X POST http://localhost:3000/api/brain/generate-test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "security",
    "target": "Login form SQL injection",
    "context": "The login form at /login accepts email and password"
  }'

# Generate a functional test
curl -X POST http://localhost:3000/api/brain/generate-test \
  -H "Content-Type: application/json" \
  -d '{
    "type": "functional",
    "target": "User registration flow"
  }'
```

### Create Custom Agent

```bash
# Let the Brain create a specialized agent
curl -X POST http://localhost:3000/api/brain/create-agent \
  -H "Content-Type: application/json" \
  -d '{"purpose": "Test the multi-step checkout process with various payment methods"}'
```

### Analyze Before Running

```bash
# Get analysis and suggestions without running tests
curl -X POST http://localhost:3000/api/brain/analyze

# Response:
# {
#   "understanding": "E-commerce app with user auth, catalog, cart, checkout",
#   "suggestedTests": ["Test cart persistence", "Test checkout validation", ...],
#   "suggestedAgents": ["Payment Flow Specialist", "Inventory Checker"],
#   "risks": ["Cart race conditions", "Payment double-charge"]
# }
```

## 🚀 Production Deployment

### Quick Deploy (5 minutes)

```bash
# Interactive installer - Choose Docker, VPS, or Cloud
curl -fsSL https://openqa.orkajs.com/install-production.sh | bash
```

### Deployment Options

| Method | Time | Difficulty | Best For |
|--------|------|------------|----------|
| 🐳 **Docker** | 5 min | Easy | VPS, Local servers |
| 🖥️ **VPS/Systemd** | 15 min | Medium | Full control |
| ☁️ **Railway** | 3 min | Easiest | Quick deploy |
| 🎨 **Render** | 2 min | Easiest | Free tier |
| 🪰 **Fly.io** | 5 min | Easy | Global edge |

### Docker (Recommended)

```bash
# 1. Clone and configure
git clone https://github.com/Orka-Community/OpenQA.git
cd OpenQA
cp .env.production .env

# 2. Edit .env - Add your API keys
nano .env
# Required: OPENAI_API_KEY, OPENQA_JWT_SECRET, SAAS_URL

# 3. Start with Docker Compose
docker-compose -f docker-compose.production.yml up -d

# 4. Access at http://localhost:4242
```

**With HTTPS (Nginx):**
```bash
# Update nginx.conf with your domain
nano nginx.conf

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Start with Nginx
docker-compose -f docker-compose.production.yml --profile with-nginx up -d
```

### Cloud Platforms

**Railway:**
```bash
railway init && railway up
# Set env vars in dashboard: OPENAI_API_KEY, OPENQA_JWT_SECRET, SAAS_URL
```

**Render:**
- Fork repo → Connect to Render → Auto-deploys with `render.yaml`

**Fly.io:**
```bash
flyctl launch
flyctl secrets set OPENAI_API_KEY=sk-xxx OPENQA_JWT_SECRET=$(openssl rand -hex 32)
flyctl deploy
```

### VPS/Bare Metal

```bash
# Automated installer
curl -fsSL https://openqa.orkajs.com/install-production.sh | bash
# Choose option 2 (VPS/Bare Metal)
```

**Manual installation:**
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential git

# Install OpenQA
sudo useradd -r -m openqa
sudo -u openqa git clone https://github.com/Orka-Community/OpenQA.git /opt/openqa
cd /opt/openqa
sudo -u openqa npm ci --only=production
sudo -u openqa npm run build

# Configure
sudo -u openqa cp .env.production .env
sudo nano /opt/openqa/.env

# Install systemd service
sudo cp openqa.service /etc/systemd/system/
sudo systemctl enable openqa
sudo systemctl start openqa
```

### 🔒 Security Checklist

Before going live:

- [ ] Set strong `OPENQA_JWT_SECRET` (generate: `openssl rand -hex 32`)
- [ ] Use strong admin password (min 12 chars)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Never set `OPENQA_AUTH_DISABLED=true` in production
- [ ] Set `NODE_ENV=production`
- [ ] Restrict CORS origins
- [ ] Enable firewall (ports 80, 443 only)
- [ ] Setup automated backups

### 📚 Deployment Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete deployment guide
- **[QUICKSTART-PRODUCTION.md](./QUICKSTART-PRODUCTION.md)** - 5-minute quick start
- **[Docker Compose](./docker-compose.production.yml)** - Production configuration
- **[Systemd Service](./openqa.service)** - Service configuration

### Development Deployment

For local development only:

```bash
docker-compose up -d
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests
npm test
```

## 📝 Architecture

```
openqa/
├── agent/
│   ├── brain/         # 🧠 Autonomous thinking & test generation
│   ├── tools/         # Browser, GitHub, Kanban tools
│   ├── config/        # SaaS configuration
│   └── webhooks/      # Git listener (GitHub/GitLab)
├── cli/               # CLI commands
├── database/          # SQLite database
└── data/
    ├── workspace/     # Cloned repos
    └── generated-tests/ # Tests created by Brain
```

## 🔌 API Reference

### SaaS Configuration
- `GET /api/saas-config` - Get current config
- `POST /api/saas-config` - Full configuration
- `POST /api/saas-config/quick` - Quick setup (name, description, url)
- `POST /api/saas-config/directive` - Add directive
- `POST /api/saas-config/repository` - Set repo URL
- `POST /api/saas-config/local-path` - Set local path

### Brain Control
- `POST /api/brain/analyze` - Analyze app, get suggestions
- `POST /api/brain/run` - Start autonomous session
- `POST /api/brain/generate-test` - Generate specific test
- `POST /api/brain/create-agent` - Create custom agent
- `POST /api/brain/run-test/:id` - Execute a test

### Data
- `GET /api/status` - Agent status
- `GET /api/tests` - Generated tests
- `GET /api/dynamic-agents` - Created agents
- `GET /api/sessions` - Test sessions
- `GET /api/bugs` - Found bugs
- `GET /api/kanban/tickets` - Kanban board

### WebSocket (ws://localhost:3000)
- `test-generated` - New test created
- `agent-created` - New agent created
- `test-started/completed` - Test lifecycle
- `thinking` - Brain's current thought
- `analysis-complete` - Analysis finished
- `session-complete` - Session finished
- `git-merge` - Merge detected
- `git-pipeline-success` - Deploy detected

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

## 📄 License

MIT

## 🙏 Credits

Built with:
- [Orka.js](https://orkajs.dev) - AI framework
- [Playwright](https://playwright.dev) - Browser automation
- [Next.js](https://nextjs.org) - Web interface
- [SQLite](https://sqlite.org) - Database

---

Made with ❤️ by the Orka.js team
