const express = require('express');
const WebSocket = require('ws');
const pty = require('node-pty');
const http = require('http');

const app = express();
const PORT = 3456;

// Parse JSON bodies
app.use(express.json());

// Store active terminal sessions
const sessions = new Map();

// Function to create a new terminal session
function createTerminalSession(sessionId = 'default') {
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

  const session = {
    ptyProcess,
    clients: new Set(),
    buffer: [] // Store recent output for new connections
  };

  // Handle terminal output
  ptyProcess.onData((data) => {
    // Add to buffer (keep last 1000 lines)
    session.buffer.push({ type: 'output', data, timestamp: Date.now() });
    if (session.buffer.length > 1000) {
      session.buffer.shift();
    }

    // Send to all connected WebSocket clients
    const message = JSON.stringify({ type: 'output', data });
    session.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  // Auto-run claude command when terminal starts
  setTimeout(() => {
    ptyProcess.write('claude\r');
  }, 1000);

  // Handle process exit
  ptyProcess.onExit((code, signal) => {
    const exitMessage = JSON.stringify({ type: 'exit', code, signal });
    session.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(exitMessage);
      }
    });

    // Clean up session after a delay
    setTimeout(() => {
      sessions.delete(sessionId);
    }, 5000);
  });

  sessions.set(sessionId, session);
  return session;
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    sessions: sessions.size,
    uptime: process.uptime()
  });
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  path: '/terminal-stream'
});

wss.on('connection', (ws) => {
  console.log('WebSocket connection established');
  
  // Get or create terminal session
  const sessionId = 'default'; // For now, use default session
  let session = sessions.get(sessionId);
  
  if (!session) {
    session = createTerminalSession(sessionId);
  }

  // Add client to session
  session.clients.add(ws);

  // Send recent buffer to new client
  session.buffer.forEach(item => {
    ws.send(JSON.stringify(item));
  });

  // Send connection confirmation
  ws.send(JSON.stringify({ type: 'connected' }));

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'input') {
        session.ptyProcess.write(data.data);
      } else if (data.type === 'resize') {
        session.ptyProcess.resize(data.cols, data.rows);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    session.clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    session.clients.delete(ws);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Claude Code Web Interface running on port ${PORT}`);
  console.log('WebSocket endpoint: ws://localhost:' + PORT + '/terminal-stream');
});