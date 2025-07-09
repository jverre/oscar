import { NextRequest, NextResponse } from "next/server";
import { convexAuthNextjsMiddleware } from "@convex-dev/auth/nextjs/server";

export default convexAuthNextjsMiddleware(async (request: NextRequest) => {
  const url = request.nextUrl;
  const hostname = request.headers.get("host") || "";
  
  // Get the subdomain from the hostname
  const subdomain = getSubdomain(hostname);
  
  // Skip middleware for API routes, static files, and _next
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/favicon.ico") ||
    url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }
  
  // Handle main domain (no subdomain or www)
  if (!subdomain || subdomain === "www") {
    // Special case: www.getoscar.ai shows jverre organization
    if (subdomain === "www" || (hostname.includes("getoscar.ai") && !subdomain)) {
      // Rewrite to jverre organization
      const rewriteUrl = new URL(request.url);
      rewriteUrl.pathname = `/org/jverre${url.pathname}`;
      
      const response = NextResponse.rewrite(rewriteUrl);
      response.headers.set("x-subdomain", "jverre");
      
      return response;
    }
    
    // Allow access to main domain for landing page and auth
    if (url.pathname === "/" || url.pathname.startsWith("/auth/")) {
      return NextResponse.next();
    }
    
    // Redirect other paths to subdomain selection or onboarding
    return NextResponse.redirect(new URL("/", request.url));
  }
  
  // Handle subdomain routing
  if (subdomain) {
    // Rewrite the URL to include subdomain context
    const rewriteUrl = new URL(request.url);
    rewriteUrl.pathname = `/org/${subdomain}${url.pathname}`;
    
    // Set subdomain header for components to access
    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set("x-subdomain", subdomain);
    
    return response;
  }
  
  return NextResponse.next();
});

function getSubdomain(hostname: string): string | null {
  // Handle localhost development
  if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
    // Extract subdomain from localhost:3000 or subdomain.localhost:3000
    const parts = hostname.split(".");
    if (parts.length > 1 && parts[0] !== "localhost" && parts[0] !== "127") {
      return parts[0];
    }
    return null;
  }
  
  // Handle production domain (e.g., oscar.ai)
  const parts = hostname.split(".");
  
  // For oscar.ai, we expect subdomains like: subdomain.oscar.ai
  if (parts.length >= 3) {
    const subdomain = parts[0];
    
    // Skip common subdomains that shouldn't be treated as tenant subdomains
    if (subdomain === "www" || subdomain === "api" || subdomain === "admin") {
      return null;
    }
    
    return subdomain;
  }
  
  return null;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};