import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
  args: {email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    organizationId: v.id("organizations"), userId: v.id("users")},
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const get = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getByEmail = query({
  args: {email: v.string()},
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

export const getByAccount = query({
  args: {provider: v.string(),
    providerAccountId: v.string()},
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("accounts")
      .filter((q) => 
        q.and(
          q.eq(q.field("provider"), args.provider),
          q.eq(q.field("providerAccountId"), args.providerAccountId)
        )
      )
      .first();
    
    if (!account) return null;
    
    return await ctx.db.get(account.userId);
  },
});

export const update = mutation({
  args: {
    userId: v.id("users"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
    return await ctx.db.get(userId);
  },
});

export const current = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});