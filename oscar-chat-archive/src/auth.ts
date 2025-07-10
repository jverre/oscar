import NextAuth from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { ConvexAdapter } from "./app/convexAdapter";

// Configure cookies for subdomain support
const useSecureCookies = process.env.NEXTAUTH_URL?.startsWith('https://') ?? false;
const cookiePrefix = useSecureCookies ? '__Secure-' : '';
const hostName = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).hostname : 'localhost';

// For development with app.local, set domain to support subdomains
const cookieDomain = hostName.includes('app.local') ? '.app.local' : 
                     hostName.includes('localhost') ? undefined : '.' + hostName;

console.log('NextAuth config - NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NextAuth config - hostName:', hostName);
console.log('NextAuth config - cookieDomain:', cookieDomain);
console.log('NextAuth config - useSecureCookies:', useSecureCookies);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  adapter: ConvexAdapter,
  pages: {
    signIn: "/auth/signin",
  },
  cookies: cookieDomain ? {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
        domain: cookieDomain // add a . in front so that subdomains are included
      }
    }
  } : undefined, // Don't set custom cookies for localhost
  callbacks: {
    async signIn({ user, account, profile }) {
      return true;
    },
    async session({ session, user }) {
      // Include user ID in session for client-side access
      if (user) {
        session.user.id = user.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Handle subdomain redirects
      const urlObj = new URL(url, baseUrl);
      const returnTo = urlObj.searchParams.get('return_to');
      
      if (returnTo) {
        // Store the subdomain for later redirect
        return `${baseUrl}/auth/success?return_to=${returnTo}`;
      }
      
      // For users signing in from main domain, redirect to their personal subdomain
      // This will be handled by the auth success page
      return `${baseUrl}/auth/success`;
    },
  },
})