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
    type: v.union(v.literal("user"),v.literal("plugin"),v.literal("folder")),
    isPublic: v.boolean(),
    isHidden: v.optional(v.boolean()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_path", ["organizationId", "path"]),
  
  plugins: defineTable({
    name: v.string(),
    organizationId: v.id("organizations"),
    visibility: v.union(v.literal("private"), v.literal("public")),
    snapshotId: v.string(),
    isActive: v.boolean(),
    fileExtension: v.optional(v.string()),
    fileId: v.optional(v.id("files")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_org_visibility", ["organizationId", "visibility"]),

  // Store individual messages - simplified schema
  messages: defineTable({
    pluginId: v.string(), // Plugin identifier (can be regular ID or marketplace_<id>)
    msgId: v.string(), // AI SDK message ID for deduplication/updates
    aiSDKMessage: v.any(), // Complete raw AI SDK message
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("streaming"), 
      v.literal("complete"),
      v.literal("error"),
      v.literal("cancelled")
    )),
    streamingBody: v.optional(v.string()), // Progressive text content during streaming
    error: v.optional(v.string()), // Error message if generation failed
  })
    .index("by_plugin", ["pluginId"])
    .index("by_plugin_msgId", ["pluginId", "msgId"]),
  
  // Sandbox management
  sandboxes: defineTable({
    fileId: v.id("files"),
    snapshotId: v.optional(v.string()),
    modalSandboxId: v.optional(v.string()),
    status: v.union(
      v.literal("creating"),
      v.literal("active"),
      v.literal("terminated"),
      v.literal("error")
    ),
    sandboxUrl: v.optional(v.string()),
    expiresAt: v.optional(v.number())
  }),

  // File messages - stores single message per file (upsert pattern)
  fileMessages: defineTable({
    fileId: v.id("files"),
    organizationId: v.id("organizations"),
    message: v.bytes(), // Store messages as byte arrays
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_file", ["fileId"])
    .index("by_org", ["organizationId"]),

  // Organization's activated marketplace plugins
  organizationMarketplacePlugins: defineTable({
    name: v.string(),
    organizationId: v.id("organizations"),
    visibility: v.union(v.literal("private"), v.literal("public")),
    snapshotId: v.string(),
    isActive: v.boolean(),
    fileExtension: v.string(),
    fileId: v.optional(v.id("files")),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org", ["organizationId"]),
});
