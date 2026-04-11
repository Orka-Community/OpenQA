#!/bin/bash

set -e

INSTALL_DIR="${INSTALL_DIR:-$HOME/.openqa}"
BIN_DIR="${BIN_DIR:-/usr/local/bin}"
VERSION="${VERSION:-latest}"

echo "🦦 OpenQA Installer"
echo "==================="
echo ""

check_dependencies() {
    echo "📦 Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed"
        echo "Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 20 ]; then
        echo "❌ Node.js version must be 20 or higher (found: $(node -v))"
        echo "   Please install Node.js 20+ from https://nodejs.org"
        exit 1
    fi
    
    echo "✅ Node.js $(node -v) found"
    
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed"
        exit 1
    fi
    
    echo "✅ npm $(npm -v) found"
}

download_openqa() {
    echo ""
    echo "📥 Downloading OpenQA..."
    
    if [ -d "$INSTALL_DIR" ]; then
        echo "⚠️  OpenQA is already installed at $INSTALL_DIR"
        read -p "Do you want to reinstall? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Installation cancelled"
            exit 0
        fi
        rm -rf "$INSTALL_DIR"
    fi
    
    mkdir -p "$INSTALL_DIR"
    
    if [ "$VERSION" = "latest" ]; then
        DOWNLOAD_URL="https://github.com/Orka-Community/OpenQA/archive/refs/heads/main.tar.gz"
    else
        DOWNLOAD_URL="https://github.com/Orka-Community/OpenQA/archive/refs/tags/v${VERSION}.tar.gz"
    fi
    
    if command -v curl &> /dev/null; then
        curl -fsSL "$DOWNLOAD_URL" | tar -xz -C "$INSTALL_DIR" --strip-components=1
    elif command -v wget &> /dev/null; then
        wget -qO- "$DOWNLOAD_URL" | tar -xz -C "$INSTALL_DIR" --strip-components=1
    else
        echo "❌ Neither curl nor wget found. Please install one of them."
        exit 1
    fi
    
    echo "✅ Downloaded OpenQA"
}

install_dependencies() {
    echo ""
    echo "📦 Installing dependencies..."
    
    cd "$INSTALL_DIR"
    npm install --production --silent
    
    echo "✅ Dependencies installed"
}

build_openqa() {
    echo ""
    echo "🔨 Building OpenQA..."
    
    cd "$INSTALL_DIR"
    npm run build
    
    echo "✅ Build complete"
}

setup_cli() {
    echo ""
    echo "🔗 Setting up CLI..."
    
    if [ -w "$BIN_DIR" ]; then
        ln -sf "$INSTALL_DIR/dist/cli/index.js" "$BIN_DIR/openqa"
        chmod +x "$BIN_DIR/openqa"
        echo "✅ CLI installed to $BIN_DIR/openqa"
    else
        echo "⚠️  Cannot write to $BIN_DIR (requires sudo)"
        echo "Run this command manually:"
        echo "  sudo ln -sf $INSTALL_DIR/dist/cli/index.js $BIN_DIR/openqa"
        echo "  sudo chmod +x $BIN_DIR/openqa"
    fi
}

create_config() {
    echo ""
    echo "⚙️  Creating configuration..."
    
    cd "$INSTALL_DIR"
    
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "✅ Created .env file"
        echo ""
        echo "📝 Please edit $INSTALL_DIR/.env with your settings:"
        echo "   - LLM API keys (OpenAI, Anthropic, or Ollama)"
        echo "   - Target SaaS URL"
        echo "   - GitHub token (optional)"
    else
        echo "⚠️  .env already exists, skipping"
    fi
    
    mkdir -p "$INSTALL_DIR/data"
    mkdir -p "$INSTALL_DIR/data/screenshots"
}

print_success() {
    echo ""
    echo "✅ OpenQA installed successfully!"
    echo ""
    echo "📍 Installation directory: $INSTALL_DIR"
    echo ""
    echo "🚀 Next steps:"
    echo ""
    echo "1. Configure OpenQA:"
    echo "   Edit $INSTALL_DIR/.env with your API keys"
    echo "   Or use the web interface after starting"
    echo ""
    echo "2. Start OpenQA:"
    echo "   openqa start"
    echo ""
    echo "3. Access web interfaces:"
    echo "   Dashboard:    http://localhost:4242"
    echo "   Kanban:       http://localhost:4242/kanban"
    echo "   Config:       http://localhost:4242/config"
    echo "   Environment:  http://localhost:4242/config/env"
    echo ""
    echo "4. First-time setup:"
    echo "   Visit http://localhost:4242/setup"
    echo "   Create your admin account"
    echo ""
    echo "📖 Documentation: https://github.com/Orka-Community/OpenQA"
    echo "💬 Discord: https://discord.com/invite/DScfpuPysP"
    echo ""
    echo "⚠️  Security: Never disable authentication in production!"
    echo ""
}

main() {
    check_dependencies
    download_openqa
    install_dependencies
    build_openqa
    setup_cli
    create_config
    print_success
}

main
