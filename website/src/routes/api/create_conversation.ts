import { createServerFileRoute } from '@tanstack/react-start/server'
import { json } from '@tanstack/react-start'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!)

export const ServerRoute = createServerFileRoute('/api/create_conversation').methods({
  POST: async ({ request }) => {
    try {
      // Parse the request body
      const body = await request.json()
      
      // Validate the request structure
      if (!body || typeof body !== 'object') {
        return json({ error: 'Invalid request body' }, { status: 400 })
      }
      
      const { conversationId } = body
      
      // Validate required fields
      if (!conversationId || typeof conversationId !== 'string') {
        return json({ error: 'conversationId is required and must be a string' }, { status: 400 })
      }
      
      // Call Convex mutation to create conversation
      const result = await convex.mutation(api.uploadMessages.createConversation, {
        conversationId
      })
      
      return json({ 
        success: true, 
        conversationId,
        result
      })
      
    } catch (error) {
      console.error('Create conversation error:', error)
      return json({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }, { status: 500 })
    }
  }
})