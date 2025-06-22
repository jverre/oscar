import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// List messages in a conversation
export const list = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the conversation belongs to the user
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      return null;
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .order("asc")
      .collect();

    return messages;
  },
});

// Create a new user message
export const createUserMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the conversation belongs to the user
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    const now = Date.now();

    // Insert user message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      role: "user",
      content: args.content,
      createdAt: now,
    });

    // Update conversation's lastMessageAt
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
    });

    // Record timeline event
    const messagePreview = args.content.length > 100 
      ? args.content.substring(0, 100) + "..."
      : args.content;
    
    await ctx.runMutation(internal.timeline.createSendMessageEvent, {
      userId,
      conversationId: args.conversationId,
      messageId,
      messagePreview,
      conversationTitle: conversation.title,
    });

    return messageId;
  },
});

// Create a new assistant message (for streaming)
export const createAssistantMessage = internalMutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the conversation belongs to the user
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.userId !== userId) {
      throw new Error("Conversation not found");
    }

    const now = Date.now();

    // Create placeholder assistant message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      userId,
      role: "assistant",
      content: "",
      provider: "openrouter",
      isStreaming: true,
      createdAt: now,
    });

    // Update conversation's lastMessageAt and set isStreaming to true
    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      isStreaming: true,
    });

    return messageId;
  },
});

// Update message content (for streaming)
export const updateMessageContent = internalMutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
    isStreaming: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      content: args.content,
      ...(args.isStreaming !== undefined && { isStreaming: args.isStreaming }),
    });
  },
});

// Finalize streaming message
export const finalizeMessage = internalMutation({
  args: {
    messageId: v.id("messages"),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) {
      throw new Error("Message not found");
    }

    // Update message
    await ctx.db.patch(args.messageId, {
      isStreaming: false,
      ...(args.error && { metadata: { error: args.error } }),
    });

    // Set conversation isStreaming to false
    await ctx.db.patch(message.conversationId, {
      isStreaming: false,
    });

    return args.messageId;
  },
});

// Get a specific message
export const get = query({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const message = await ctx.db.get(args.messageId);
    if (!message || message.userId !== userId) {
      throw new Error("Message not found");
    }

    return message;
  },
});