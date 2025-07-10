import { defineSchema, defineTable } from "convex/server";
import { v, Validator } from "convex/values";

// The users, accounts, sessions and verificationTokens tables are modeled
// from https://authjs.dev/getting-started/adapters#models

export const userSchema = {
  email: v.string(),
  name: v.optional(v.string()),
  emailVerified: v.optional(v.number()),
  image: v.optional(v.string()),
  organizationId: v.id("organizations"),
  createdAt: v.number(),
};

export const sessionSchema = {
  userId: v.id("users"),
  expires: v.number(),
  sessionToken: v.string(),
};

export const accountSchema = {
  userId: v.id("users"),
  type: v.union(
    v.literal("email"),
    v.literal("oidc"),
    v.literal("oauth"),
    v.literal("webauthn"),
  ),
  provider: v.string(),
  providerAccountId: v.string(),
  refresh_token: v.optional(v.string()),
  access_token: v.optional(v.string()),
  expires_at: v.optional(v.number()),
  token_type: v.optional(v.string() as Validator<Lowercase<string>>),
  scope: v.optional(v.string()),
  id_token: v.optional(v.string()),
  session_state: v.optional(v.string()),
};

export const verificationTokenSchema = {
  identifier: v.string(),
  token: v.string(),
  expires: v.number(),
};

export const authenticatorSchema = {
  credentialID: v.string(),
  userId: v.id("users"),
  providerAccountId: v.string(),
  credentialPublicKey: v.string(),
  counter: v.number(),
  credentialDeviceType: v.string(),
  credentialBackedUp: v.boolean(),
  transports: v.optional(v.string()),
};

const authTables = {
  users: defineTable(userSchema).index("email", ["email"]),
  sessions: defineTable(sessionSchema)
    .index("sessionToken", ["sessionToken"])
    .index("userId", ["userId"]),
  accounts: defineTable(accountSchema)
    .index("providerAndAccountId", ["provider", "providerAccountId"])
    .index("userId", ["userId"]),
  verificationTokens: defineTable(verificationTokenSchema).index(
    "identifierToken",
    ["identifier", "token"],
  ),
  authenticators: defineTable(authenticatorSchema)
    .index("userId", ["userId"])
    .index("credentialID", ["credentialID"]),
};

export default defineSchema({
  ...authTables,
  
  organizations: defineTable({
    name: v.string(),
    domain: v.string(),
    subdomain: v.optional(v.string()),
    customDomain: v.optional(v.string()),
    type: v.union(v.literal("personal"), v.literal("company")),
    createdAt: v.number(),
  })
    .index("by_domain", ["domain"]),
  
  // Deprecated table - kept for migration compatibility
  teams: defineTable({
    name: v.string(),
    organizationId: v.id("organizations"),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"]),
  
  files: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    isStreaming: v.optional(v.boolean()), // Track if file is currently streaming
    isRegeneratingTitle: v.optional(v.boolean()), // Track if title is being regenerated
    visibility: v.union(v.literal("public"), v.literal("private")), // File visibility for unauthenticated access
    metadata: v.optional(v.any()),
    // Legacy field - will be removed in migration
    teamId: v.optional(v.string()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_last_message", ["organizationId", "lastMessageAt"])
    .index("unique_name_in_org", ["organizationId", "name"])
    .index("by_visibility", ["visibility"])
    .index("by_organization_and_visibility", ["organizationId", "visibility"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["organizationId"]
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