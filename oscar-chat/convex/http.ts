import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { api, internal } from "./_generated/api";
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
  const { fileId, messages } = await request.json();
  
  if (!fileId || !messages) {
    return new Response("Missing fileId or messages", { status: 400 });
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
        fileId: fileId,
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

// Claude Code batch logging endpoint
export const claudeCodeBatchLog = httpAction(async (ctx, request) => {
  console.log("POST /api/claude-code/batch-log endpoint hit");
  
  // Get API key from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response("Missing or invalid Authorization header", { status: 401 });
  }
  
  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
  console.log("API key received:", `${apiKey.substring(0, 8)}...`);
  
  // Get user by API key
  const user = await ctx.runMutation(api.apiKeys.getUserByApiKey, { apiKey });
  if (!user) {
    return new Response("Invalid API key", { status: 401 });
  }
  
  console.log("Authenticated user:", user.email);

  // Parse request body
  const { sessionId, entries } = await request.json();
  
  if (!sessionId || !entries || !Array.isArray(entries)) {
    return new Response("Missing sessionId or entries", { status: 400 });
  }

  console.log(`Processing batch log for session ${sessionId} with ${entries.length} entries`);

  try {
    // Check if file already exists for this session
    let fileId: Id<"files"> | null = null;
    
    // Search for existing file with this sessionId in metadata
    const existingFiles = await ctx.runQuery(api.files.list);
    const existingFile = existingFiles.find((f: any) => 
      f.metadata?.claudeCodeSessionId === sessionId
    );

    if (existingFile) {
      fileId = existingFile._id;
      console.log(`Found existing file ${fileId} for session ${sessionId}`);
    } else {
      // Create new file for this Claude Code session
      fileId = await ctx.runMutation(internal.files.internalCreate, {
        userId: user._id,
        name: `/claude/${sessionId.substring(0, 8)}.chat`,
        metadata: {
          claudeCodeSessionId: sessionId,
          importedAt: Date.now(),
          source: 'vscode-extension'
        }
      });
      console.log(`Created new file ${fileId} for session ${sessionId}`);
    }

    // Create messages from entries
    let messagesCreated = 0;
    let lastMessageTime = Date.now();
    
    for (const entry of entries) {
      try {
        // Build enhanced metadata for the message
        const messageMetadata: any = {
          tokenCount: entry.metadata?.claudeOriginal?.tokenCount,
          latency: entry.metadata?.latency,
          error: entry.metadata?.error,
        };

        // Add tool call information if present
        if (entry.metadata?.toolCallId || entry.metadata?.isToolUse) {
          messageMetadata.toolCalls = [{
            id: entry.metadata?.toolCallId || entry.metadata?.toolUseId,
            name: entry.metadata?.toolName,
            input: entry.metadata?.claudeOriginal?.toolUses?.[0]?.input
          }].filter(call => call.id); // Only include if we have an ID
        }

        // Add tool result information if present
        if (entry.metadata?.toolResultId) {
          messageMetadata.toolResults = [{
            toolCallId: entry.metadata.toolResultId,
            toolName: entry.metadata?.toolName || 'unknown',
            result: entry.content, // The content contains the result
            isError: false
          }];
        }

        // Create message using internal mutation
        await ctx.runMutation(internal.messages.internalCreateMessage, {
          userId: user._id,
          fileId,
          role: entry.role || 'user',
          content: entry.content || '',
          model: entry.metadata?.claudeOriginal?.model,
          metadata: messageMetadata
        });
        
        messagesCreated++;
        lastMessageTime = Date.now();
        
      } catch (error) {
        console.error(`Failed to create message:`, error);
        // Continue with other messages
      }
    }

    // Note: lastMessageAt is automatically updated by createUserMessage
    // No need to update it separately

    return new Response(JSON.stringify({ 
      success: true, 
      fileId,
      messagesCreated 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Claude Code batch log error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
});

// CORS preflight handler for Claude Code endpoint
http.route({
  path: "/api/claude-code/batch-log",
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
  path: "/api/claude-code/batch-log",
  method: "POST",
  handler: claudeCodeBatchLog,
});





export default http;