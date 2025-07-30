import { ConvexAdapter } from "./app/ConvexAdapter";
import { SignJWT, importPKCS8 } from "jose";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

	
const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL!.replace(
  /.cloud$/,
  ".site",
);

// Helper function to get root domain for cookie sharing
const getRootDomain = () => {
  // Use Vercel URL if available (for preview deployments)
  const vercelUrl = process.env.VERCEL_URL;
  const authUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 
    (vercelUrl ? `https://${vercelUrl}` : '');
  
  if (!authUrl) return '';
  
  try {
    const { hostname } = new URL(authUrl);
    const parts = hostname.split('.');
    
    // For Vercel preview deployments (*.vercel.app)
    if (hostname.endsWith('.vercel.app')) {
      return 'vercel.app';
    }
    
    // For development (localtest.me) or production (getoscar.ai)
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  } catch {
    return '';
  }
};

const useSecureCookies = process.env.NODE_ENV === 'production';
const rootDomain = getRootDomain();

// Dynamically determine the URL for NextAuth
const getAuthUrl = () => {
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  return undefined;
};

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: true,
  ...(getAuthUrl() && { url: getAuthUrl() }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  adapter: ConvexAdapter,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: rootDomain ? `.${rootDomain}` : undefined
      }
    }
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      const privateKey = await importPKCS8(
        process.env.CONVEX_AUTH_PRIVATE_KEY!,
        "RS256",
      );
      const convexToken = await new SignJWT({
        sub: token.sub,
      })
        .setProtectedHeader({ alg: "RS256" })
        .setIssuedAt()
        .setIssuer(CONVEX_SITE_URL)
        .setAudience("convex")
        .setExpirationTime("1h")
        .sign(privateKey);
      return { 
        ...session, 
        convexToken, 
        user: { 
          ...session.user, 
          id: typeof token.userId === 'string' ? token.userId : token.userId?.toString() 
        } 
      };
    },
    async redirect({ url, baseUrl }) {
      // First, handle the default redirect cases
      if (url.startsWith("/")) {
        // For relative URLs, check for workspace parameter
        if (url.includes('workspace=')) {
          try {
            const fullUrl = `${baseUrl}${url}`;
            const urlObj = new URL(fullUrl);
            const workspace = urlObj.searchParams.get('workspace');
            if (workspace) {
              // Extract base domain from baseUrl
              const baseUrlObj = new URL(baseUrl);
              const hostname = baseUrlObj.hostname;
              const parts = hostname.split('.');
              
              let baseDomain;
              if (parts.length >= 2) {
                // Use the last two parts as base domain (e.g., localtest.me or getoscar.ai)
                baseDomain = parts.slice(-2).join('.');
              } else {
                // Fallback for single part domains (localhost)
                baseDomain = hostname;
              }
              
              const port = baseUrlObj.port ? `:${baseUrlObj.port}` : "";
              const protocol = baseUrlObj.protocol;
              
              // Redirect to tenant subdomain
              const redirectUrl = `${protocol}//${workspace}.${baseDomain}${port}`;
              return redirectUrl;
            }
          } catch (error) {
            console.error('[auth][redirect] Error handling workspace redirect:', error);
          }
        }
        const finalUrl = `${baseUrl}${url}`;
        return finalUrl;
      }
      
      // For absolute URLs
      try {
        const urlObj = new URL(url);
        // Check if URL has workspace parameter even in absolute URLs
        const workspace = urlObj.searchParams.get('workspace');
        if (workspace) {
          const baseUrlObj = new URL(baseUrl);
          const hostname = baseUrlObj.hostname;
          const parts = hostname.split('.');
          
          let baseDomain;
          if (parts.length >= 2) {
            baseDomain = parts.slice(-2).join('.');
          } else {
            baseDomain = hostname;
          }
          
          const port = baseUrlObj.port ? `:${baseUrlObj.port}` : "";
          const protocol = baseUrlObj.protocol;
          
          const redirectUrl = `${protocol}//${workspace}.${baseDomain}${port}`;
          return redirectUrl;
        }
        
        if (urlObj.origin === baseUrl) {
          return url;
        }
      } catch (e) {
        console.error('[auth][redirect] Error parsing absolute URL:', e);
      }
      
      return baseUrl;
    },
  },
});

declare module "next-auth" {
  interface Session {
    convexToken: string;
  }
  interface JWT {
    userId?: string;
  }
}