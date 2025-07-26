import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new message for a file
export const createMessage = mutation({
  args: {
    fileId: v.id("files"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    message: v.bytes(),
  },
  handler: async (ctx, args) => {
    // Verify the file exists and belongs to the organization
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }
    
    if (file.organizationId !== args.organizationId) {
      throw new Error("File does not belong to this organization");
    }
    
    // Get user to verify they belong to the organization
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    if (!("organizationId" in user) || user.organizationId !== args.organizationId) {
      throw new Error("User does not belong to this organization");
    }
    
    // Create the message
    const messageId = await ctx.db.insert("fileMessages", {
      fileId: args.fileId,
      organizationId: args.organizationId,
      message: args.message,
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return messageId;
  },
});

// Get all messages for a file
export const getMessages = query({
  args: {
    fileId: v.id("files"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify the file exists and belongs to the organization
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }
    
    if (file.organizationId !== args.organizationId) {
      throw new Error("File does not belong to this organization");
    }
    
    // Get all messages for the file, ordered by creation time
    const messages = await ctx.db
      .query("fileMessages")
      .withIndex("by_file_created", (q) => q.eq("fileId", args.fileId))
      .order("asc")
      .collect();
    
    return messages;
  },
});

// Get the latest message for a file
export const getLatestMessage = query({
  args: {
    fileId: v.id("files"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Verify the file exists and belongs to the organization
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }
    
    if (file.organizationId !== args.organizationId) {
      throw new Error("File does not belong to this organization");
    }
    
    // Get the most recent message for the file
    const message = await ctx.db
      .query("fileMessages")
      .withIndex("by_file_created", (q) => q.eq("fileId", args.fileId))
      .order("desc")
      .first();
    
    return message;
  },
});

// Update an existing message
export const updateMessage = mutation({
  args: {
    messageId: v.id("fileMessages"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    message: v.bytes(),
  },
  handler: async (ctx, args) => {
    // Get the existing message
    const existingMessage = await ctx.db.get(args.messageId);
    if (!existingMessage) {
      throw new Error("Message not found");
    }
    
    // Verify it belongs to the organization
    if (existingMessage.organizationId !== args.organizationId) {
      throw new Error("Message does not belong to this organization");
    }
    
    // Get user to verify they belong to the organization
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    if (!("organizationId" in user) || user.organizationId !== args.organizationId) {
      throw new Error("User does not belong to this organization");
    }
    
    // Update the message
    await ctx.db.patch(args.messageId, {
      message: args.message,
      updatedAt: Date.now(),
    });
    
    return { success: true };
  },
});

// Delete a message
export const deleteMessage = mutation({
  args: {
    messageId: v.id("fileMessages"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get the existing message
    const existingMessage = await ctx.db.get(args.messageId);
    if (!existingMessage) {
      throw new Error("Message not found");
    }
    
    // Verify it belongs to the organization
    if (existingMessage.organizationId !== args.organizationId) {
      throw new Error("Message does not belong to this organization");
    }
    
    // Get user to verify they belong to the organization
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    if (!("organizationId" in user) || user.organizationId !== args.organizationId) {
      throw new Error("User does not belong to this organization");
    }
    
    // Delete the message
    await ctx.db.delete(args.messageId);
    
    return { success: true };
  },
});

// Delete all messages for a file (useful when deleting a file)
export const deleteAllMessagesForFile = mutation({
  args: {
    fileId: v.id("files"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Verify the file exists and belongs to the organization
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }
    
    if (file.organizationId !== args.organizationId) {
      throw new Error("File does not belong to this organization");
    }
    
    // Get user to verify they belong to the organization
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    if (!("organizationId" in user) || user.organizationId !== args.organizationId) {
      throw new Error("User does not belong to this organization");
    }
    
    // Get all messages for the file
    const messages = await ctx.db
      .query("fileMessages")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .collect();
    
    // Delete each message
    for (const message of messages) {
      await ctx.db.delete(message._id);
    }
    
    return { success: true, deletedCount: messages.length };
  },
});