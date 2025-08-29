import { v } from "convex/values";
import { mutation, query, httpAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Internal mutation for HTTP actions
export const createInternal = internalMutation({
  args: {
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .first();
    
    if (existing) {
      return existing._id;
    }
    
    return await ctx.db.insert("conversations", {
      conversationId: args.conversationId,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

export const markCompleted = mutation({
  args: {
    conversationId: v.string(),
    messageCount: v.number(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .first();
    
    if (!conversation) {
      throw new Error(`Conversation ${args.conversationId} not found`);
    }
    
    await ctx.db.patch(conversation._id, {
      status: "completed",
      completedAt: Date.now(),
      messageCount: args.messageCount,
    });
  },
});

export const get = query({
  args: {
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('Getting conversation', args.conversationId)
    const res = await ctx.db
      .query("conversations")
      .withIndex("by_conversation_id", (q) => q.eq("conversationId", args.conversationId))
      .first();
    return res
  },
});

// HTTP action for creating conversations from external services
export const createConversation = httpAction(async (ctx, request) => {
  try {
    const body = await request.json();
    
    if (!body.conversationId || typeof body.conversationId !== 'string') {
      return new Response(JSON.stringify({ error: 'conversationId is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
    
    const result = await ctx.runMutation(internal.conversations.createInternal, {
      conversationId: body.conversationId
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      conversationId: body.conversationId,
      id: result
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (error) {
    console.error('Create conversation error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
});