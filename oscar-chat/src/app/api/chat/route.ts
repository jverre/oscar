import { auth } from "@/auth";
import { Session } from "next-auth";

export const maxDuration = 30;

const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL!.replace(
  /.cloud$/,
  ".site",
);

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return new Response('Not authenticated', { status: 401 });
    }
    
    const body = await req.json();
    const { messages, pluginId } = body;
    
    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid messages format', { status: 400 });
    }
    
    const convexUrl = CONVEX_SITE_URL;
    
    if (!convexUrl) {
      return new Response('Missing Convex URL', { status: 500 });
    }
    
    // Get the JWT token from NextAuth session
    const jwtToken = (session as Session & { convexToken: string }).convexToken;
    if (!jwtToken) {
      return new Response('Authentication token not found', { status: 401 });
    }
    
    // Call the Convex HTTP action
    const convexHttpUrl = `${convexUrl}/http_chat`;
    const response = await fetch(convexHttpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwtToken}`,
      },
      body: JSON.stringify({
        messages,
        pluginId,
      }),
    });
    
    if (!response.ok) {
      return new Response('Convex HTTP action failed', { status: response.status });
    }

    return response;
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
} 