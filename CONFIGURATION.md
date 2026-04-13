# Configuration Guide

OpenQA supports **two configuration methods** that work together:

## 🎯 Configuration Priority

```
Database Config (Web UI) > Environment Variables > Defaults
```

The system merges configurations with this priority order:
1. **Database** (set via web interface) - **Highest priority**
2. **Environment variables** (docker-compose.yml or .env)
3. **Built-in defaults**

---

## 📋 Configuration Methods

### **Method 1: Web Interface Only** (Recommended for Development/Demo)

**Use Case**: Quick start, demos, local development

**docker-compose.yml**:
```yaml
services:
  openqa:
    build: .
    ports:
      - "4242:4242"
    environment:
      - NODE_ENV=production
      - WEB_PORT=4242
      - WEB_HOST=0.0.0.0
      - DB_PATH=/data/openqa.json
    volumes:
      - openqa-data:/data
    restart: unless-stopped
```

**Steps**:
1. Start the container: `docker-compose up -d`
2. Open http://localhost:4242
3. Complete setup wizard (create admin account)
4. Go to **Config** page
5. Enter your API keys and settings
6. Click **Save**

**Pros**:
- ✅ No `.env` file needed
- ✅ Configuration via UI at http://localhost:4242/config
- ✅ Changes without Docker rebuild
- ✅ Perfect for demos/showcases

**Cons**:
- ❌ Manual configuration after each deployment
- ❌ Config lost if volume is deleted
- ❌ Not suitable for automated deployments

---

### **Method 2: Environment Variables + Web UI** (Recommended for Production)

**Use Case**: Production deployments, CI/CD, automated setups

**docker-compose.yml** (or use `docker-compose.simple.yml`):
```yaml
services:
  openqa:
    build: .
    ports:
      - "4242:4242"
    environment:
      # Core settings
      - NODE_ENV=production
      - WEB_PORT=4242
      - DB_PATH=/data/openqa.json
      
      # LLM (can be overridden via UI)
      - LLM_PROVIDER=${LLM_PROVIDER:-openai}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      
      # Target application (can be overridden via UI)
      - SAAS_URL=${SAAS_URL}
      - SAAS_AUTH_TYPE=${SAAS_AUTH_TYPE:-none}
      
      # GitHub integration (optional)
      - GITHUB_TOKEN=${GITHUB_TOKEN}
      - GITHUB_OWNER=${GITHUB_OWNER}
      - GITHUB_REPO=${GITHUB_REPO}
    volumes:
      - openqa-data:/data
```

**.env file**:
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
SAAS_URL=https://your-app.com
GITHUB_TOKEN=ghp_your-token
GITHUB_OWNER=your-org
GITHUB_REPO=your-repo
```

**Pros**:
- ✅ Default configuration versioned
- ✅ Can be overridden via UI
- ✅ Automated deployment support
- ✅ Secrets via secure environment variables

**Cons**:
- ❌ Requires `.env` file or CI/CD secrets
- ❌ Docker rebuild needed to change env vars

---

## 🔧 Available Configuration Options

### **LLM Settings**
- `LLM_PROVIDER` - openai, anthropic, ollama
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key
- `OLLAMA_BASE_URL` - Ollama server URL
- `LLM_MODEL` - Model name (gpt-4, claude-3-5-sonnet, etc.)

### **Target Application**
- `SAAS_URL` - Application URL to test
- `SAAS_AUTH_TYPE` - none, basic, oauth, session
- `SAAS_USERNAME` - Username for basic auth
- `SAAS_PASSWORD` - Password for basic auth

### **GitHub Integration**
- `GITHUB_TOKEN` - GitHub personal access token
- `GITHUB_OWNER` - Repository owner
- `GITHUB_REPO` - Repository name

### **Agent Behavior**
- `AGENT_INTERVAL_MS` - Time between test sessions (default: 3600000 = 1 hour)
- `AGENT_MAX_ITERATIONS` - Max iterations per session (default: 20)
- `AGENT_AUTO_START` - Auto-start agent on launch (default: false)

### **Web Server**
- `WEB_PORT` - Web UI port (default: 4242)
- `WEB_HOST` - Bind address (default: 0.0.0.0)

### **Database**
- `DB_PATH` - Database file path (default: ./data/openqa.json)

### **Notifications** (Optional)
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications
- `DISCORD_WEBHOOK_URL` - Discord webhook for notifications

---

## 🚀 Quick Start Examples

### **Example 1: Minimal Setup (Web UI Config)**

```bash
# No .env file needed
docker-compose up -d

# Then configure via http://localhost:4242/config
```

### **Example 2: Pre-configured Setup**

```bash
# Create .env file
cat > .env << EOF
OPENAI_API_KEY=sk-your-key-here
SAAS_URL=https://orkajs.com
EOF

# Start with pre-configured settings
docker-compose up -d

# Settings can still be changed via UI
```

### **Example 3: Production Deployment**

```bash
# Use docker-compose.simple.yml with secrets
docker-compose -f docker-compose.simple.yml up -d
```

---

## 🔄 Changing Configuration

### **Via Web Interface**
1. Go to http://localhost:4242/config
2. Update settings
3. Click **Save**
4. Changes take effect immediately (no restart needed)

### **Via Environment Variables**
1. Update `.env` file or docker-compose.yml
2. Restart container: `docker-compose restart`
3. Changes take effect after restart

### **Via Environment Variables Page**
1. Go to http://localhost:4242/config/env
2. Add/update environment variables
3. Changes take effect immediately for new sessions

---

## 🔐 Security Best Practices

1. **Never commit API keys** to version control
2. Use `.env` file (add to `.gitignore`)
3. For production, use Docker secrets or CI/CD secrets
4. Set `OPENQA_JWT_SECRET` for production deployments
5. Use strong admin passwords

---

## 📝 Notes

- **Database config overrides env vars**: If you set an API key via the web UI, it will be used instead of the env var
- **Env vars are defaults**: They provide initial values but can be changed via UI
- **Volume persistence**: Database config is stored in the Docker volume and persists across restarts
- **No restart needed**: Changes via web UI take effect immediately for new sessions
