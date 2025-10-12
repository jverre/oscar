import { createServerFileRoute } from '@tanstack/react-start/server'
import { json } from '@tanstack/react-start'
import { ConvexHttpClient } from 'convex/browser'
import { api } from '../../../convex/_generated/api'

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!)

export const ServerRoute = createServerFileRoute('/api/create_conversation').methods({
  OPTIONS: async () => {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    })
  },
  POST: async ({ request }) => {
    try {
      // Parse the request body
      const body = await request.json()

      // Validate the request structure
      if (!body || typeof body !== 'object') {
        return json({ error: 'Invalid request body' }, {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        })
      }

      const { conversationId } = body

      // Validate required fields
      if (!conversationId || typeof conversationId !== 'string') {
        return json({ error: 'conversationId is required and must be a string' }, {
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        })
      }

      // Call Convex mutation to create conversation
      const result = await convex.mutation(api.conversations.create, {
        conversationId
      })

      return json({
        success: true,
        conversationId,
        result
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      })

    } catch (error) {
      console.error('Create conversation error:', error)
      return json({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }, {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      })
    }
  }
})