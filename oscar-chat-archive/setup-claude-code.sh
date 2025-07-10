#!/bin/bash
set -e

echo "Setting up Claude Code environment..."

# Update and install essentials
apt-get update
apt-get install -y curl git

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Create workspace
mkdir -p /workspace

echo "Setup complete!"
