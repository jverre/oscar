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
  const authUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  if (!authUrl) return '';
  
  try {
    const { hostname } = new URL(authUrl);
    const parts = hostname.split('.');
    
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

export const { handlers, signIn, signOut, auth } = NextAuth({
  debug: true,
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
      // Parse the URL to check for workspace parameter
      try {
        const urlObj = new URL(url);
        const workspace = urlObj.searchParams.get('workspace');
        
        if (workspace) {
          // Extract base domain from baseUrl
          const baseUrlObj = new URL(baseUrl);
          const hostname = baseUrlObj.hostname;
          const port = baseUrlObj.port ? `:${baseUrlObj.port}` : "";
          const protocol = baseUrlObj.protocol;
          
          // Redirect to tenant subdomain
          return `${protocol}//${workspace}.${hostname}${port}`;
        }
      } catch (error) {
        // If URL parsing fails, fall back to default behavior
        console.error('Error parsing redirect URL:', error);
      }
      
      // Default redirect behavior
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
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


// import NextAuth from "next-auth";
// import Google from "next-auth/providers/google";
// import { ConvexAdapter } from "./lib/ConvexAdapter";

// export const { handlers, signIn, signOut, auth } = NextAuth({
//   adapter: ConvexAdapter(),
//   providers: [
//     Google({
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//     }),
//   ],
//   session: {
//     strategy: "database",
//   },
//   callbacks: {
//     async session({ session, user }) {
//       // Add user ID to session
//       if (session.user && user) {
//         session.user.id = user.id;
//       }
//       return session;
//     },
//   },
// });