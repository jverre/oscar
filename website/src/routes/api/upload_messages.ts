import { createServerFileRoute } from '@tanstack/react-start/server'
import { json } from '@tanstack/react-start'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.CONVEX_URL!)

export const ServerRoute = createServerFileRoute('/api/upload_messages').methods({
  POST: async ({ request }) => {
    try {
      // Parse the request body
      const body = await request.json()
      
      // Validate the request structure
      if (!body || typeof body !== 'object') {
        return json({ error: 'Invalid request body' }, { status: 400 })
      }
      
      const { conversationId, messages } = body
      
      // Validate required fields
      if (!conversationId || typeof conversationId !== 'string') {
        return json({ error: 'conversationId is required and must be a string' }, { status: 400 })
      }
      
      if (!Array.isArray(messages)) {
        return json({ error: 'messages must be an array' }, { status: 400 })
      }
      
      // Validate each message structure
      for (const message of messages) {
        if (!message.messageId || typeof message.messageId !== 'string') {
          return json({ error: 'Each message must have a messageId string' }, { status: 400 })
        }
        
        if (!message.role || !['system', 'user', 'assistant', 'tool'].includes(message.role)) {
          return json({ error: 'Each message must have a valid role' }, { status: 400 })
        }
        
        if (message.content === undefined || message.content === null) {
          return json({ error: 'Each message must have content' }, { status: 400 })
        }
        
        if (typeof message.messageOrder !== 'number') {
          return json({ error: 'Each message must have a messageOrder number' }, { status: 400 })
        }
      }
      
      // Call Convex mutation to insert messages
      const result = await convex.mutation(api.uploadMessages.insertMessagesFromAPI, {
        conversationId,
        messages
      })
      
      return json({ 
        success: true, 
        insertedCount: result.insertedCount,
        conversationId 
      })
      
    } catch (error) {
      console.error('Upload messages error:', error)
      return json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }
  }
})
