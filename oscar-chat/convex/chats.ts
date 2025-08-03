import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { requireOrgMember } from "./authUtils";

// Load all messages for a plugin
export const loadMessagesByPlugin = query({
  args: { 
    pluginId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);
    
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_plugin", (q) => q.eq("pluginId", args.pluginId))
      .collect();
    
    // Return raw AI SDK messages, handle undefined case
    return (messages || []).map(msg => msg.aiSDKMessage);
  },
});

// Load messages with streaming data for real-time updates
export const loadMessagesWithStreaming = query({
  args: { 
    pluginId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);
    
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_plugin", (q) => q.eq("pluginId", args.pluginId))
      .collect();
    
    // Return messages with streaming data
    const result = (messages || []).map(msg => {
      // If message is streaming, update content from streamingBody
      if (msg.status === 'streaming' && msg.streamingBody) {
        return {
          ...msg.aiSDKMessage,
          content: msg.streamingBody,
          status: msg.status,
        };
      }
      return {
        ...msg.aiSDKMessage,
        status: msg.status || 'complete',
      };
    });
    
    return result;
  },
});


// Add multiple messages at once - AI SDK format
export const addMessages = internalMutation({
  args: {
    pluginId: v.string(),
    messages: v.array(v.any()), // Accept array of AI SDK message objects
  },
  handler: async (ctx, args) => {
    for (const message of args.messages) {
      // Skip messages with empty or undefined IDs
      if (!message.id || message.id.trim() === '') {
        continue;
      }
      
      // Check if message already exists
      const existing = await ctx.db
        .query("messages")
        .withIndex("by_plugin_msgId", (q) => 
          q.eq("pluginId", args.pluginId).eq("msgId", message.id)
        )
        .first();
      
      // Only insert if not already exists (deduplication)
      if (!existing) {
        await ctx.db.insert("messages", {
          pluginId: args.pluginId,
          msgId: message.id,
          aiSDKMessage: message, // Store complete message as-is
        });
      }
    }
  },
});

// Stop streaming messages for a plugin
export const stopStreaming = mutation({
  args: { 
    pluginId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);
    
    // Find all streaming or pending messages for this plugin
    const activeMessages = await ctx.db
      .query("messages")
      .withIndex("by_plugin", (q) => q.eq("pluginId", args.pluginId))
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "streaming"),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();
    
    // Update all active messages to cancelled
    for (const message of activeMessages) {
      await ctx.db.patch(message._id, {
        status: "cancelled" as any,
      });
    }
  },
});

// Clear all messages for a plugin
export const clearMessagesByPlugin = mutation({
  args: { 
    pluginId: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);
    
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_plugin", (q) => q.eq("pluginId", args.pluginId))
      .collect();
    
    // Delete all messages for this plugin
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
  },
});

// Get message status - internal query for checking cancellation
export const getMessageStatus = internalQuery({
  args: {
    pluginId: v.string(),
    messageId: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_plugin_msgId", (q) => 
        q.eq("pluginId", args.pluginId).eq("msgId", args.messageId)
      )
      .first();
    
    return message ? { status: message.status } : null;
  },
});

// Update message status
export const updateMessageStatus = internalMutation({
  args: {
    pluginId: v.string(),
    messageId: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("streaming"),
      v.literal("complete"),
      v.literal("error"),
      v.literal("cancelled")
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_plugin_msgId", (q) => 
        q.eq("pluginId", args.pluginId).eq("msgId", args.messageId)
      )
      .first();
    
    if (message) {
      await ctx.db.patch(message._id, {
        status: args.status,
        ...(args.error && { error: args.error }),
      });
    }
  },
});

// Update streaming content progressively
export const updateStreamingContent = internalMutation({
  args: {
    pluginId: v.string(),
    messageId: v.string(),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_plugin_msgId", (q) => 
        q.eq("pluginId", args.pluginId).eq("msgId", args.messageId)
      )
      .first();
    
    if (message) {
      await ctx.db.patch(message._id, {
        streamingBody: args.content,
      });
    }
  },
});

// Finalize message with complete AI SDK response
export const finalizeMessage = internalMutation({
  args: {
    pluginId: v.string(),
    messageId: v.string(),
    aiSDKMessage: v.any(),
    status: v.union(v.literal("complete"), v.literal("streaming")),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_plugin_msgId", (q) => 
        q.eq("pluginId", args.pluginId).eq("msgId", args.messageId)
      )
      .first();
    
    if (message) {
      await ctx.db.patch(message._id, {
        aiSDKMessage: args.aiSDKMessage,
        status: args.status,
        streamingBody: args.status === "complete" ? undefined : message.streamingBody, // Clear streaming body only when complete
      });
    }
  },
});

