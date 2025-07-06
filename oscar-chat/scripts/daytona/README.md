# Daytona Snapshot Builder

This directory contains the scripts and files needed to build Daytona snapshots with Claude Code and a web terminal interface pre-installed.

## Files

- `build-daytona-snapshot.ts` - Script to build a Daytona snapshot
- `server.js` - Express server that provides web terminal access
- `package.json` - Dependencies for the web terminal server
- `public/` - Frontend files for the web terminal
  - `index.html` - Web terminal HTML page
  - `client.js` - WebSocket client for terminal communication

## Building a Snapshot

From the oscar-chat root directory:

```bash
npm run build:daytona:snapshot
```

This will create a snapshot that includes:
- Debian Slim base image
- Node.js 20.x and npm
- Claude Code CLI (globally installed)
- Web terminal server with all dependencies
- A startup script at `/workspace/start-terminal.sh`

## What Gets Installed

The snapshot includes everything needed to run Claude Code through a web interface:
1. System dependencies (build tools, Python, Git)
2. Node.js and npm
3. Claude Code CLI
4. Web terminal server (Express + WebSocket + xterm.js)
5. All npm dependencies pre-installed

## Using the Snapshot

When a sandbox is created from this snapshot:
1. Everything is pre-installed and ready to use
2. To start the web terminal: run `/workspace/start-terminal.sh`
3. Access the terminal at `http://localhost:3456`
4. Claude Code will automatically start when you connect