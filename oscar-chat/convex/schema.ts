import { defineSchema, defineTable } from "convex/server";
import { Validator, v } from "convex/values";

// The users, accounts, sessions and verificationTokens tables are modeled
// from https://authjs.dev/getting-started/adapters#models

export const userSchema = {
  email: v.string(),
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  organizationId: v.optional(v.id("organizations")),
  organizationRole: v.optional(v.union(
    v.literal("owner"),
    v.literal("member")
  )),
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
    subdomain: v.string(),
    ownerId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro")),
    createdAt: v.number(),
  })
    .index("by_subdomain", ["subdomain"]),
  
  files: defineTable({
    organizationId: v.id("organizations"),
    path: v.string(),
    content: v.string(),
    type: v.string(),
    isPublic: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_path", ["organizationId", "path"]),
  
  plugins: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    organizationId: v.id("organizations"),
    visibility: v.union(v.literal("private"), v.literal("public")),
    isActive: v.boolean(),
    port: v.optional(v.number()),
    startCommand: v.optional(v.string()),
    fileExtension: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    // Plugin manifest data
    manifest: v.optional(v.object({
      version: v.optional(v.string()),
      author: v.optional(v.string()),
      permissions: v.optional(v.array(v.string())),
      icon: v.optional(v.string()),
    })),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_visibility", ["organizationId", "visibility"]),

  // Store individual messages - simplified schema
  messages: defineTable({
    pluginId: v.id("plugins"), // Plugin identifier
    msgId: v.string(), // AI SDK message ID for deduplication/updates
    aiSDKMessage: v.any(), // Complete raw AI SDK message
  })
    .index("by_plugin", ["pluginId"])
    .index("by_plugin_msgId", ["pluginId", "msgId"]),
  
  // Sandbox management
  sandboxes: defineTable({
    pluginId: v.id("plugins"),
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),
    modalSandboxId: v.optional(v.string()),
    status: v.union(
      v.literal("creating"),
      v.literal("active"),
      v.literal("terminated"),
      v.literal("error")
    ),
    serviceStatus: v.optional(v.union(
      v.literal("running"),
      v.literal("stopped"),
      v.literal("unknown")
    )),
    sandboxUrl: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    lastAccessedAt: v.optional(v.number()),
    lastHealthCheck: v.optional(v.number()),
    restartCount: v.optional(v.number()),
    lastSnapshot: v.optional(v.string()),
  })
    .index("by_plugin", ["pluginId"])
    .index("by_org", ["organizationId"])
    .index("by_status", ["status"])
    .index("by_service_status", ["serviceStatus"])
    .index("by_health_check", ["lastHealthCheck"]),
  
  // File messages - stores messages as byte arrays for each file
  fileMessages: defineTable({
    fileId: v.id("files"),
    organizationId: v.id("organizations"),
    message: v.bytes(), // Store messages as byte arrays
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_file", ["fileId"])
    .index("by_file_created", ["fileId", "createdAt"])
    .index("by_org", ["organizationId"]),
});
