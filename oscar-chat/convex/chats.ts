import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
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

