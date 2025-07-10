import { partial } from "convex-helpers/validators";
import {
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  accountSchema,
  authenticatorSchema,
  sessionSchema,
  userSchema,
  verificationTokenSchema,
} from "./schema";

const adapterQuery = customQuery(query, {
  args: { secret: v.string() },
  input: async (_ctx, { secret }) => {
    checkSecret(secret);
    return { ctx: {}, args: {} };
  },
});

const adapterMutation = customMutation(mutation, {
  args: { secret: v.string() },
  input: async (_ctx, { secret }) => {
    checkSecret(secret);
    return { ctx: {}, args: {} };
  },
});

function checkSecret(secret: string) {
	if (process.env.CONVEX_AUTH_ADAPTER_SECRET === undefined) {
    throw new Error(
      "Missing CONVEX_AUTH_ADAPTER_SECRET Convex environment variable",
    );
  }
  if (secret !== process.env.CONVEX_AUTH_ADAPTER_SECRET) {
    throw new Error("Adapter API called without correct secret value");
  }
}

export const createAuthenticator = adapterMutation({
  args: { authenticator: v.object(authenticatorSchema) },
  handler: async (ctx, args) => {
    return await ctx.db.insert("authenticators", args.authenticator);
  },
});

export const createSession = adapterMutation({
  args: { session: v.object(sessionSchema) },
  handler: async (ctx, { session }) => {
    console.log("createSession called with:", session);
    
    try {
      const sessionId = await ctx.db.insert("sessions", session);
      console.log("Session created with ID:", sessionId);
      return sessionId;
    } catch (error) {
      console.error("Error creating session:", error);
      throw error;
    }
  },
});

export const createUser = adapterMutation({
  args: { 
    user: v.object({
      email: v.string(),
      name: v.optional(v.string()),
      emailVerified: v.optional(v.number()),
      image: v.optional(v.string()),
      createdAt: v.number(),
    })
  },
  handler: async (ctx, { user }) => {
    console.log("createUser called with:", user);
    
    try {
      // Create a personal organization for the new user
      const userSlug = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      console.log("Creating org with subdomain:", userSlug);
      
      const orgId = await ctx.db.insert("organizations", {
        name: user.name || user.email,
        domain: "localhost:3000",
        subdomain: userSlug,
        type: "personal",
        createdAt: Date.now(),
      });
      
      console.log("Organization created with ID:", orgId);
      
      // Create the user with their personal organization
      const userId = await ctx.db.insert("users", {
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image,
        organizationId: orgId,
        createdAt: user.createdAt,
      });
      
      console.log("User created with ID:", userId);
      return userId;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  },
});

export const createVerificationToken = adapterMutation({
  args: { verificationToken: v.object(verificationTokenSchema) },
  handler: async (ctx, { verificationToken }) => {
    return await ctx.db.insert("verificationTokens", verificationToken);
  },
});

export const deleteSession = adapterMutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("sessionToken", (q) => q.eq("sessionToken", args.sessionToken))
      .unique();
    if (session === null) {
      return null;
    }
    await ctx.db.delete(session._id);
    return session;
  },
});

export const deleteUser = adapterMutation({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    const user = await ctx.db.get(id);
    if (user === null) {
      return null;
    }
    await ctx.db.delete(id);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("userId", (q) => q.eq("userId", id))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
    const accounts = await ctx.db
      .query("accounts")
      .withIndex("userId", (q) => q.eq("userId", id))
      .collect();
    for (const account of accounts) {
      await ctx.db.delete(account._id);
    }
    return user;
  },
});

export const getAccount = adapterQuery({
  args: { provider: v.string(), providerAccountId: v.string() },
  handler: async (ctx, { provider, providerAccountId }) => {
    return await ctx.db
      .query("accounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", provider).eq("providerAccountId", providerAccountId),
      )
      .unique();
  },
});

export const getAuthenticator = adapterQuery({
  args: { credentialID: v.string() },
  handler: async (ctx, { credentialID }) => {
    return await ctx.db
      .query("authenticators")
      .withIndex("credentialID", (q) => q.eq("credentialID", credentialID))
      .unique();
  },
});

export const getSessionAndUser = adapterQuery({
  args: { sessionToken: v.string() },
  handler: async (ctx, { sessionToken }) => {
    console.log("getSessionAndUser called with sessionToken:", sessionToken);
    
    const session = await ctx.db
      .query("sessions")
      .withIndex("sessionToken", (q) => q.eq("sessionToken", sessionToken))
      .unique();
    
    console.log("Session found:", session);
    
    if (session === null) {
      console.log("No session found, returning null");
      return null;
    }
    
    const user = await ctx.db.get(session.userId);
    console.log("User found:", user);
    
    if (user === null) {
      console.log("No user found, returning null");
      return null;
    }
    
    console.log("Returning session and user");
    return { session, user };
  },
});

export const getUser = adapterQuery({
  args: { id: v.id("users") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

export const getUserByAccount = adapterQuery({
  args: { provider: v.string(), providerAccountId: v.string() },
  handler: async (ctx, { provider, providerAccountId }) => {
    console.log("getUserByAccount called with:", { provider, providerAccountId });
    
    const account = await ctx.db
      .query("accounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", provider).eq("providerAccountId", providerAccountId),
      )
      .unique();
    
    console.log("Account found:", account);
    
    if (account === null) {
      console.log("No account found, returning null");
      return null;
    }
    
    const user = await ctx.db.get(account.userId);
    console.log("User found:", user);
    return user;
  },
});

export const getUserByEmail = adapterQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();
  },
});

export const linkAccount = adapterMutation({
  args: { account: v.object(accountSchema) },
  handler: async (ctx, { account }) => {
    console.log("linkAccount called with:", account);
    
    try {
      const id = await ctx.db.insert("accounts", account);
      console.log("Account linked with ID:", id);
      
      const linkedAccount = await ctx.db.get(id);
      console.log("Retrieved linked account:", linkedAccount);
      
      return linkedAccount;
    } catch (error) {
      console.error("Error linking account:", error);
      throw error;
    }
  },
});

export const listAuthenticatorsByUserId = adapterQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("authenticators")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const unlinkAccount = adapterMutation({
  args: { provider: v.string(), providerAccountId: v.string() },
  handler: async (ctx, { provider, providerAccountId }) => {
    const account = await ctx.db
      .query("accounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", provider).eq("providerAccountId", providerAccountId),
      )
      .unique();
    if (account === null) {
      return null;
    }
    await ctx.db.delete(account._id);
    return account;
  },
});

export const updateAuthenticatorCounter = adapterMutation({
  args: { credentialID: v.string(), newCounter: v.number() },
  handler: async (ctx, { credentialID, newCounter }) => {
    const authenticator = await ctx.db
      .query("authenticators")
      .withIndex("credentialID", (q) => q.eq("credentialID", credentialID))
      .unique();
    if (authenticator === null) {
      throw new Error(
        `Authenticator not found for credentialID: ${credentialID}`,
      );
    }
    await ctx.db.patch(authenticator._id, { counter: newCounter });
    return { ...authenticator, counter: newCounter };
  },
});

export const updateSession = adapterMutation({
  args: {
    session: v.object({
      expires: v.number(),
      sessionToken: v.string(),
    }),
  },
  handler: async (ctx, { session }) => {
    const existingSession = await ctx.db
      .query("sessions")
      .withIndex("sessionToken", (q) =>
        q.eq("sessionToken", session.sessionToken),
      )
      .unique();
    if (existingSession === null) {
      return null;
    }
    await ctx.db.patch(existingSession._id, session);
  },
});

export const updateUser = adapterMutation({
  args: {
    user: v.object({
      id: v.id("users"),
      ...partial(userSchema),
    }),
  },
  handler: async (ctx, { user: { id, ...data } }) => {
    const user = await ctx.db.get(id);
    if (user === null) {
      return;
    }
    await ctx.db.patch(user._id, data);
  },
});

export const useVerificationToken = adapterMutation({
  args: { identifier: v.string(), token: v.string() },
  handler: async (ctx, { identifier, token }) => {
    const verificationToken = await ctx.db
      .query("verificationTokens")
      .withIndex("identifierToken", (q) =>
        q.eq("identifier", identifier).eq("token", token),
      )
      .unique();
    if (verificationToken === null) {
      return null;
    }
    await ctx.db.delete(verificationToken._id);
    return verificationToken;
  },
});