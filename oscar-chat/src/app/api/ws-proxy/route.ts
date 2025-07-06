import { NextRequest } from 'next/server';

// Note: Next.js API routes don't support WebSocket upgrades directly
// This is a placeholder - we'll need a custom WebSocket server

export async function GET(request: NextRequest) {
  return new Response('WebSocket proxy not supported in Next.js API routes. Need custom WebSocket server.', {
    status: 501,
    headers: { 'content-type': 'text/plain' }
  });
}