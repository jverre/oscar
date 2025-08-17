import { query } from './_generated/server'
import { v } from 'convex/values'

export const getMessagesByConversation = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation_id', (q) => 
        q.eq('conversationId', args.conversationId)
      )
      .order('asc')
      .collect()
    
    return messages
  },
})
