import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest, NextFetchEvent } from "next/server";

const authMiddleware = convexAuthNextjsMiddleware();

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // First run the Convex auth middleware
  const authResponse = authMiddleware(request, event);
  
  // Check if user is authenticated by looking for the auth cookie
  const isAuthenticated = request.cookies.has("__convexAuthJWT");
  
  // Don't redirect authenticated users from home - let the page handle it
  // The home page will check if user is authenticated and redirect to their org/team
  
  return authResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)",
  ],
};