import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { openai } from '@ai-sdk/openai';
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { getToolsForAI, ToolContext, systemPrompt } from './tools';

const http = httpRouter();

http.route({
	path: "/.well-known/openid-configuration",
	method: "GET",
	handler: httpAction(async () => {
		return new Response(
			JSON.stringify({
				issuer: process.env.CONVEX_SITE_URL,
				jwks_uri: process.env.CONVEX_SITE_URL + "/.well-known/jwks.json",
				authorization_endpoint:
					process.env.CONVEX_SITE_URL + "/oauth/authorize",
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control":
						"public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
				},
			},
		);
	}),
});

http.route({
	path: "/.well-known/jwks.json",
	method: "GET",
	handler: httpAction(async () => {
	  if (process.env.JWKS === undefined) {
      throw new Error("Missing JWKS Convex environment variable");
    }
		return new Response(process.env.JWKS, {
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control":
					"public, max-age=15, stale-while-revalidate=15, stale-if-error=86400",
			},
		});
	}),
});

export const chat = httpAction(async (ctx, request) => {
  // Enable CORS
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  console.log("chat");
  try {
    const { messages, pluginId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response('Invalid request', { status: 400 });
    }
    
    // Check authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Get sandbox context
    let sandboxId: string | undefined;
    let organizationId: string | undefined;
    
    const plugin = await ctx.runQuery(api.plugins.getPluginById, {
      pluginId: pluginId as Id<"plugins">,
    });
    
    if (!plugin) {
      console.log("plugin not found");
      return new Response('Plugin not found', { status: 404 });
    }
    
    const file = await ctx.runQuery(api.files.getFileByPath, {
      path: `${pluginId}`,
    });
    if (!file) {
      console.log("file not found");
      return new Response('Failed to get plugin demo file', { status: 404 });
    }

    const sandbox = await ctx.runQuery(api.sandboxes.getSandboxForFile, {
      fileId: file._id
    });
    if (!sandbox) {
      return new Response('Failed to get sandbox for plugin', { status: 404 });
    }
    
    // Create tool context
    const toolContext: ToolContext = {
      sandboxId: sandbox.modalSandboxId,
      pluginId,
      organizationId,
      modalAuthToken: process.env.MODAL_AUTH_TOKEN,
      convexUrl: process.env.CONVEX_SITE_URL,
      authToken: authHeader.replace("Bearer ", ""),
    };

    const aiTools = getToolsForAI(toolContext);

    // Save new user messages to database - AI SDK format, no transformation
    await ctx.runMutation(api.chats.addMessages, {
      pluginId: pluginId as any,
      messages: [messages[messages.length - 1]],
    });

    // Add system message at the beginning
    const systemMessage = {
      role: 'system' as const,
      parts: [{ type: 'text', text: systemPrompt }]
    };
    const messagesWithSystem = [systemMessage, ...messages];
    
    // Convert UI messages to model format for AI SDK v5
    const modelMessages = convertToModelMessages(messagesWithSystem);

    // Debug logging to see what messages are being sent
    console.log('Messages being sent to streamText:', JSON.stringify(modelMessages, null, 2));

    const result = streamText({
      model: openai('gpt-4o'),
      messages: modelMessages,
      tools: aiTools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(5),
      onStepFinish: async (step) => {
        // Stream tool call states in real-time for immediate UI feedback
        if (step.toolCalls) {
          step.toolCalls.forEach(toolCall => {
            console.log('Tool call:', toolCall.toolName);
          });
        }
        if (step.toolResults) {
          step.toolResults.forEach(result => {
            console.log('Tool result:', result);
          });
        }
      },
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      onFinish: async ({messages}) => {
        await ctx.runMutation(api.chats.addMessages, {
          pluginId: pluginId as any,
          messages: messages,
        });
      },
    });

  } catch (error) {
    console.error('Error in chat action:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});

// Register the chat HTTP action
http.route({
  path: "/http_chat",
  method: "POST",
  handler: chat,
});

export default http;
