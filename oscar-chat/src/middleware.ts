import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";

const RESERVED_SUBDOMAINS = ["www", "app", "api", "admin"];

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  
  // Remove port number if present
  const hostWithoutPort = hostname.split(":")[0];
  const parts = hostWithoutPort.split(".");
  
  // Determine environment dynamically
  const isDevelopment = hostWithoutPort.endsWith(".localtest.me") || hostWithoutPort.endsWith(".local");
  const isProduction = hostWithoutPort.endsWith(".com") || hostWithoutPort.endsWith(".app") || hostWithoutPort.endsWith(".ai");
  const isVercelPreview = hostWithoutPort.endsWith(".vercel.app");
  
  // Extract subdomain based on environment
  let subdomain: string | null = null;
  
  if (isDevelopment && parts.length >= 3) {
    // Development: subdomain.localtest.me
    subdomain = parts[0];
  } else if (isProduction && parts.length >= 3) {
    // Production: subdomain.getoscar.ai
    subdomain = parts[0];
  } else if (isVercelPreview && parts.length >= 3) {
    // Vercel preview: subdomain.preview-name.vercel.app
    // Skip the preview deployment name and get the actual subdomain
    subdomain = parts[0];
  }
  
  // API routes should pass through
  if (url.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  
  // Auth pages should be accessible on base domain only
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/signin")) {
    if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain)) {
      // Redirect tenant subdomain auth requests to base domain with workspace param
      let baseUrl: string;
      if (isDevelopment) {
        baseUrl = "http://localtest.me:3000";
      } else if (isVercelPreview) {
        // For Vercel preview, reconstruct the base URL without subdomain
        const baseParts = parts.slice(1);
        baseUrl = `https://${baseParts.join('.')}`;
      } else {
        baseUrl = "https://getoscar.ai";
      }
      return NextResponse.redirect(new URL(`/signin?workspace=${subdomain}`, baseUrl));
    }
    return NextResponse.next();
  }
  
  // Handle tenant subdomains
  if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain)) {
    // Get session to check authentication and access
    const session = await auth();
    
    // Store tenant info in headers for the page to access
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-tenant', subdomain);
    
    if (!session) {
      // User not authenticated - show signin option on tenant page
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }
    
    // User is authenticated - the page component will validate tenant access
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }
  
  // Base domain routing - let it pass through to the page component
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};