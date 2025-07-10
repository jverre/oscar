import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const RESERVED_SUBDOMAINS = ["www", "app", "api", "admin"];

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  
  // Remove port number if present
  const hostWithoutPort = hostname.split(":")[0];
  const parts = hostWithoutPort.split(".");
  
  // Determine environment dynamically
  const isDevelopment = hostWithoutPort.endsWith(".localtest.me") || hostWithoutPort.endsWith(".local");
  const isProduction = hostWithoutPort.endsWith(".com") || hostWithoutPort.endsWith(".app");
  
  // Extract subdomain based on environment
  let subdomain: string | null = null;
  
  if (isDevelopment && parts.length >= 3) {
    // Development: subdomain.oscar-chat.localtest.me or subdomain.oscar-chat.local
    subdomain = parts[0];
  } else if (isProduction && parts.length >= 3) {
    // Production: subdomain.oscar-chat.com
    subdomain = parts[0];
  }
  
  // Check if it's a valid subdomain (not reserved)
  if (subdomain && !RESERVED_SUBDOMAINS.includes(subdomain)) {
    // Subdomain detected - let it pass through to serve org content directly
    return NextResponse.next();
  }
  
  // Auth pages should be accessible on base domain
  if (url.pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }
  
  // API routes should pass through
  if (url.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }
  
  // No subdomain and not an allowed path? Redirect to auth
  if (!subdomain && !url.pathname.startsWith("/auth/")) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }
  
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