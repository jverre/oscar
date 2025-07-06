import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Query to get user's Claude Code sessions
export const getUserSessions = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("claudeSessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Query to get active session for user
export const getActiveSession = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("claudeSessions")
      .withIndex("by_user_status", (q) => 
        q.eq("userId", args.userId).eq("status", "running")
      )
      .first();
  },
});

// Mutation to start a new Claude Code session
export const startClaudeCodeSession = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user already has a running session
    const existingSession = await ctx.db
      .query("claudeSessions")
      .withIndex("by_user_status", (q) => 
        q.eq("userId", args.userId).eq("status", "running")
      )
      .first();

    if (existingSession) {
      // Update last accessed time
      await ctx.db.patch(existingSession._id, {
        lastAccessedAt: Date.now(),
      });
      return {
        success: true,
        sessionId: existingSession._id,
        previewUrl: existingSession.previewUrl,
        message: "Using existing Claude Code session",
      };
    }

    // Get user's sandbox
    const sandbox = await ctx.db
      .query("daytonaSandboxes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!sandbox) {
      throw new Error("No Daytona sandbox found for user");
    }

    // Create new session record with starting status
    const sessionId = await ctx.db.insert("claudeSessions", {
      userId: args.userId,
      sandboxId: sandbox.sandboxId,
      sessionId: `web-terminal-${Date.now()}`,
      status: "starting",
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    });

    // Schedule the session setup
    await ctx.scheduler.runAfter(0, internal.daytonaNode.setupClaudeCodeSession, {
      sessionDbId: sessionId,
      userId: args.userId,
      sandboxId: sandbox.sandboxId,
    });

    return {
      success: true,
      sessionId,
      message: "Starting Claude Code session...",
    };
  },
});

// Mutation to stop a Claude Code session
export const stopClaudeCodeSession = mutation({
  args: {
    sessionId: v.id("claudeSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      status: "stopped",
      lastAccessedAt: Date.now(),
    });

    return { success: true };
  },
});

// Internal mutation to update session status
export const updateSessionStatus = internalMutation({
  args: {
    sessionId: v.id("claudeSessions"),
    status: v.union(v.literal("starting"), v.literal("running"), v.literal("stopped"), v.literal("error")),
    sessionIdValue: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    previewToken: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
      lastAccessedAt: Date.now(),
    };

    if (args.sessionIdValue) {
      updates.sessionId = args.sessionIdValue;
    }

    if (args.previewUrl) {
      updates.previewUrl = args.previewUrl;
    }

    if (args.previewToken) {
      updates.previewToken = args.previewToken;
    }

    if (args.metadata) {
      updates.metadata = args.metadata;
    }

    await ctx.db.patch(args.sessionId, updates);
  },
});