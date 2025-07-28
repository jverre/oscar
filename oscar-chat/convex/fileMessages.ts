import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOrgMember } from "./authUtils";

// Create or update message for a file (upsert pattern)
export const createMessage = mutation({
  args: {
    fileId: v.id("files"),
    organizationId: v.id("organizations"),
    message: v.bytes(),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization and get user info
    const userWithOrg = await requireOrgMember(ctx, args.organizationId);
    
    // Verify the file exists and belongs to the organization
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }
    
    if (file.organizationId !== args.organizationId) {
      throw new Error("File does not belong to this organization");
    }
    
    // Check if a message already exists for this file
    const existingMessage = await ctx.db
      .query("fileMessages")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .first();
    
    let messageId;
    
    if (existingMessage) {
      // Update existing message
      await ctx.db.patch(existingMessage._id, {
        message: args.message,
        updatedAt: Date.now(),
      });
      messageId = existingMessage._id;
    } else {
      // Create new message
      messageId = await ctx.db.insert("fileMessages", {
        fileId: args.fileId,
        organizationId: args.organizationId,
        message: args.message,
        createdBy: userWithOrg._id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    return messageId;
  },
});

// Get the message for a file (single message per file)
export const getMessage = query({
  args: {
    fileId: v.id("files"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);
    
    // Verify the file exists and belongs to the organization
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }
    
    if (file.organizationId !== args.organizationId) {
      throw new Error("File does not belong to this organization");
    }
    
    // Get the message for the file (only one per file now)
    const message = await ctx.db
      .query("fileMessages")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .first();
    
    return message;
  },
});


// Update an existing message
export const updateMessage = mutation({
  args: {
    messageId: v.id("fileMessages"),
    organizationId: v.id("organizations"),
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
    
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);
    
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
    
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);
    
    // Delete the message
    await ctx.db.delete(args.messageId);
    
    return { success: true };
  },
});

// Delete the message for a file (useful when deleting a file)
export const deleteMessageForFile = mutation({
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
    
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);
    
    // Get the message for the file
    const message = await ctx.db
      .query("fileMessages")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .first();
    
    if (message) {
      await ctx.db.delete(message._id);
      return { success: true, deletedCount: 1 };
    }
    
    return { success: true, deletedCount: 0 };
  },
});