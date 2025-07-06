const WebSocket = require('ws');
const fetch = require('node-fetch');

// Create WebSocket server on port 3001
const wss = new WebSocket.Server({ port: 3001 });

console.log('WebSocket proxy server started on ws://localhost:3001');

wss.on('connection', async (clientWs, request) => {
  console.log('New WebSocket connection from client');
  
  try {
    // Extract sessionId from query parameters
    const url = new URL(request.url, 'http://localhost:3001');
    const sessionId = url.searchParams.get('sessionId');
    
    if (!sessionId) {
      console.error('No sessionId provided');
      clientWs.close(1002, 'Missing sessionId');
      return;
    }
    
    console.log('Session ID:', sessionId);
    
    // Get session data from Convex (you'll need to implement this endpoint)
    // For now, we'll use hardcoded values
    const daytonaWsUrl = 'wss://3456-1ab38046-178e-400d-b674-f4a4601b84a0.proxy.daytona.work';
    const authCookie = 'daytona-sandbox-auth-1ab38046-178e-400d-b674-f4a4601b84a0=MTc1MTgzNjUwNXxKd3dBSkRGaFlqTTRNRFEyTFRFM09HVXROREF3WkMxaU5qYzBMV1kwWVRRMk1ERmlPRFJoTUE9PXzPfJi78iqXYuFCjyh58z3pqdUovApl4NCXNwPZXdrCwA%3D%3D';
    
    console.log('Connecting to Daytona WebSocket with auth cookie...');
    
    // Create WebSocket connection to Daytona with authentication
    const daytonaWs = new WebSocket(daytonaWsUrl, {
      headers: {
        'Cookie': authCookie,
        'User-Agent': 'Oscar-WebSocket-Proxy/1.0'
      }
    });
    
    // Handle Daytona WebSocket events
    daytonaWs.on('open', () => {
      console.log('Connected to Daytona WebSocket');
    });
    
    daytonaWs.on('message', (data) => {
      // Forward messages from Daytona to client
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    });
    
    daytonaWs.on('close', (code, reason) => {
      console.log('Daytona WebSocket closed:', code, reason.toString());
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(code, reason);
      }
    });
    
    daytonaWs.on('error', (error) => {
      console.error('Daytona WebSocket error:', error);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(1011, 'Upstream error');
      }
    });
    
    // Handle client WebSocket events
    clientWs.on('message', (data) => {
      // Forward messages from client to Daytona
      if (daytonaWs.readyState === WebSocket.OPEN) {
        daytonaWs.send(data);
      }
    });
    
    clientWs.on('close', () => {
      console.log('Client WebSocket closed');
      if (daytonaWs.readyState === WebSocket.OPEN) {
        daytonaWs.close();
      }
    });
    
    clientWs.on('error', (error) => {
      console.error('Client WebSocket error:', error);
      if (daytonaWs.readyState === WebSocket.OPEN) {
        daytonaWs.close();
      }
    });
    
  } catch (error) {
    console.error('Error setting up WebSocket proxy:', error);
    clientWs.close(1011, 'Proxy setup error');
  }
});