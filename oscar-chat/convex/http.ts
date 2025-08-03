import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
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

// Create OpenRouter provider instance
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
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
    
    const plugin = await ctx.runQuery(internal.plugins.getPluginById, {
      pluginId: pluginId as Id<"plugins">,
    });
    
    if (!plugin) {
      return new Response('Plugin not found', { status: 404 });
    }
    
    const file = await ctx.runQuery(api.files.getFileByPath, {
      path: `${pluginId}`,
    });
    if (!file) {
      return new Response('Failed to get plugin demo file', { status: 404 });
    }

    const sandbox = await ctx.runQuery(api.sandboxes.getSandboxForFile, {
      fileId: file._id,
      organizationId: plugin.organizationId
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
    await ctx.runMutation(internal.chats.addMessages, {
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
    
    // Fix duplicate IDs by removing ID from duplicates
    const seenIds = new Set();
    const cleanedMessages = modelMessages.map(msg => {
      if ('id' in msg && msg.id && seenIds.has(msg.id)) {
        const { id, ...msgWithoutId } = msg;
        return msgWithoutId;
      }
      if ('id' in msg && msg.id) {
        seenIds.add(msg.id);
      }
      return msg;
    });

    const result = streamText({
      model: openrouter.chat('anthropic/claude-sonnet-4'),
      messages: cleanedMessages,
      tools: aiTools,
      toolChoice: 'auto',
      stopWhen: stepCountIs(50),    
    });

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      onFinish: async ({messages}) => {
        await ctx.runMutation(internal.chats.addMessages, {
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
