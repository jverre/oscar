import type { Adapter } from "next-auth/adapters";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const ADAPTER_SECRET = process.env.CONVEX_AUTH_ADAPTER_SECRET!;

export function ConvexAdapter(): Adapter {
  const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

  return {
    async createUser(user) {
      const newUser = await convex.mutation(api.authAdapter.createUser, {
        name: user.name || undefined,
        email: user.email!,
        image: user.image || undefined,
        secret: ADAPTER_SECRET,
      });
      return {
        id: newUser.id,
        name: newUser.name || null,
        email: newUser.email,
        image: newUser.image || null,
        emailVerified: newUser.emailVerified,
      };
    },

    async getUser(id) {
      const user = await convex.query(api.authAdapter.getUser, {
        id,
        secret: ADAPTER_SECRET,
      });
      if (!user) return null;
      return {
        id: user.id,
        name: user.name || null,
        email: user.email,
        image: user.image || null,
        emailVerified: user.emailVerified,
      };
    },

    async getUserByEmail(email) {
      const user = await convex.query(api.authAdapter.getUserByEmail, {
        email,
        secret: ADAPTER_SECRET,
      });
      if (!user) return null;
      return {
        id: user.id,
        name: user.name || null,
        email: user.email,
        image: user.image || null,
        emailVerified: user.emailVerified,
      };
    },

    async updateUser(user) {
      const updatedUser = await convex.mutation(api.authAdapter.updateUser, {
        id: user.id!,
        name: user.name || undefined,
        email: user.email || undefined,
        image: user.image || undefined,
        secret: ADAPTER_SECRET,
      });
      return {
        id: updatedUser.id,
        name: updatedUser.name || null,
        email: updatedUser.email,
        image: updatedUser.image || null,
        emailVerified: updatedUser.emailVerified,
      };
    },

    async linkAccount(account) {
      await convex.mutation(api.authAdapter.linkAccount, {
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
        secret: ADAPTER_SECRET,
      });
    },

    async unlinkAccount({ providerAccountId, provider }) {
      await convex.mutation(api.authAdapter.unlinkAccount, {
        provider,
        providerAccountId,
        secret: ADAPTER_SECRET,
      });
    },

    async createSession(session) {
      return await convex.mutation(api.authAdapter.createSession, {
        sessionToken: session.sessionToken,
        userId: session.userId,
        expires: session.expires.toISOString(),
        secret: ADAPTER_SECRET,
      });
    },

    async getSessionAndUser(sessionToken) {
      const session = await convex.query(api.authAdapter.getSession, {
        sessionToken,
        secret: ADAPTER_SECRET,
      });

      if (!session) return null;

      const user = await convex.query(api.authAdapter.getUser, {
        id: session.userId,
        secret: ADAPTER_SECRET,
      });

      if (!user) return null;

      return { session, user };
    },

    async updateSession(session) {
      return await convex.mutation(api.authAdapter.updateSession, {
        sessionToken: session.sessionToken,
        expires: session.expires?.toISOString(),
        secret: ADAPTER_SECRET,
      });
    },

    async deleteSession(sessionToken) {
      await convex.mutation(api.authAdapter.deleteSession, {
        sessionToken,
        secret: ADAPTER_SECRET,
      });
    },

    async createVerificationToken(verificationToken) {
      return await convex.mutation(api.authAdapter.createVerificationToken, {
        identifier: verificationToken.identifier,
        token: verificationToken.token,
        expires: verificationToken.expires.toISOString(),
        secret: ADAPTER_SECRET,
      });
    },

    async useVerificationToken({ identifier, token }) {
      return await convex.mutation(api.authAdapter.useVerificationToken, {
        identifier,
        token,
        secret: ADAPTER_SECRET,
      });
    },
  };
}