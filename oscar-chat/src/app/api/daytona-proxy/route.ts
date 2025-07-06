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

    // client.js handling is now done by the catch-all route

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

    // Try to get authentication cookie by making a request to Daytona first
    if (session.previewToken) {
      try {
        console.log('Attempting to get Daytona auth cookie...');
        const authResponse = await fetch(session.previewUrl, {
          method: 'GET',
          headers: {
            'x-daytona-preview-token': session.previewToken,
            'User-Agent': headers['User-Agent'] || 'Oscar-Proxy/1.0'
          },
          redirect: 'manual' // Don't follow redirects
        });
        
        // Extract Set-Cookie headers
        const setCookies = authResponse.headers.getSetCookie?.() || [];
        if (setCookies.length > 0) {
          console.log('Found cookies from Daytona:', setCookies);
          // Combine cookies into a single Cookie header
          const cookieValues = setCookies.map(cookie => cookie.split(';')[0]).join('; ');
          headers['Cookie'] = cookieValues;
          console.log('Added Cookie header:', cookieValues);
        }
      } catch (cookieError) {
        console.log('Failed to get auth cookie:', cookieError);
      }
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

    // Check if this is an HTML response that needs URL modification
    const responseContentType = response.headers.get('content-type') || '';
    if (response.ok && responseContentType.includes('text/html')) {
      console.log('Modifying HTML to fix base URL and add auth parameters');
      
      let html = await response.text();
      const authParams = `?sessionId=${sessionId}&token=${encodeURIComponent(token)}`;
      const baseUrl = `/api/daytona-proxy/`;
      
      // Add or modify the base tag to ensure correct URL resolution
      if (html.includes('<base ')) {
        // Replace existing base tag
        html = html.replace(/<base [^>]*>/i, `<base href="${baseUrl}">`);
      } else {
        // Add base tag after <head>
        html = html.replace(/<head>/i, `<head><base href="${baseUrl}">`);
      }
      
      // Replace relative script and link sources to include auth parameters
      html = html.replace(/src="([^"]*(?:\.js))"/g, `src="$1${authParams}"`);
      html = html.replace(/href="([^"]*\.css)"/g, `href="$1${authParams}"`);
      
      console.log('Modified HTML with base tag and auth parameters');
      console.log('First 500 chars of modified HTML:', html.substring(0, 500));
      
      // Prepare response headers including cookies
      const htmlHeaders = new Headers({ 'content-type': 'text/html' });
      
      // If we got authentication cookies from Daytona, set them for the iframe
      if (headers['Cookie']) {
        // Extract individual cookies and set them
        const cookies = headers['Cookie'].split('; ');
        cookies.forEach(cookie => {
          const [name, value] = cookie.split('=');
          if (name && value) {
            // Set cookie for the Daytona domain so WebSocket can use it
            htmlHeaders.append('Set-Cookie', `${name}=${value}; Domain=.proxy.daytona.work; Path=/; Secure; SameSite=None`);
          }
        });
        console.log('Setting authentication cookies for iframe');
      }
      
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: htmlHeaders
      });
    }

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

    // Handle WebSocket upgrade - but this won't work in Next.js API routes
    // WebSocket upgrades need to be handled differently
    if (request.headers.get('upgrade') === 'websocket') {
      console.log('WebSocket upgrade attempt detected - this needs special handling');
      return new Response('WebSocket upgrades not supported in this proxy', { 
        status: 501,
        headers: { 'content-type': 'text/plain' }
      });
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