import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return new Response(JSON.stringify({
    message: 'Subpath test working',
    url: request.url,
    pathSegments: params.path,
    timestamp: new Date().toISOString()
  }, null, 2), {
    headers: { 'content-type': 'application/json' }
  });
}