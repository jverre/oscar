import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";
import type { NextRequest, NextFetchEvent } from "next/server";

const authMiddleware = convexAuthNextjsMiddleware();

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  // First run the Convex auth middleware
  const authResponse = authMiddleware(request, event);
  
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