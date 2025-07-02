import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { paginationOptsValidator } from "convex/server";

// Helper function to extract searchable text from message content
const extractSearchableText = (content: any[]): string => {
    if (!Array.isArray(content)) return "";
    
    return content
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(" ")
        .trim();
};

// List messages in a file with pagination
export const list = query({
  args: {
    fileId: v.id("files"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the file exists and user has access
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    // TODO: Add proper team/org membership check here

    return await ctx.db
      .query("messages")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Create a new user message
export const createUserMessage = mutation({
  args: {
    fileId: v.id("files"),
    content: v.array(v.union(
      v.object({ type: v.literal("text"), text: v.string() }),
      v.object({ type: v.literal("tool-call"), toolCallId: v.string(), toolName: v.string(), args: v.any() }),
      v.object({ type: v.literal("tool-result"), toolCallId: v.string(), result: v.any(), isError: v.optional(v.boolean()) })
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the file exists and user has access
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // TODO: Add proper team/org membership check here

    const now = Date.now();

    // Extract searchable text from content
    const searchableText = extractSearchableText(args.content);

    // Insert user message
    const messageId = await ctx.db.insert("messages", {
      fileId: args.fileId,
      userId,
      role: "user",
      content: args.content,
      searchableText,
      createdAt: now,
    });

    // Update file's lastMessageAt
    await ctx.db.patch(args.fileId, {
      lastMessageAt: now,
    });

    // Record timeline event - extract text safely
    const textContent = args.content
      .filter(part => part && part.type === 'text')
      .map(part => (part as { type: 'text'; text: string }).text)
      .filter(Boolean)
      .join(' ')
      .trim();
    const messagePreview = textContent.length > 100 ? textContent.substring(0, 100) + "..." : textContent || "[Message with tool calls]";
    
    await ctx.runMutation(internal.timeline.createSendMessageEvent, {
      userId,
      fileId: args.fileId,
      messageId,
      messagePreview,
      fileName: file.name,
    });

    return messageId;
  },
});

// Create a new assistant message (for streaming)
export const createAssistantMessage = internalMutation({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the file exists and user has access
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // TODO: Add proper team/org membership check here

    const now = Date.now();

    // Create placeholder assistant message
    const messageId = await ctx.db.insert("messages", {
      fileId: args.fileId,
      userId,
      role: "assistant",
      content: [{ type: "text", text: "" }],
      searchableText: "",
      provider: "openrouter",
      isStreaming: true,
      createdAt: now,
    });

    // Update file's lastMessageAt and set isStreaming to true
    await ctx.db.patch(args.fileId, {
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
    content: v.array(v.union(
      v.object({ type: v.literal("text"), text: v.string() }),
      v.object({ type: v.literal("tool-call"), toolCallId: v.string(), toolName: v.string(), args: v.any() }),
      v.object({ type: v.literal("tool-result"), toolCallId: v.string(), result: v.any(), isError: v.optional(v.boolean()) })
    )),
    isStreaming: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Extract searchable text from updated content
    const searchableText = extractSearchableText(args.content);

    await ctx.db.patch(args.messageId, {
      content: args.content,
      searchableText,
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

    // Set file isStreaming to false
    await ctx.db.patch(message.fileId, {
      isStreaming: false,
    });

    return args.messageId;
  },
});

// Internal create message (for HTTP actions that already have authenticated user)
export const internalCreateMessage = internalMutation({
  args: {
    userId: v.id("users"),
    fileId: v.id("files"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.array(v.union(
      v.object({ type: v.literal("text"), text: v.string() }),
      v.object({ type: v.literal("tool-call"), toolCallId: v.string(), toolName: v.string(), args: v.any() }),
      v.object({ type: v.literal("tool-result"), toolCallId: v.string(), result: v.any(), isError: v.optional(v.boolean()) })
    )),
    model: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Verify the file exists
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new Error("File not found");
    }

    const now = Date.now();

    // Extract searchable text from content
    const searchableText = extractSearchableText(args.content);

    // Insert message with only schema-compliant metadata
    const messageId = await ctx.db.insert("messages", {
      fileId: args.fileId,
      userId: args.userId,
      role: args.role,
      content: args.content,
      searchableText,
      model: args.model,
      createdAt: now,
      metadata: {
        tokenCount: args.metadata?.claudeOriginal?.tokenCount || args.metadata?.tokenCount,
        latency: args.metadata?.latency,
        error: args.metadata?.error,
        finishReason: args.metadata?.finishReason,
      },
    });

    // Update file's lastMessageAt
    // await ctx.db.patch(args.fileId, {
    //   lastMessageAt: now,
    // });

    // Record timeline event - extract text safely
    const textContent = args.content
      .filter(part => part && part.type === 'text')
      .map(part => (part as { type: 'text'; text: string }).text)
      .filter(Boolean)
      .join(' ')
      .trim();
    const messagePreview = textContent.length > 100 ? textContent.substring(0, 100) + "..." : textContent || "[Message with tool calls]";
    
    await ctx.runMutation(internal.timeline.createSendMessageEvent, {
      userId: args.userId,
      fileId: args.fileId,
      messageId,
      messagePreview,
      fileName: file.name,
    });

    return messageId;
  },
});

// List messages in a public file (no authentication required)
export const listPublic = query({
  args: {
    fileId: v.id("files"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    // Verify the file exists and is public
    const file = await ctx.db.get(args.fileId);
    if (!file || file.visibility !== "public") {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.db
      .query("messages")
      .withIndex("by_file", (q) => q.eq("fileId", args.fileId))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Get stream text for a specific stream/message ID
export const getStreamText = query({
  args: {
    streamId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // For now, return a basic structure since streaming is handled differently
    // This is a placeholder to satisfy the useStream hook
    return {
      text: "",
      status: "done" as "pending" | "streaming" | "done" | "error" | "timeout",
      messageId: undefined,
    };
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