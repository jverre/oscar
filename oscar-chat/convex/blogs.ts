import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get or create a blog document for a file
export const getOrCreate = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has access to this file
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    const user = await ctx.db.get(userId);
    if (!user || file.organizationId !== user.organizationId) {
      throw new Error("Access denied");
    }

    // Check if blog already exists
    const existingBlog = await ctx.db
      .query("blogs")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .order("desc")
      .first();

    if (existingBlog) {
      return existingBlog;
    }

    // Create new blog document
    const now = Date.now();
    const blogId = await ctx.db.insert("blogs", {
      fileId: args.fileId,
      content: {
        type: "doc",
        content: [],
      },
      version: 1,
      lastEditedBy: userId,
      lastEditedAt: now,
      createdAt: now,
    });

    const blog = await ctx.db.get(blogId);
    return blog;
  },
});

// Get blog content for a file
export const get = query({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Check if user has access to this file
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user || file.organizationId !== user.organizationId) {
      return null;
    }

    // Get the latest blog version
    const blog = await ctx.db
      .query("blogs")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .order("desc")
      .first();

    return blog;
  },
});

// Update blog content
export const update = mutation({
  args: {
    fileId: v.id("files"),
    content: v.object({
      type: v.literal("doc"),
      content: v.array(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has access to this file
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    const user = await ctx.db.get(userId);
    if (!user || file.organizationId !== user.organizationId) {
      throw new Error("Access denied");
    }

    // Get current blog
    const currentBlog = await ctx.db
      .query("blogs")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .order("desc")
      .first();

    if (!currentBlog) {
      throw new Error("Blog not found");
    }

    const now = Date.now();

    // Update the blog document
    await ctx.db.patch(currentBlog._id, {
      content: args.content,
      version: currentBlog.version + 1,
      lastEditedBy: userId,
      lastEditedAt: now,
    });

    // Update file's last message timestamp to reflect activity
    await ctx.db.patch(args.fileId, {
      lastMessageAt: now,
    });

    return { success: true };
  },
});

// Delete all blog versions for a file (used when file is deleted)
export const deleteByFileId = mutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has access to this file
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    const user = await ctx.db.get(userId);
    if (!user || file.organizationId !== user.organizationId) {
      throw new Error("Access denied");
    }

    // Delete all blog versions
    const blogs = await ctx.db
      .query("blogs")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .collect();

    for (const blog of blogs) {
      await ctx.db.delete(blog._id);
    }

    return { success: true };
  },
});