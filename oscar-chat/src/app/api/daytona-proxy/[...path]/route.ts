import { NextRequest } from 'next/server';
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  console.log(`=== DAYTONA PROXY SUB-PATH REQUEST ===`);
  console.log(`Request URL: ${request.url}`);
  console.log(`Path segments:`, params.path);
  console.log(`Query params:`, Object.fromEntries(request.nextUrl.searchParams.entries()));
  
  try {
    // Get auth token from header or query parameter (for iframe usage)
    let token = '';
    const authHeader = request.headers.get('authorization');
    const tokenParam = request.nextUrl.searchParams.get('token');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7); // Remove 'Bearer ' prefix
    } else if (tokenParam) {
      token = tokenParam;
    } else {
      return new Response('Unauthorized - Missing auth token', { status: 401 });
    }

    // Verify token with Convex by attempting to get current user
    const user = await fetchQuery(api.users.current, {}, { token });
    if (!user) {
      return new Response('Unauthorized - Invalid token', { status: 401 });
    }

    // Get session ID from query parameters
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return new Response('Missing sessionId parameter', { status: 400 });
    }

    // Fetch session from Convex to get preview token
    const session = await fetchQuery(api.claudeSessions.getSessionById, {
      sessionId: sessionId as Id<"claudeSessions">,
      userId: user._id
    }, { token });

    if (!session) {
      return new Response('Session not found', { status: 404 });
    }

    if (!session.previewUrl) {
      return new Response('Preview URL not available', { status: 404 });
    }

    // Construct the target URL with the sub-path
    const targetUrl = new URL(session.previewUrl);
    const pathSegments = params.path || [];
    
    if (pathSegments.length > 0) {
      const additionalPath = pathSegments.join('/');
      targetUrl.pathname = targetUrl.pathname.endsWith('/') 
        ? targetUrl.pathname + additionalPath
        : targetUrl.pathname + '/' + additionalPath;
    }

    console.log(`Proxying sub-path request to: ${targetUrl.toString()}`);

    // Prepare headers for the upstream request
    const headers: Record<string, string> = {
      'User-Agent': request.headers.get('user-agent') || 'Oscar-Proxy/1.0',
    };

    // Add preview token if available
    if (session.previewToken) {
      headers['x-daytona-preview-token'] = session.previewToken;
    }

    // Forward common headers
    const forwardHeaders = ['accept', 'accept-language', 'cache-control', 'referer'];
    forwardHeaders.forEach(headerName => {
      const headerValue = request.headers.get(headerName);
      if (headerValue) {
        headers[headerName] = headerValue;
      }
    });

    const requestOptions: RequestInit = {
      method: request.method,
      headers,
    };

    // Add body for POST/PUT requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestOptions.body = request.body;
    }

    // Check if this is a request for client.js - we need to modify it
    if (targetUrl.pathname.endsWith('/client.js')) {
      console.log('Serving modified client.js with correct WebSocket URL');
      console.log('Target URL for client.js:', targetUrl.toString());
      
      const response = await fetch(targetUrl.toString(), requestOptions);
      console.log('Client.js response status:', response.status, response.statusText);
      console.log('Client.js response content-type:', response.headers.get('content-type'));
      
      if (!response.ok) {
        console.error('Failed to fetch client.js from Daytona');
        return new Response('Error fetching client.js', { status: response.status });
      }
      
      let clientJs = await response.text();
      
      console.log('Original client.js length:', clientJs.length);
      console.log('First 200 chars of client.js:', clientJs.substring(0, 200));
      console.log('Original WebSocket line found:', clientJs.includes('window.location.host'));
      
      // Replace WebSocket with Server-Sent Events (much simpler!)
      const baseUrl = session.previewUrl;
      
      // Replace the entire WebSocket connection logic with SSE
      const originalConnectMethod = /this\.socket = new WebSocket\(wsUrl\);/;
      const newConnectMethod = `
      console.log('Using Server-Sent Events instead of WebSocket');
      console.log('Base URL:', "${baseUrl}");
      
      // Create SSE connection for terminal output
      this.eventSource = new EventSource("${baseUrl}/terminal-stream");
      this.connected = false;
      
      this.eventSource.onopen = () => {
        console.log('SSE connection opened');
        this.connected = true;
        this.updateConnectionStatus('connected');
        
        // Send initial terminal size
        this.sendTerminalInput(JSON.stringify({
          type: 'resize',
          cols: this.terminal.cols,
          rows: this.terminal.rows
        }));
      };
      
      this.eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'output') {
            this.terminal.write(message.data);
          } else if (message.type === 'exit') {
            this.terminal.write('\\r\\n\\r\\n[Process exited]');
            this.updateConnectionStatus('disconnected');
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };
      
      this.eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        this.updateConnectionStatus('disconnected');
      };
      
      // Function to send input via HTTP POST
      this.sendTerminalInput = async (data) => {
        if (!this.connected) return;
        
        try {
          await fetch("${baseUrl}/terminal-input", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: data
          });
        } catch (error) {
          console.error('Error sending terminal input:', error);
        }
      };`;
      
      clientJs = clientJs.replace(originalConnectMethod, newConnectMethod);
      
      // Replace terminal input handlers to use HTTP instead of WebSocket
      const originalInputHandler = /this\.terminal\.onData\(\(data\) => \{[\s\S]*?\}\);/;
      const newInputHandler = `
      this.terminal.onData((data) => {
        this.sendTerminalInput(JSON.stringify({
          type: 'input',
          data: data
        }));
      });`;
      
      clientJs = clientJs.replace(originalInputHandler, newInputHandler);
      
      // Replace terminal resize handler  
      const originalResizeHandler = /this\.terminal\.onResize\(\(size\) => \{[\s\S]*?\}\);/;
      const newResizeHandler = `
      this.terminal.onResize((size) => {
        this.sendTerminalInput(JSON.stringify({
          type: 'resize',
          cols: size.cols,
          rows: size.rows
        }));
      });`;
      
      clientJs = clientJs.replace(originalResizeHandler, newResizeHandler);
      
      // Also replace the wsUrl line as backup
      const originalLine = /const wsUrl = `\${protocol}\/\/\${window\.location\.host}`;/;
      const newLine = `const wsUrl = "${daytonaWsUrl}";`;
      clientJs = clientJs.replace(originalLine, newLine);
      
      console.log(`Modified WebSocket URL to: ${daytonaWsUrl}`);
      console.log('Modified client.js length:', clientJs.length);
      console.log('Replacement successful:', !clientJs.includes('window.location.host'));
      
      return new Response(clientJs, {
        status: 200,
        headers: { 'content-type': 'application/javascript' }
      });
    }
    
    const response = await fetch(targetUrl.toString(), requestOptions);

    console.log(`Daytona sub-path response: ${response.status} ${response.statusText}`);

    // Prepare response headers
    const responseHeaders = new Headers();
    
    // Forward important response headers
    const allowedResponseHeaders = [
      'content-type',
      'content-length', 
      'cache-control',
      'expires',
      'last-modified',
      'etag'
    ];

    allowedResponseHeaders.forEach(headerName => {
      const headerValue = response.headers.get(headerName);
      if (headerValue) {
        responseHeaders.set(headerName, headerValue);
      }
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('Daytona proxy sub-path error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return new Response(`Internal Server Error: ${error}`, { 
      status: 500,
      headers: { 'content-type': 'text/plain' }
    });
  }
}

// Handle other HTTP methods
export async function POST(request: NextRequest, context: any) {
  return GET(request, context);
}

export async function PUT(request: NextRequest, context: any) {
  return GET(request, context);
}

export async function DELETE(request: NextRequest, context: any) {
  return GET(request, context);
}

export async function PATCH(request: NextRequest, context: any) {
  return GET(request, context);
}