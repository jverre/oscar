const express = require('express');
const WebSocket = require('ws');
const pty = require('node-pty');
const path = require('path');

const app = express();
const PORT = 3456;

// Serve static files
app.use(express.static('public'));

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`Claude Code Web Interface running on port ${PORT}`);
});

// Create WebSocket server
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  // Spawn shell instead of Claude Code directly
  console.log('Spawning shell process...');
  const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: process.cwd(),
    env: {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor'
    }
  });
  
  console.log('Shell process spawned with PID:', ptyProcess.pid);

  // Send terminal output to browser
  ptyProcess.onData((data) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'output', data }));
    }
  });

  // Auto-run claude command when terminal starts
  setTimeout(() => {
    ptyProcess.write('claude\r');
  }, 1000); // Wait 1 second for shell to be ready

  // Handle process exit
  ptyProcess.onExit((code, signal) => {
    console.log(`Shell process exited with code: ${code}, signal: ${signal}`);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'exit', code, signal }));
    }
  });

  // Handle incoming messages from browser
  ws.on('message', (message) => {
    try {
      const parsed = JSON.parse(message);
      
      if (parsed.type === 'input') {
        ptyProcess.write(parsed.data);
      } else if (parsed.type === 'resize') {
        ptyProcess.resize(parsed.cols, parsed.rows);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });

  // Clean up on disconnect
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    ptyProcess.kill();
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    ptyProcess.kill();
  });
});

console.log('WebSocket server ready for connections');