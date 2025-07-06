import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('=== DAYTONA PROXY BASE ROUTE HIT ===');
  console.log('Request URL:', request.url);
  
  return new Response(`
    <html>
      <head><title>Proxy Test</title></head>
      <body>
        <h1>Daytona Proxy Route Working!</h1>
        <p>URL: ${request.url}</p>
        <p>Time: ${new Date().toISOString()}</p>
      </body>
    </html>
  `, {
    headers: { 'content-type': 'text/html' }
  });
}