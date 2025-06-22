import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { internal } from "./_generated/api";
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";

// HTTP streaming endpoint for chat
export const chatStream = httpAction(async (ctx, request) => {
  console.log("POST /api/chat/stream endpoint hit");
  
  // Get user from auth
  const user = await ctx.auth.getUserIdentity();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse request body
  const { conversationId, messages } = await request.json();
  
  if (!conversationId || !messages) {
    return new Response("Missing conversationId or messages", { status: 400 });
  }

  // Set up streaming response
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const textEncoder = new TextEncoder();

  // Start streaming process
  const streamResponse = async () => {
    let messageId: Id<"messages"> | null = null;
    
    try {
      // Create assistant message for streaming
      messageId = await ctx.runMutation(internal.messages.createAssistantMessage, {
        conversationId,
      });

      // Initialize OpenAI client for OpenRouter
      const openai = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      let accumulatedText = "";

      // Create streaming completion
      const stream = await openai.chat.completions.create({
        model: "meta-llama/llama-3.1-8b-instruct:free", // Free model for testing
        messages: messages,
        stream: true,
        temperature: 0.7,
      });

      for await (const chunk of stream) {
        const deltaContent = chunk.choices[0]?.delta?.content || "";
        
        if (deltaContent) {
          accumulatedText += deltaContent;

          // Write to response stream
          await writer.write(textEncoder.encode(deltaContent));

          // Update message content in database
          await ctx.runMutation(internal.messages.updateMessageContent, {
            messageId,
            content: accumulatedText,
            isStreaming: true,
          });
        }
      }

      // Finalize the message
      await ctx.runMutation(internal.messages.finalizeMessage, {
        messageId,
      });

    } catch (error) {
      console.error("Streaming error:", error);
      
      // Finalize with error if we have a messageId
      if (messageId) {
        await ctx.runMutation(internal.messages.finalizeMessage, {
          messageId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Write error to stream
      const errorMessage = `\n\n[Error: ${error instanceof Error ? error.message : 'Unknown error'}]`;
      await writer.write(textEncoder.encode(errorMessage));
    } finally {
      await writer.close();
    }
  };

  // Start streaming (don't await - run in background)
  streamResponse();

  // Return streaming response
  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
});

const http = httpRouter();

auth.addHttpRoutes(http);

// CORS preflight handler
http.route({
  path: "/api/chat/stream",
  method: "OPTIONS",
  handler: httpAction(async (_, request) => {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

http.route({
  path: "/api/chat/stream",
  method: "POST",
  handler: chatStream,
});

export default http;