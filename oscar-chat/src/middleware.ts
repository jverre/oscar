import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const authMiddleware = convexAuthNextjsMiddleware();

export default function middleware(request: NextRequest) {
  // First run the Convex auth middleware
  const authResponse = authMiddleware(request);
  
  // Check if user is authenticated by looking for the auth cookie
  const isAuthenticated = request.cookies.has("__convexAuthJWT");
  
  // Redirect authenticated users from home to their org/team
  // For now, redirect to /chat until user navigates to proper org/team URL
  // The user will be redirected to the correct org/team URL on first file access
  if (request.nextUrl.pathname === "/" && isAuthenticated) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }
  
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