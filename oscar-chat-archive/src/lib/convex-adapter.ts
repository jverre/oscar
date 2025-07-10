import { ConvexHttpClient } from "convex/browser";
import type { Adapter } from "next-auth/adapters";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexAdapter(): Adapter {
  return {
    async createUser(user) {
      // Generate a unique subdomain for the user
      const baseName = (user.name || user.email!.split("@")[0])
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      
      let subdomain = baseName;
      let counter = 1;
      
      // Ensure subdomain is unique
      while (true) {
        const existingOrg = await convex.query("organizations:getBySubdomain", { subdomain });
        if (!existingOrg) {
          break;
        }
        subdomain = `${baseName}${counter}`;
        counter++;
      }
      
      // Create organization first
      const organizationId = await convex.mutation("organizations:create", {
        name: user.name || user.email!.split("@")[0],
        domain: user.email!.split("@")[1],
        subdomain,
        type: "personal",
      });
      
      // Create user
      const userId = await convex.mutation("users:create", {
        email: user.email!,
        name: user.name || user.email!.split("@")[0] || "User",
        image: user.image,
        organizationId,
      });
      
      return {
        id: userId,
        email: user.email!,
        name: user.name,
        image: user.image,
      };
    },
    
    async getUser(id) {
      const user = await convex.query("users:get", { userId: id });
      if (!user) return null;
      
      return {
        id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
    
    async getUserByEmail(email) {
      const user = await convex.query("users:getByEmail", { email });
      if (!user) return null;
      
      return {
        id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
    
    async getUserByAccount({ providerAccountId, provider }) {
      const user = await convex.query("users:getByAccount", { 
        provider, 
        providerAccountId 
      });
      if (!user) return null;
      
      return {
        id: user._id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
    
    async updateUser(user) {
      const updatedUser = await convex.mutation("users:update", {
        userId: user.id!,
        email: user.email,
        name: user.name,
        image: user.image,
      });
      
      return {
        id: updatedUser._id,
        email: updatedUser.email,
        name: updatedUser.name,
        image: updatedUser.image,
      };
    },
    
    async linkAccount(account) {
      await convex.mutation("accounts:create", {
        userId: account.userId,
        type: account.type,
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        refresh_token: account.refresh_token,
        access_token: account.access_token,
        expires_at: account.expires_at,
        token_type: account.token_type,
        scope: account.scope,
        id_token: account.id_token,
      });
    },
    
    async unlinkAccount({ providerAccountId, provider }) {
      await convex.mutation("accounts:delete", {
        provider,
        providerAccountId,
      });
    },
    
    async createSession({ sessionToken, userId, expires }) {
      await convex.mutation("sessions:create", {
        sessionToken,
        userId,
        expires: expires.getTime(),
      });
      
      return { sessionToken, userId, expires };
    },
    
    async getSessionAndUser(sessionToken) {
      const session = await convex.query("sessions:getWithUser", { sessionToken });
      if (!session) return null;
      
      return {
        session: {
          sessionToken: session.sessionToken,
          userId: session.userId,
          expires: new Date(session.expires),
        },
        user: {
          id: session.user._id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image,
        },
      };
    },
    
    async updateSession({ sessionToken, expires, userId }) {
      const session = await convex.mutation("sessions:update", {
        sessionToken,
        expires: expires?.getTime(),
        userId,
      });
      
      return session ? {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: new Date(session.expires),
      } : null;
    },
    
    async deleteSession(sessionToken) {
      await convex.mutation("sessions:delete", { sessionToken });
    },
    
    async createVerificationToken({ identifier, expires, token }) {
      await convex.mutation("verificationTokens:create", {
        identifier,
        token,
        expires: expires.getTime(),
      });
      
      return { identifier, expires, token };
    },
    
    async useVerificationToken({ identifier, token }) {
      const verificationToken = await convex.mutation("verificationTokens:use", {
        identifier,
        token,
      });
      
      return verificationToken ? {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: new Date(verificationToken.expires),
      } : null;
    },
  };
}