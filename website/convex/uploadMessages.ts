import { httpAction, internalMutation, mutation } from './_generated/server'
import { internal } from './_generated/api'
import { v } from 'convex/values'

// Helper function to create standardized response headers
const createHeaders = () => ({
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type'
})

export const uploadMessages = httpAction(async (ctx, request) => {
  try {
    // Parse the request body
    const body = await request.json()
    
    // Validate the request structure
    if (!body || typeof body !== 'object') {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: createHeaders()
      })
    }
    
    const { conversationId, messages } = body
    
    // Validate required fields
    if (!conversationId || typeof conversationId !== 'string') {
      return new Response(JSON.stringify({ error: 'conversationId is required and must be a string' }), {
        status: 400,
        headers: createHeaders()
      })
    }
    
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'messages must be an array' }), {
        status: 400,
        headers: createHeaders()
      })
    }
    
    // Validate each message structure
    for (const message of messages) {
      if (!message.messageId || typeof message.messageId !== 'string') {
        return new Response(JSON.stringify({ error: 'Each message must have a messageId string' }), {
          status: 400,
          headers: createHeaders()
        })
      }
      
      if (!message.role || !['system', 'user', 'assistant', 'tool'].includes(message.role)) {
        return new Response(JSON.stringify({ error: 'Each message must have a valid role' }), {
          status: 400,
          headers: createHeaders()
        })
      }
      
      if (message.content === undefined || message.content === null) {
        return new Response(JSON.stringify({ error: 'Each message must have content' }), {
          status: 400,
          headers: createHeaders()
        })
      }
      
      if (typeof message.messageOrder !== 'number') {
        return new Response(JSON.stringify({ error: 'Each message must have a messageOrder number' }), {
          status: 400,
          headers: createHeaders()
        })
      }
    }
    
    // Call internal mutation to insert messages
    const result = await ctx.runMutation(internal.uploadMessages.insertMessages, {
      conversationId,
      messages
    })
    
    return new Response(JSON.stringify({ 
      success: true, 
      insertedCount: result.insertedCount,
      conversationId 
    }), {
      status: 200,
      headers: createHeaders()
    })
    
  } catch (error) {
    console.error('Upload messages error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: createHeaders()
    })
  }
})

// Internal mutation to insert messages into the database
export const insertMessages = internalMutation({
  args: {
    conversationId: v.string(),
    messages: v.array(v.object({
      messageId: v.string(),
      role: v.union(v.literal('system'), v.literal('user'), v.literal('assistant'), v.literal('tool')),
      content: v.any(), // Allow string or complex content structures
      timestamp: v.optional(v.number()),
      conversationId: v.optional(v.string()),
      messageOrder: v.number()
    }))
  },
  handler: async (ctx, args) => {
    const insertPromises = args.messages.map(message => {
      return ctx.db.insert('messages', {
        messageId: message.messageId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        conversationId: args.conversationId,
        messageOrder: message.messageOrder
      })
    })
    
    await Promise.all(insertPromises)
    
    return {
      insertedCount: args.messages.length
    }
  }
})

// Public mutation for server-side calls from TanStack Start
export const insertMessagesFromAPI = mutation({
  args: {
    conversationId: v.string(),
    messages: v.array(v.object({
      messageId: v.string(),
      role: v.union(v.literal('system'), v.literal('user'), v.literal('assistant'), v.literal('tool')),
      content: v.any(), // Allow string or complex content structures
      timestamp: v.optional(v.number()),
      conversationId: v.optional(v.string()),
      messageOrder: v.number()
    }))
  },
  handler: async (ctx, args) => {
    const insertPromises = args.messages.map(message => {
      return ctx.db.insert('messages', {
        messageId: message.messageId,
        role: message.role,
        content: message.content,
        timestamp: message.timestamp,
        conversationId: args.conversationId,
        messageOrder: message.messageOrder
      })
    })
    
    await Promise.all(insertPromises)
    
    return {
      insertedCount: args.messages.length
    }
  }
})