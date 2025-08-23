import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

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
})
