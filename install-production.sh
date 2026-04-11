#!/bin/bash
# OpenQA Production Installer
# Usage: curl -fsSL https://openqa.orkajs.com/install-production.sh | bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════╗"
echo "║   OpenQA Production Installer v2.0        ║"
echo "║   Autonomous QA Testing Agent             ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${RED}❌ Do not run this script as root${NC}"
    echo "   Run as a regular user with sudo privileges"
    exit 1
fi

# Detect deployment method
echo -e "${BLUE}🔍 Choose deployment method:${NC}"
echo "1) Docker (Recommended - Easiest)"
echo "2) VPS/Bare Metal (Systemd service)"
echo "3) Cloud Platform (Railway/Render/Fly.io)"
read -p "Enter choice [1-3]: " DEPLOY_METHOD

case $DEPLOY_METHOD in
    1)
        echo -e "${GREEN}✓ Docker deployment selected${NC}"
        INSTALL_TYPE="docker"
        ;;
    2)
        echo -e "${GREEN}✓ VPS/Bare Metal deployment selected${NC}"
        INSTALL_TYPE="systemd"
        ;;
    3)
        echo -e "${GREEN}✓ Cloud platform deployment selected${NC}"
        INSTALL_TYPE="cloud"
        ;;
    *)
        echo -e "${RED}❌ Invalid choice${NC}"
        exit 1
        ;;
esac

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Docker installation
install_docker() {
    echo -e "${BLUE}📦 Installing Docker...${NC}"
    
    if command_exists docker; then
        echo -e "${GREEN}✓ Docker already installed${NC}"
    else
        curl -fsSL https://get.docker.com | sh
        sudo usermod -aG docker $USER
        echo -e "${YELLOW}⚠️  Please log out and back in for Docker permissions${NC}"
    fi
    
    if command_exists docker-compose; then
        echo -e "${GREEN}✓ Docker Compose already installed${NC}"
    else
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
}

# Node.js installation
install_nodejs() {
    echo -e "${BLUE}📦 Installing Node.js 20...${NC}"
    
    if command_exists node; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 20 ]; then
            echo -e "${GREEN}✓ Node.js $(node -v) already installed${NC}"
            return
        fi
    fi
    
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
}

# Download OpenQA
download_openqa() {
    INSTALL_DIR="${1:-$HOME/openqa}"
    
    echo -e "${BLUE}📥 Downloading OpenQA to $INSTALL_DIR...${NC}"
    
    if [ -d "$INSTALL_DIR" ]; then
        echo -e "${YELLOW}⚠️  Directory exists. Remove it? (y/N)${NC}"
        read -p "> " REMOVE
        if [[ $REMOVE =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
        else
            echo "Installation cancelled"
            exit 0
        fi
    fi
    
    git clone https://github.com/Orka-Community/OpenQA.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
}

# Configure environment
configure_env() {
    echo -e "${BLUE}⚙️  Configuring environment...${NC}"
    
    cp .env.production .env
    
    # Generate JWT secret
    JWT_SECRET=$(openssl rand -hex 32)
    
    echo -e "${YELLOW}📝 Please provide the following information:${NC}"
    
    # LLM Provider
    echo ""
    echo "1) OpenAI"
    echo "2) Anthropic (Claude)"
    echo "3) Ollama (Self-hosted)"
    read -p "LLM Provider [1-3]: " LLM_CHOICE
    
    case $LLM_CHOICE in
        1)
            LLM_PROVIDER="openai"
            read -p "OpenAI API Key: " OPENAI_KEY
            sed -i "s/^OPENAI_API_KEY=.*/OPENAI_API_KEY=$OPENAI_KEY/" .env
            ;;
        2)
            LLM_PROVIDER="anthropic"
            read -p "Anthropic API Key: " ANTHROPIC_KEY
            sed -i "s/^ANTHROPIC_API_KEY=.*/ANTHROPIC_API_KEY=$ANTHROPIC_KEY/" .env
            ;;
        3)
            LLM_PROVIDER="ollama"
            read -p "Ollama URL [http://localhost:11434]: " OLLAMA_URL
            OLLAMA_URL=${OLLAMA_URL:-http://localhost:11434}
            sed -i "s|^OLLAMA_BASE_URL=.*|OLLAMA_BASE_URL=$OLLAMA_URL|" .env
            ;;
    esac
    
    sed -i "s/^LLM_PROVIDER=.*/LLM_PROVIDER=$LLM_PROVIDER/" .env
    
    # Target application
    echo ""
    read -p "Target application URL (e.g., https://my-app.com): " SAAS_URL
    sed -i "s|^SAAS_URL=.*|SAAS_URL=$SAAS_URL|" .env
    
    # JWT Secret
    sed -i "s/^OPENQA_JWT_SECRET=.*/OPENQA_JWT_SECRET=$JWT_SECRET/" .env
    
    # Domain (optional)
    echo ""
    read -p "Domain name (optional, for HTTPS): " DOMAIN
    if [ -n "$DOMAIN" ]; then
        sed -i "s/your-domain.com/$DOMAIN/g" nginx.conf
    fi
    
    echo -e "${GREEN}✓ Environment configured${NC}"
}

# Docker deployment
deploy_docker() {
    echo -e "${BLUE}🐳 Deploying with Docker...${NC}"
    
    install_docker
    download_openqa "$HOME/openqa"
    configure_env
    
    echo -e "${BLUE}🚀 Starting OpenQA...${NC}"
    docker-compose -f docker-compose.production.yml up -d
    
    echo -e "${GREEN}✓ OpenQA started successfully!${NC}"
    echo ""
    echo -e "${BLUE}📍 Access OpenQA:${NC}"
    echo "   http://localhost:4242"
    echo ""
    echo -e "${YELLOW}🔐 First-time setup:${NC}"
    echo "   1. Visit http://localhost:4242"
    echo "   2. Create admin account"
    echo "   3. Configure your application"
    echo ""
    echo -e "${BLUE}📊 View logs:${NC}"
    echo "   docker-compose -f docker-compose.production.yml logs -f"
}

# Systemd deployment
deploy_systemd() {
    echo -e "${BLUE}🖥️  Deploying with Systemd...${NC}"
    
    # Install dependencies
    sudo apt update
    install_nodejs
    sudo apt install -y build-essential python3 git nginx certbot python3-certbot-nginx
    
    # Create user
    if ! id -u openqa >/dev/null 2>&1; then
        sudo useradd -r -m -s /bin/bash openqa
    fi
    
    # Download and build
    sudo -u openqa bash << 'EOF'
cd /opt
if [ -d openqa ]; then
    rm -rf openqa
fi
git clone https://github.com/Orka-Community/OpenQA.git openqa
cd openqa
npm ci --only=production
npm run build
mkdir -p data
EOF
    
    # Configure
    cd /opt/openqa
    sudo -u openqa cp .env.production .env
    
    echo -e "${YELLOW}📝 Configure /opt/openqa/.env manually${NC}"
    echo "   sudo nano /opt/openqa/.env"
    echo ""
    read -p "Press Enter when done..."
    
    # Install service
    sudo cp openqa.service /etc/systemd/system/
    sudo systemctl daemon-reload
    sudo systemctl enable openqa
    sudo systemctl start openqa
    
    echo -e "${GREEN}✓ OpenQA service started${NC}"
    echo ""
    echo -e "${BLUE}📊 Check status:${NC}"
    echo "   sudo systemctl status openqa"
    echo "   sudo journalctl -u openqa -f"
}

# Cloud deployment
deploy_cloud() {
    echo -e "${BLUE}☁️  Cloud Platform Deployment${NC}"
    echo ""
    echo "Choose your platform:"
    echo "1) Railway"
    echo "2) Render"
    echo "3) Fly.io"
    read -p "Platform [1-3]: " CLOUD_PLATFORM
    
    download_openqa "$HOME/openqa"
    
    case $CLOUD_PLATFORM in
        1)
            echo -e "${BLUE}🚂 Railway Deployment${NC}"
            echo ""
            echo "1. Install Railway CLI:"
            echo "   npm install -g @railway/cli"
            echo ""
            echo "2. Login:"
            echo "   railway login"
            echo ""
            echo "3. Deploy:"
            echo "   cd $HOME/openqa"
            echo "   railway init"
            echo "   railway up"
            echo ""
            echo "4. Set environment variables in Railway dashboard"
            ;;
        2)
            echo -e "${BLUE}🎨 Render Deployment${NC}"
            echo ""
            echo "1. Push code to GitHub"
            echo "2. Create Web Service on Render"
            echo "3. Connect repository"
            echo "4. Set build/start commands:"
            echo "   Build: npm ci && npm run build"
            echo "   Start: node dist/cli/index.js start"
            echo "5. Add environment variables from .env.production"
            ;;
        3)
            echo -e "${BLUE}🪰 Fly.io Deployment${NC}"
            echo ""
            echo "1. Install flyctl:"
            echo "   curl -L https://fly.io/install.sh | sh"
            echo ""
            echo "2. Login:"
            echo "   flyctl auth login"
            echo ""
            echo "3. Deploy:"
            echo "   cd $HOME/openqa"
            echo "   flyctl launch"
            echo "   flyctl secrets set OPENAI_API_KEY=sk-xxx"
            echo "   flyctl secrets set OPENQA_JWT_SECRET=\$(openssl rand -hex 32)"
            echo "   flyctl deploy"
            ;;
    esac
    
    echo ""
    echo -e "${YELLOW}📖 See DEPLOYMENT.md for detailed instructions${NC}"
}

# Main installation flow
case $INSTALL_TYPE in
    docker)
        deploy_docker
        ;;
    systemd)
        deploy_systemd
        ;;
    cloud)
        deploy_cloud
        ;;
esac

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Installation Complete!               ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "   https://github.com/Orka-Community/OpenQA"
echo ""
echo -e "${BLUE}🆘 Support:${NC}"
echo "   Discord: https://discord.com/invite/DScfpuPysP"
echo ""
echo -e "${YELLOW}⚠️  Security Reminders:${NC}"
echo "   • Use strong admin password"
echo "   • Enable HTTPS in production"
echo "   • Never disable authentication"
echo "   • Keep JWT secret secure"
echo ""
