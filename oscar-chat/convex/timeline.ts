import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create a new timeline event
export const create = mutation({
    args: {
        eventType: v.union(
            v.literal("send_message"),
            v.literal("create_conversation"),
            v.literal("rename_conversation"),
            v.literal("delete_conversation")
        ),
        description: v.string(),
        conversationId: v.optional(v.id("conversations")),
        messageId: v.optional(v.id("messages")),
        metadata: v.optional(v.object({
            oldTitle: v.optional(v.string()),
            newTitle: v.optional(v.string()),
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
            conversationId: args.conversationId,
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
        conversationId: v.id("conversations"),
        messageId: v.id("messages"),
        messagePreview: v.string(),
        conversationTitle: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("timeline_events", {
            userId: args.userId,
            eventType: "send_message",
            description: `Sent message in "${args.conversationTitle}"`,
            timestamp: Date.now(),
            conversationId: args.conversationId,
            messageId: args.messageId,
            metadata: {
                messagePreview: args.messagePreview,
            },
        });
    },
});

// Internal helper function to create a conversation event
export const createConversationEvent = internalMutation({
    args: {
        userId: v.id("users"),
        eventType: v.union(
            v.literal("create_conversation"),
            v.literal("rename_conversation"),
            v.literal("delete_conversation")
        ),
        conversationId: v.optional(v.id("conversations")),
        conversationTitle: v.string(),
        oldTitle: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let description = "";
        let metadata = {};

        switch (args.eventType) {
            case "create_conversation":
                description = `Created conversation "${args.conversationTitle}"`;
                break;
            case "rename_conversation":
                description = `Renamed conversation from "${args.oldTitle}" to "${args.conversationTitle}"`;
                metadata = {
                    oldTitle: args.oldTitle,
                    newTitle: args.conversationTitle,
                };
                break;
            case "delete_conversation":
                description = `Deleted conversation "${args.conversationTitle}"`;
                break;
        }

        return await ctx.db.insert("timeline_events", {
            userId: args.userId,
            eventType: args.eventType,
            description,
            timestamp: Date.now(),
            conversationId: args.conversationId,
            metadata,
        });
    },
});