import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export const create = mutation({
  args: {
    name: v.string(),
    domain: v.string(),
    subdomain: v.string(),
    type: v.union(v.literal("personal"), v.literal("company")),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("organizations", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getBySubdomain = query({
  args: {subdomain: v.string()},
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("subdomain"), args.subdomain))
      .first();
  },
});

// Get organization by name
export const getByName = query({
  args: {
    name: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    // Find organization by name
    const organization = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (!organization) {
      return null;
    }

    // Verify user has access to this organization
    if (organization._id !== user.organizationId) {
      return null;
    }

    return organization;
  },
});

// Get current user's organization
export const getCurrentUserOrg = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }
    return await ctx.db.get(user.organizationId);
  },
});

// Get organization by name (public access for public files)
export const getByNamePublic = query({
  args: {name: v.string()},
  handler: async (ctx, args) => {
    // Find organization by name (no authentication required)
    const organization = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    return organization;
  },
});


// Check if current user belongs to organization by subdomain
export const userBelongsToSubdomain = query({
  args: {
    subdomain: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return false;
    }

    const userOrg = await ctx.db.get(user.organizationId);
    if (!userOrg) {
      return false;
    }

    return userOrg.subdomain === args.subdomain;
  },
});

// Get organization by subdomain (public access for public files)
export const getBySubdomainPublic = query({
  args: {subdomain: v.string()},
  handler: async (ctx, args) => {
    // Find organization by subdomain (no authentication required)
    const organization = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("subdomain"), args.subdomain))
      .first();

    return organization;
  },
});