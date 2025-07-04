import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";


export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.string(),
    email: v.string(),
    image: v.optional(v.string()),
    organizationId: v.id("organizations"),
    teamId: v.id("teams"),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_organization", ["organizationId"]),
  
  organizations: defineTable({
    name: v.string(),
    domain: v.string(),
    type: v.union(v.literal("personal"), v.literal("company")),
    createdAt: v.number(),
  })
    .index("by_domain", ["domain"]),
  
  teams: defineTable({
    name: v.string(),
    organizationId: v.id("organizations"),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"]),

  files: defineTable({
    organizationId: v.id("organizations"),
    teamId: v.id("teams"),
    name: v.string(),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    isStreaming: v.optional(v.boolean()), // Track if file is currently streaming
    isRegeneratingTitle: v.optional(v.boolean()), // Track if title is being regenerated
    visibility: v.union(v.literal("public"), v.literal("private")), // File visibility for unauthenticated access
    metadata: v.optional(v.any()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_team", ["teamId"])
    .index("by_organization_last_message", ["organizationId", "lastMessageAt"])
    .index("by_team_last_message", ["teamId", "lastMessageAt"])
    .index("unique_name_in_team", ["organizationId", "teamId", "name"])
    .index("by_visibility", ["visibility"])
    .index("by_team_and_visibility", ["teamId", "visibility"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["teamId", "organizationId"]
    }),

  messages: defineTable({
    fileId: v.id("files"),
    userId: v.id("users"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system"), v.literal("tool")),
    
    // AI SDK Core Message format - structured content
    content: v.array(v.union(
      // Text content part
      v.object({
        type: v.literal("text"),
        text: v.string()
      }),
      // Tool call content part  
      v.object({
        type: v.literal("tool-call"),
        toolCallId: v.string(),
        toolName: v.string(),
        args: v.any()
      }),
      // Tool result content part
      v.object({
        type: v.literal("tool-result"), 
        toolCallId: v.string(),
        result: v.any(),
        isError: v.optional(v.boolean())
      })
    )),
    
    // Flattened text content for search (automatically populated from content array)
    searchableText: v.optional(v.string()),
    
    model: v.optional(v.string()),
    provider: v.optional(v.union(
      v.literal("openai"),
      v.literal("anthropic"),
      v.literal("google"),
      v.literal("openrouter")
    )),
    parentMessageId: v.optional(v.id("messages")), // For branching
    isStreaming: v.optional(v.boolean()), // Track if this message is currently streaming
    
    // Clean metadata - no tool-specific fields since they're in structured content
    metadata: v.optional(v.object({
      tokenCount: v.optional(v.number()),
      latency: v.optional(v.number()),
      error: v.optional(v.string()),
      finishReason: v.optional(v.string()),
    })),
    createdAt: v.number(),
  })
    .index("by_file", ["fileId"])
    .index("by_file_and_parent", ["fileId", "parentMessageId"])
    .searchIndex("search_content", {
      searchField: "searchableText",
      filterFields: ["fileId", "userId"]
    }),

  timeline_events: defineTable({
    userId: v.id("users"),
    eventType: v.union(
      v.literal("send_message"),
      v.literal("create_file"),
      v.literal("rename_file"),
      v.literal("delete_file")
    ),
    description: v.string(),
    timestamp: v.number(),
    fileId: v.optional(v.id("files")),
    messageId: v.optional(v.id("messages")),
    metadata: v.optional(v.object({
      messagePreview: v.optional(v.string()),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_timestamp", ["userId", "timestamp"]),

  daytonaSandboxes: defineTable({
    userId: v.id("users"),
    sandboxId: v.string(),
    resources: v.optional(v.object({
      cpu: v.number(),
      memory: v.number(), // GB
      disk: v.number(), // GB
    })),
    createdAt: v.number(),
    lastUsedAt: v.number(),
    metadata: v.optional(v.any()),
  })
    .index("by_user", ["userId"])
    .index("by_sandbox_id", ["sandboxId"]),

  blogs: defineTable({
    fileId: v.id("files"), // Link to the .blog file
    content: v.object({
      type: v.literal("doc"),
      content: v.array(v.any()), // ProseMirror JSON content
    }),
    version: v.number(), // Document version for consistency
    lastEditedBy: v.id("users"),
    lastEditedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_file", ["fileId"])
    .index("by_file_version", ["fileId", "version"]),

  apiKeys: defineTable({
    userId: v.id("users"),
    key: v.string(), // The actual API key
    name: v.string(), // e.g., "VS Code Extension"
    createdAt: v.number(),
    lastUsedAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_key", ["key"]),
});