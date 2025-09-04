import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

// Public mutation to clear all messages for a conversation
export const clearByConversation = mutation({
  args: {
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .collect();
    
    const deletePromises = messages.map(message => ctx.db.delete(message._id));
    await Promise.all(deletePromises);
    
    // Reset conversation status to pending
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .first();
    
    if (conversation) {
      await ctx.db.patch(conversation._id, {
        status: "pending",
        completedAt: undefined,
        messageCount: undefined,
      });
    }
    
    return {
      deletedCount: messages.length
    };
  },
});

export const getMessagesByConversation = query({
  args: { conversationId: v.string() },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_conversation_and_order', (q) => 
        q.eq('conversationId', args.conversationId)
      )
      .order('asc')
      .collect()
    
    return messages
  },
})
