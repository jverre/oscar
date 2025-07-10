import type {
    Adapter,
    AdapterAccount,
    AdapterAuthenticator,
    AdapterSession,
    AdapterUser,
    VerificationToken,
  } from "@auth/core/adapters";
  import { fetchMutation, fetchQuery } from "convex/nextjs";
  import { FunctionArgs, FunctionReference } from "convex/server";
  import { api } from "../../convex/_generated/api";
  import { Doc, Id } from "../../convex/_generated/dataModel";
  
  type User = AdapterUser & { id: Id<"users"> };
  type Session = AdapterSession & { userId: Id<"users"> };
  type Account = AdapterAccount & { userId: Id<"users"> };
  type Authenticator = AdapterAuthenticator & { userId: Id<"users"> };
  
  export const ConvexAdapter: Adapter = {
    async createAuthenticator(authenticator: Authenticator) {
      await callMutation(api.authAdapters.createAuthenticator, { authenticator });
      return authenticator;
    },
    async createSession(session: Session) {
      const id = await callMutation(api.authAdapters.createSession, {
        session: toDB(session),
      });
      return { ...session, id };
    },
    async createUser({ id: _, ...user }: User) {
      const id = await callMutation(api.authAdapters.createUser, {
        user: toDB({
          ...user,
          createdAt: Date.now(),
        }),
      });
      return { ...user, id };
    },
    async createVerificationToken(verificationToken: VerificationToken) {
      await callMutation(api.authAdapters.createVerificationToken, {
        verificationToken: toDB(verificationToken),
      });
      return verificationToken;
    },
    async deleteSession(sessionToken) {
      return maybeSessionFromDB(
        await callMutation(api.authAdapters.deleteSession, {
          sessionToken,
        }),
      );
    },
    async deleteUser(id: Id<"users">) {
      return maybeUserFromDB(
        await callMutation(api.authAdapters.deleteUser, { id }),
      );
    },
    async getAccount(providerAccountId, provider) {
      return await callQuery(api.authAdapters.getAccount, {
        provider,
        providerAccountId,
      });
    },
    async getAuthenticator(credentialID) {
      return await callQuery(api.authAdapters.getAuthenticator, { credentialID });
    },
    async getSessionAndUser(sessionToken) {
      console.log("ConvexAdapter.getSessionAndUser called with:", sessionToken);
      
      const result = await callQuery(api.authAdapters.getSessionAndUser, {
        sessionToken,
      });
      
      console.log("ConvexAdapter.getSessionAndUser result:", result);
      
      if (result === null) {
        console.log("ConvexAdapter.getSessionAndUser returning null");
        return null;
      }
      
      const { user, session } = result;
      const transformedUser = userFromDB(user);
      const transformedSession = sessionFromDB(session);
      
      console.log("ConvexAdapter.getSessionAndUser transformed user:", transformedUser);
      console.log("ConvexAdapter.getSessionAndUser transformed session:", transformedSession);
      
      return { user: transformedUser, session: transformedSession };
    },
    async getUser(id: Id<"users">) {
      return maybeUserFromDB(await callQuery(api.authAdapters.getUser, { id }));
    },
    async getUserByAccount({ provider, providerAccountId }) {
      return maybeUserFromDB(
        await callQuery(api.authAdapters.getUserByAccount, {
          provider,
          providerAccountId,
        }),
      );
    },
    async getUserByEmail(email) {
      return maybeUserFromDB(
        await callQuery(api.authAdapters.getUserByEmail, { email }),
      );
    },
    async linkAccount(account: Account) {
      return await callMutation(api.authAdapters.linkAccount, { account });
    },
    async listAuthenticatorsByUserId(userId: Id<"users">) {
      return await callQuery(api.authAdapters.listAuthenticatorsByUserId, {
        userId,
      });
    },
    async unlinkAccount({ provider, providerAccountId }) {
      return (
        (await callMutation(api.authAdapters.unlinkAccount, {
          provider,
          providerAccountId,
        })) ?? undefined
      );
    },
    async updateAuthenticatorCounter(credentialID, newCounter) {
      return await callMutation(api.authAdapters.updateAuthenticatorCounter, {
        credentialID,
        newCounter,
      });
    },
    async updateSession(session: Session) {
      return await callMutation(api.authAdapters.updateSession, {
        session: toDB(session),
      });
    },
    async updateUser(user: User) {
      await callMutation(api.authAdapters.updateUser, { user: toDB(user) });
      return user;
    },
    async useVerificationToken({ identifier, token }) {
      return maybeVerificationTokenFromDB(
        await callMutation(api.authAdapters.useVerificationToken, {
          identifier,
          token,
        }),
      );
    },
  };
  
  /// Helpers
  
  function callQuery<Query extends FunctionReference<"query">>(
    query: Query,
    args: Omit<FunctionArgs<Query>, "secret">,
  ) {
    return fetchQuery(query, addSecret(args) as any);
  }
  
  function callMutation<Mutation extends FunctionReference<"mutation">>(
    mutation: Mutation,
    args: Omit<FunctionArgs<Mutation>, "secret">,
  ) {
    return fetchMutation(mutation, addSecret(args) as any);
  }
  
  if (process.env.CONVEX_AUTH_ADAPTER_SECRET === undefined) {
    throw new Error("Missing CONVEX_AUTH_ADAPTER_SECRET environment variable");
  }
  
  function addSecret(args: Record<string, any>) {
    return { ...args, secret: process.env.CONVEX_AUTH_ADAPTER_SECRET! };
  }
  
  function maybeUserFromDB(user: Doc<"users"> | null) {
    if (user === null) {
      return null;
    }
    return userFromDB(user);
  }
  
  function userFromDB(user: Doc<"users">) {
    return {
      ...user,
      id: user._id,
      emailVerified: maybeDate(user.emailVerified),
    };
  }
  
  function maybeSessionFromDB(session: Doc<"sessions"> | null) {
    if (session === null) {
      return null;
    }
    return sessionFromDB(session);
  }
  
  function sessionFromDB(session: Doc<"sessions">) {
    return { ...session, id: session._id, expires: new Date(session.expires) };
  }
  
  function maybeVerificationTokenFromDB(
    verificationToken: Doc<"verificationTokens"> | null,
  ) {
    if (verificationToken === null) {
      return null;
    }
    return verificationTokenFromDB(verificationToken);
  }
  
  function verificationTokenFromDB(verificationToken: Doc<"verificationTokens">) {
    return { ...verificationToken, expires: new Date(verificationToken.expires) };
  }
  
  function maybeDate(value: number | undefined) {
    return value === undefined ? null : new Date(value);
  }
  
  function toDB<T extends object>(
    obj: T,
  ): {
    [K in keyof T]: T[K] extends Date
      ? number
      : null extends T[K]
        ? undefined
        : T[K];
  } {
    const result: any = {};
    for (const key in obj) {
      const value = obj[key];
      result[key] =
        value instanceof Date
          ? value.getTime()
          : value === null
            ? undefined
            : value;
    }
    return result;
  }