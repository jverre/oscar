import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { generateId } from "ai";

export const create = mutation({
  args: {
    title: v.optional(v.string()),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    pluginId: v.optional(v.id("plugins")),
  },
  handler: async (ctx, args) => {
    const chatId = generateId();
    
    await ctx.db.insert("chats", {
      chatId: chatId,
      title: args.title || "New Chat",
      organizationId: args.organizationId,
      userId: args.userId,
      pluginId: args.pluginId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return chatId;
  },
});

export const list = query({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    pluginId: v.optional(v.id("plugins")),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("chats")
      .withIndex("by_org_user", (q) => 
        q.eq("organizationId", args.organizationId).eq("userId", args.userId)
      );

    if (args.pluginId) {
      query = ctx.db
        .query("chats")
        .withIndex("by_plugin", (q) => q.eq("pluginId", args.pluginId));
    }

    return await query
      .order("desc")
      .collect();
  },
});

export const get = query({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .first();
  },
});

// Load all messages for a chat, ordered by creation time
export const loadMessages = query({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat_created", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
    
    // Return messages in exact AI SDK format - no transformation
    return messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
      experimental_attachments: msg.experimental_attachments,
      experimental_providerMetadata: msg.experimental_providerMetadata,
    }));
  },
});

// Load all messages for a plugin (across all chats)
export const loadMessagesByPlugin = query({
  args: {
    pluginId: v.id("plugins"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_plugin", (q) => q.eq("pluginId", args.pluginId))
      .order("asc")
      .collect();

    // Return messages in exact AI SDK format - no transformation
    return messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
      experimental_attachments: msg.experimental_attachments,
      experimental_providerMetadata: msg.experimental_providerMetadata,
    }));
  },
});

// Add a single message to a chat - AI SDK format
export const addMessage = mutation({
  args: {
    chatId: v.string(),
    pluginId: v.optional(v.id("plugins")),
    message: v.any(), // Accept full AI SDK message object
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      id: args.message.id,
      chatId: args.chatId,
      pluginId: args.pluginId,
      role: args.message.role,
      content: args.message.content,
      createdAt: args.message.createdAt,
      experimental_attachments: args.message.experimental_attachments,
      experimental_providerMetadata: args.message.experimental_providerMetadata,
    });
  },
});

// Add multiple messages at once - AI SDK format
export const addMessages = mutation({
  args: {
    chatId: v.string(),
    pluginId: v.optional(v.id("plugins")),
    messages: v.array(v.any()), // Accept array of AI SDK message objects
  },
  handler: async (ctx, args) => {
    for (const message of args.messages) {
      await ctx.db.insert("messages", {
        id: message.id,
        chatId: args.chatId,
        pluginId: args.pluginId,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt,
        experimental_attachments: message.experimental_attachments,
        experimental_providerMetadata: message.experimental_providerMetadata,
      });
    }
  },
});

// Update an existing message - AI SDK format
export const updateMessage = mutation({
  args: {
    messageId: v.string(),
    message: v.any(), // Accept full AI SDK message object
  },
  handler: async (ctx, args) => {
    // Find the existing message
    const existingMessage = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("id"), args.messageId))
      .first();
    
    if (existingMessage) {
      await ctx.db.patch(existingMessage._id, {
        content: args.message.content,
        experimental_attachments: args.message.experimental_attachments,
        experimental_providerMetadata: args.message.experimental_providerMetadata,
      });
    }
  },
});

export const updateTitle = mutation({
  args: {
    chatId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .first();

    if (chat) {
      await ctx.db.patch(chat._id, {
        title: args.title,
        updatedAt: Date.now(),
      });
    }
  },
});

export const deleteChat = mutation({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    // Delete the chat
    const chat = await ctx.db
      .query("chats")
      .withIndex("by_chatId", (q) => q.eq("chatId", args.chatId))
      .first();

    if (chat) {
      await ctx.db.delete(chat._id);
    }

    // Delete all messages for this chat
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
  },
}); 