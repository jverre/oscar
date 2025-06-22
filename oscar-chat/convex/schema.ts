import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";


export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"]),

  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    parentPath: v.optional(v.string()), // For file system-like organization
    isStreaming: v.optional(v.boolean()), // Track if conversation is currently streaming
    metadata: v.optional(v.object({
      model: v.optional(v.string()),
      tokenCount: v.optional(v.number()),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_parent", ["userId", "parentPath"])
    .index("by_last_message", ["userId", "lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    model: v.optional(v.string()),
    provider: v.optional(v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("google"),
      v.literal("openrouter")
    )),
    parentMessageId: v.optional(v.id("messages")), // For branching
    isStreaming: v.optional(v.boolean()), // Track if this message is currently streaming
    metadata: v.optional(v.object({
      tokenCount: v.optional(v.number()),
      latency: v.optional(v.number()),
      error: v.optional(v.string()),
    })),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_conversation_and_parent", ["conversationId", "parentMessageId"]),

  sessions: defineTable({
    userId: v.id("users"),
    sessionId: v.string(),
  })
    .index("by_session_id", ["sessionId"])
    .index("by_user_id", ["userId"]),

  timeline_events: defineTable({
    userId: v.id("users"),
    eventType: v.union(
      v.literal("send_message"),
      v.literal("create_conversation"),
      v.literal("rename_conversation"),
      v.literal("delete_conversation")
    ),
    description: v.string(),
    timestamp: v.number(),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.id("messages")),
    metadata: v.optional(v.object({
      oldTitle: v.optional(v.string()),
      newTitle: v.optional(v.string()),
      messagePreview: v.optional(v.string()),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_timestamp", ["userId", "timestamp"]),
});