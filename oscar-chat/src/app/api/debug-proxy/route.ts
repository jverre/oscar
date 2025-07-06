import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    const token = request.nextUrl.searchParams.get('token');
    
    return new Response(JSON.stringify({
      message: 'Proxy debug endpoint',
      sessionId,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      timestamp: new Date().toISOString(),
      url: request.url
    }, null, 2), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}