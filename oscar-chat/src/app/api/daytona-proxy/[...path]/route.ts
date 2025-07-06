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
      
      // Replace the WebSocket URL to point directly to Daytona
      const daytonaWsUrl = session.previewUrl.replace(/^https?:/, 'wss:');
      
      // Replace the WebSocket connection logic with enhanced debugging
      const originalConnectMethod = /this\.socket = new WebSocket\(wsUrl\);/;
      let newConnectMethod = `
      console.log('Original wsUrl would be:', wsUrl);
      console.log('Connecting to Daytona WebSocket:', "${daytonaWsUrl}");
      console.log('Preview token available:', ${!!session.previewToken});
      this.socket = new WebSocket("${daytonaWsUrl}");`;
      
      clientJs = clientJs.replace(originalConnectMethod, newConnectMethod);
      
      // Also enhance the error logging
      const originalErrorHandler = /this\.socket\.onerror = \(error\) => \{[\s\S]*?\};/;
      const newErrorHandler = `
      this.socket.onerror = (error) => {
        console.error('WebSocket error details:', error);
        console.error('WebSocket readyState:', this.socket.readyState);
        console.error('WebSocket URL was:', "${daytonaWsUrl}");
        this.updateConnectionStatus('disconnected');
      };`;
      
      clientJs = clientJs.replace(originalErrorHandler, newErrorHandler);
      
      // Enhanced close handler
      const originalCloseHandler = /this\.socket\.onclose = \(event\) => \{[\s\S]*?\};/;
      const newCloseHandler = `
      this.socket.onclose = (event) => {
        console.log('WebSocket closed with code:', event.code, 'reason:', event.reason);
        console.log('WebSocket close event:', event);
        this.updateConnectionStatus('disconnected');
        this.attemptReconnect();
      };`;
      
      clientJs = clientJs.replace(originalCloseHandler, newCloseHandler);
      
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