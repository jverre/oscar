import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create a new timeline event
export const create = mutation({
    args: {
        eventType: v.union(
            v.literal("send_message"),
            v.literal("create_file"),
            v.literal("rename_file"),
            v.literal("delete_file")
        ),
        description: v.string(),
        fileId: v.optional(v.id("files")),
        messageId: v.optional(v.id("messages")),
        metadata: v.optional(v.object({
            messagePreview: v.optional(v.string()),
        })),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            throw new Error("Not authenticated");
        }

        const timelineEventId = await ctx.db.insert("timeline_events", {
            userId,
            eventType: args.eventType,
            description: args.description,
            timestamp: Date.now(),
            fileId: args.fileId,
            messageId: args.messageId,
            metadata: args.metadata,
        });

        return timelineEventId;
    },
});

// List timeline events for the current user
export const list = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const limit = args.limit || 50;

        const events = await ctx.db
            .query("timeline_events")
            .withIndex("by_user_and_timestamp", (q) => 
                q.eq("userId", userId)
            )
            .order("desc")
            .take(limit);

        return events;
    },
});

// Internal helper function to create a send message event
export const createSendMessageEvent = internalMutation({
    args: {
        userId: v.id("users"),
        fileId: v.id("files"),
        messageId: v.id("messages"),
        messagePreview: v.string(),
        fileName: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("timeline_events", {
            userId: args.userId,
            eventType: "send_message",
            description: `Sent message in "${args.fileName}"`,
            timestamp: Date.now(),
            fileId: args.fileId,
            messageId: args.messageId,
            metadata: {
                messagePreview: args.messagePreview,
            },
        });
    },
});

// Internal helper function to create a file event
export const createFileEvent = internalMutation({
    args: {
        userId: v.id("users"),
        eventType: v.union(
            v.literal("create_file"),
            v.literal("rename_file"),
            v.literal("delete_file")
        ),
        fileId: v.optional(v.id("files")),
        fileName: v.string(),
    },
    handler: async (ctx, args) => {
        let description = "";

        switch (args.eventType) {
            case "create_file":
                description = `Created file "${args.fileName}"`;
                break;
            case "rename_file":
                description = `Renamed file to "${args.fileName}"`;
                break;
            case "delete_file":
                description = `Deleted file "${args.fileName}"`;
                break;
        }

        return await ctx.db.insert("timeline_events", {
            userId: args.userId,
            eventType: args.eventType,
            description,
            timestamp: Date.now(),
            fileId: args.fileId,
            metadata: {},
        });
    },
});