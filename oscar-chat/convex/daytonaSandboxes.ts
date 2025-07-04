import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Simple mutation to create a sandbox record
export const createSandboxRecord = internalMutation({
  args: {
    userId: v.id("users"),
    sandboxId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Create the sandbox record
    return await ctx.db.insert("daytonaSandboxes", {
      userId: args.userId,
      sandboxId: args.sandboxId,
      createdAt: now,
      lastUsedAt: now,
    });
  },
});

export const getSandbox = internalQuery({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("daytonaSandboxes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Ensure user has a sandbox (called from auth)
export const ensureUserHasSandbox = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user already has a sandbox
    const existingSandbox = await ctx.db
      .query("daytonaSandboxes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!existingSandbox) {
      // Schedule sandbox creation
      await ctx.scheduler.runAfter(0, internal.daytonaNode.createSandbox, {
        userId: args.userId,
      });
    }
  },
});