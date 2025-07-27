import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Load all messages for a plugin
export const loadMessagesByPlugin = query({
  args: { 
    pluginId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_plugin", (q) => q.eq("pluginId", args.pluginId))
      .collect();
    
    // Return raw AI SDK messages, handle undefined case
    return (messages || []).map(msg => msg.aiSDKMessage);
  },
});


// Add multiple messages at once - AI SDK format
export const addMessages = mutation({
  args: {
    pluginId: v.string(),
    messages: v.array(v.any()), // Accept array of AI SDK message objects
  },
  handler: async (ctx, args) => {
    for (const message of args.messages) {
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

