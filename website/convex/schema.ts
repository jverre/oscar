import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from "@convex-dev/auth/server"

// Sandbox status enum
export const SandboxStatus = {
  CREATING: 'creating',
  STARTING_SERVER: 'starting_server',
  RUNNING: 'running',
  FAILED: 'failed',
  STOPPED: 'stopped',
} as const

export type SandboxStatusType = typeof SandboxStatus[keyof typeof SandboxStatus]

// Export type definitions
export type TextPart = {
  type: 'text'
  text: string
}

export type ImagePart = {
  type: 'image'
  image: string | { url: string }
  mediaType?: string
}

export type FilePart = {
  type: 'file'
  data: string | { url: string }
  filename?: string
  mediaType: string
}

export type ToolCallPart = {
  type: 'tool-call'
  toolCallId: string
  toolName: string
  args: any
}

export type ToolResultPart = {
  type: 'tool-result'
  toolCallId: string
  toolName: string
  output: {
    type: 'text' | 'json' | 'error-text' | 'error-json' | 'content'
    value: any
  }
  providerOptions?: any
}

export type UserContent = string | (TextPart | ImagePart | FilePart)[]
export type AssistantContent = string | (TextPart | ToolCallPart)[]
export type ToolContent = ToolResultPart[]

// Define content part schemas
const textPart = v.object({
  type: v.literal('text'),
  text: v.string(),
})

const imagePart = v.object({
  type: v.literal('image'),
  image: v.union(v.string(), v.object({ url: v.string() })), // base64 string or URL object
  mediaType: v.optional(v.string()),
})

const filePart = v.object({
  type: v.literal('file'),
  data: v.union(v.string(), v.object({ url: v.string() })), // base64 string or URL object
  filename: v.optional(v.string()),
  mediaType: v.string(),
})

const toolCallPart = v.object({
  type: v.literal('tool-call'),
  toolCallId: v.string(),
  toolName: v.string(),
  args: v.any(), // JSON-serializable object
})

const toolResultPart = v.object({
  type: v.literal('tool-result'),
  toolCallId: v.string(),
  toolName: v.string(),
  output: v.union(
    v.object({ type: v.literal('text'), value: v.string() }),
    v.object({ type: v.literal('json'), value: v.any() }),
    v.object({ type: v.literal('error-text'), value: v.string() }),
    v.object({ type: v.literal('error-json'), value: v.any() }),
    v.object({
      type: v.literal('content'),
      value: v.array(v.union(
        v.object({
          type: v.literal('text'),
          text: v.string(),
        }),
        v.object({
          type: v.literal('media'),
          data: v.string(), // base64 encoded
          mediaType: v.string(),
        })
      ))
    })
  ),
  providerOptions: v.optional(v.any()),
})

// Define content types for different message roles
const userContent = v.union(
  v.string(),
  v.array(v.union(textPart, imagePart, filePart))
)

const assistantContent = v.union(
  v.string(),
  v.array(v.union(textPart, toolCallPart))
)

const toolContent = v.array(toolResultPart)

export default defineSchema({
  ...authTables,
  conversations: defineTable({
    conversationId: v.string(),
    status: v.union(v.literal('pending'), v.literal('completed')),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    messageCount: v.optional(v.number()),
  })
    .index("by_conversation_id", ["conversationId"]),

  messages: defineTable({
    // Unique message identifier
    messageId: v.string(),

    // Message role (system, user, assistant, tool)
    role: v.union(
      v.literal('system'),
      v.literal('user'),
      v.literal('assistant'),
      v.literal('tool')
    ),

    // Content based on role type
    content: v.union(
      v.string(), // For system messages and simple text content
      userContent, // For user messages
      assistantContent, // For assistant messages
      toolContent // For tool messages
    ),

    // Optional metadata fields
    timestamp: v.optional(v.number()),
    conversationId: v.optional(v.string()), // To group messages by conversation
    messageOrder: v.number(), // Position in conversation (0, 1, 2, ...)
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_conversation_and_order", ["conversationId", "messageOrder"]),

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    githubInstallationId: v.optional(v.string()),
  }).index("email", ["email"]),

  repositories: defineTable({
    name: v.string(),
    repositoryUrl: v.string(),
    ownerId: v.id("users"),
    cloneSource: v.union(v.literal('url'), v.literal('github')),
    createdAt: v.number(),
  }),

  featureBranches: defineTable({
    name: v.string(),
    repositoryId: v.id("repositories"),
    ownerId: v.id("users"),
    createdAt: v.number(),
    sandboxId: v.optional(v.string()),
    sandboxStatus: v.optional(v.union(
      v.literal('creating'),
      v.literal('starting_server'),
      v.literal('running'),
      v.literal('failed'),
      v.literal('stopped')
    )),
    sandboxUrl: v.optional(v.string()),
    sandboxUrlToken: v.optional(v.string()),
    lastHealthCheck: v.optional(v.number()),
  })
    .index("by_repository", ["repositoryId"])
    .index("by_owner", ["ownerId"]),
})
