import { NextRequest } from 'next/server';
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

export async function GET(request: NextRequest) {
  console.log(`=== DAYTONA PROXY BASE ROUTE HIT ===`);
  console.log(`Request URL: ${request.url}`);
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

    console.log(`Proxying request to: ${session.previewUrl}`);
    console.log(`Session status: ${session.status}`);
    console.log(`Preview token available: ${!!session.previewToken}`);

    // Construct the target URL - use the Daytona preview URL directly
    const targetUrl = new URL(session.previewUrl);

    // Forward query parameters (except our internal ones)
    const forwardParams = new URLSearchParams(request.nextUrl.search);
    forwardParams.delete('sessionId');
    forwardParams.delete('token'); // Don't forward our auth token
    forwardParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    // Prepare headers for the upstream request
    const headers: Record<string, string> = {
      'User-Agent': request.headers.get('user-agent') || 'Oscar-Proxy/1.0',
    };

    // Add preview token if available
    if (session.previewToken) {
      headers['x-daytona-preview-token'] = session.previewToken;
    }

    // Forward common headers
    const forwardHeaders = ['accept', 'accept-language', 'cache-control', 'connection', 'upgrade'];
    forwardHeaders.forEach(headerName => {
      const headerValue = request.headers.get(headerName);
      if (headerValue) {
        headers[headerName] = headerValue;
      }
    });

    // Make request to Daytona
    console.log(`Final target URL: ${targetUrl.toString()}`);
    console.log(`Request method: ${request.method}`);
    console.log(`Request headers:`, headers);
    
    const requestOptions: RequestInit = {
      method: request.method,
      headers,
    };

    // Add body for POST/PUT requests
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      requestOptions.body = request.body;
    }
    
    const response = await fetch(targetUrl.toString(), requestOptions);

    console.log(`Daytona response status: ${response.status} ${response.statusText}`);

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

    // Handle WebSocket upgrade
    if (response.headers.get('upgrade') === 'websocket') {
      responseHeaders.set('upgrade', 'websocket');
      responseHeaders.set('connection', 'upgrade');
      
      const wsKeyHeader = request.headers.get('sec-websocket-key');
      if (wsKeyHeader) {
        responseHeaders.set('sec-websocket-accept', response.headers.get('sec-websocket-accept') || '');
      }
    }

    // For successful responses, stream the content
    if (response.ok) {
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } else {
      // For error responses, read the body and return a proper error
      const errorText = await response.text();
      console.log(`Daytona error response: ${errorText}`);
      return new Response(`Daytona Error: ${response.status} ${response.statusText}\n${errorText}`, {
        status: response.status,
        headers: { 'content-type': 'text/plain' }
      });
    }

  } catch (error) {
    console.error('Daytona proxy error:', error);
    return new Response(`Internal Server Error: ${error}`, { 
      status: 500,
      headers: { 'content-type': 'text/plain' }
    });
  }
}

// Handle other HTTP methods
export async function POST(request: NextRequest) {
  return GET(request);
}

export async function PUT(request: NextRequest) {
  return GET(request);
}

export async function DELETE(request: NextRequest) {
  return GET(request);
}

export async function PATCH(request: NextRequest) {
  return GET(request);
}