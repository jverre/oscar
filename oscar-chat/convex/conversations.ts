import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create a new conversation
export const create = mutation({
  args: {
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const title = args.title || `Chat ${new Date(now).toLocaleString()}`;

    const conversationId = await ctx.db.insert("conversations", {
      userId,
      title,
      lastMessageAt: now,
      createdAt: now,
      isStreaming: false,
    });

    // Record timeline event
    await ctx.runMutation(internal.timeline.createConversationEvent, {
      userId,
      eventType: "create_conversation",
      conversationId,
      conversationTitle: title,
    });

    return conversationId;
  },
});

// List all conversations for the current user
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return conversations;
  },
});

// Get a specific conversation
export const get = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      return null;
    }

    return conversation;
  },
});

// Update conversation title
export const updateTitle = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    await ctx.db.patch(args.conversationId, {
      title: args.title,
    });

    // Record timeline event
    await ctx.runMutation(internal.timeline.createConversationEvent, {
      userId,
      eventType: "rename_conversation",
      conversationId: args.conversationId,
      conversationTitle: args.title,
      oldTitle: conversation.title,
    });
  },
});

// General update function for conversations
export const update = mutation({
  args: {
    conversationId: v.id("conversations"),
    title: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    parentPath: v.optional(v.string()),
    isStreaming: v.optional(v.boolean()),
    metadata: v.optional(v.object({
      model: v.optional(v.string()),
      tokenCount: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (args.title !== undefined) updateData.title = args.title;
    if (args.lastMessageAt !== undefined) updateData.lastMessageAt = args.lastMessageAt;
    if (args.parentPath !== undefined) updateData.parentPath = args.parentPath;
    if (args.isStreaming !== undefined) updateData.isStreaming = args.isStreaming;
    if (args.metadata !== undefined) updateData.metadata = args.metadata;

    await ctx.db.patch(args.conversationId, updateData);
  },
});

// Delete a conversation
export const remove = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    // Delete all messages in the conversation first
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Record timeline event before deletion
    await ctx.runMutation(internal.timeline.createConversationEvent, {
      userId,
      eventType: "delete_conversation",
      conversationTitle: conversation.title,
    });

    // Delete the conversation
    await ctx.db.delete(args.conversationId);
  },
});

