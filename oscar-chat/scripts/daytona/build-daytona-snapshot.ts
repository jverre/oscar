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
    
    // Create a setup script that will be added to the image
    const setupScriptPath = 'setup-claude-code.sh';
    const setupScriptContent = `#!/bin/bash
set -e

echo "Setting up Claude Code Web environment..."

# Update package lists
apt-get update

# Install build essentials and Python (needed for node-pty)
apt-get install -y build-essential python3-dev curl git

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify installations
node --version
npm --version

# Install Claude Code globally
npm install -g @anthropic-ai/claude-code

# Create workspace directory
mkdir -p /workspace

# Create startup script for web terminal
cat > /workspace/start-terminal.sh << 'EOF'
#!/bin/bash
cd /workspace
npm start
EOF

chmod +x /workspace/start-terminal.sh

echo "Claude Code Web environment setup complete!"
echo "To start the web terminal, run: /workspace/start-terminal.sh"
`;
    
    fs.writeFileSync(setupScriptPath, setupScriptContent);
    
    // Create the image with all necessary dependencies
    const image = Image.debianSlim('3.12')
      .addLocalFile(setupScriptPath, '/tmp/setup-claude-code.sh')
      .runCommands(
        'chmod +x /tmp/setup-claude-code.sh',
        '/tmp/setup-claude-code.sh',
        'rm /tmp/setup-claude-code.sh'
      )
      // Add web terminal server files
      .addLocalFile(path.join(__dirname, 'server.js'), '/workspace/server.js')
      .addLocalFile(path.join(__dirname, 'package.json'), '/workspace/package.json')
      .addLocalFile(path.join(__dirname, 'public/index.html'), '/workspace/public/index.html')
      .addLocalFile(path.join(__dirname, 'public/client.js'), '/workspace/public/client.js')
      // Install web terminal dependencies
      .runCommands(
        'cd /workspace && npm install',
        'echo "Web terminal server installed successfully"'
      )
      .workdir('/workspace')
      .env({
        NODE_ENV: 'production',
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor'
      });
    
    // Create the Snapshot and stream the build logs
    console.log(`\n=== Creating Snapshot: ${snapshotName} ===\n`);
    await daytona.snapshot.create(
      {
        name: snapshotName,
        image,
        resources: {
          cpu: 2,
          memory: 4,
          disk: 8,
        },
      },
      {
        onLogs: (log) => {
          // Print logs as they come in
          process.stdout.write(log);
          process.stdout.write("\n");
        },
      },
    );
    
    console.log(`\n✅ Snapshot created successfully: ${snapshotName}`);
    console.log("\nYou can now use this snapshot for faster deployments:");
    console.log(`  Snapshot name: ${snapshotName}`);
    console.log("\nTo test the snapshot, create a sandbox:");
    console.log(`  const sandbox = await daytona.create({ snapshot: '${snapshotName}' })`);
    
    // Clean up local setup script
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