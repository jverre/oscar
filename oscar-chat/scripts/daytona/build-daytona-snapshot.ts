#!/usr/bin/env node
/**
 * Build a Daytona Snapshot with Node.js and Claude Code pre-installed
 * This snapshot can be reused for faster deployments
 */

import * as fs from 'fs';
import * as path from 'path';
import { Daytona, Image } from '@daytonaio/sdk';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local if it exists
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("Loaded environment variables from .env.local");
}

async function buildSnapshot(): Promise<void> {
  console.log("Initializing Daytona client...");
  
  if (!process.env.DAYTONA_API_KEY) {
    throw new Error("DAYTONA_API_KEY not found in environment variables. Please set it in .env.local");
  }
  
  const daytona = new Daytona({
    apiKey: process.env.DAYTONA_API_KEY,
    ...(process.env.DAYTONA_BASE_URL && { apiUrl: process.env.DAYTONA_BASE_URL })
  });
  
  try {
    // Generate a unique name for the image
    const snapshotName = `claude-code-oscar:${Date.now()}`;
    console.log(`Creating Snapshot with name: ${snapshotName}`);
    
    // Simplified setup script
    const setupScriptPath = 'setup-claude-code.sh';
    const setupScriptContent = `#!/bin/bash
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
`;
    
    fs.writeFileSync(setupScriptPath, setupScriptContent);
    
    // Create the image with minimal operations
    const image = Image.debianSlim('3.12')
      .addLocalFile(setupScriptPath, '/tmp/setup-claude-code.sh')
      .runCommands(
        'chmod +x /tmp/setup-claude-code.sh',
        '/tmp/setup-claude-code.sh'
      )
      // Add terminal server files
      .addLocalFile(path.join(__dirname, 'server.js'), '/workspace/server.js')
      .addLocalFile(path.join(__dirname, 'package.json'), '/workspace/package.json')
      .runCommands('cd /workspace && npm install --production')
      .workdir('/workspace')
      .env({
        NODE_ENV: 'production',
        TERM: 'xterm-256color'
      });
    
    // Create the Snapshot
    console.log(`\n=== Creating Snapshot: ${snapshotName} ===\n`);
    await daytona.snapshot.create(
      {
        name: snapshotName,
        image,
        resources: {
          cpu: 1,
          memory: 2,
          disk: 4,
        },
      },
      {
        onLogs: (log) => {
          process.stdout.write(log);
          process.stdout.write("\n");
        },
      },
    );
    
    console.log(`\n✅ Snapshot created successfully: ${snapshotName}`);
    
    // Clean up
    fs.unlinkSync(setupScriptPath);
    
  } catch (error) {
    console.error(`\n❌ Snapshot creation failed: ${error}`);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  buildSnapshot()
    .then(() => {
      console.log("\n🎉 Snapshot build completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Snapshot build failed:", error);
      process.exit(1);
    });
}

export { buildSnapshot };