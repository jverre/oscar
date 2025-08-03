import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { ToolContext } from './tools';

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
      organizationId: plugin.organizationId,
      modalAuthToken: process.env.MODAL_AUTH_TOKEN,
      convexUrl: process.env.CONVEX_SITE_URL,
      authToken: authHeader.replace("Bearer ", ""),
    };

    // Save new user messages to database - AI SDK format, no transformation
    await ctx.runMutation(internal.chats.addMessages, {
      pluginId: pluginId as any,
      messages: [messages[messages.length - 1]],
    });

    // Generate a unique ID for the assistant message
    const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create placeholder assistant message with pending status
    await ctx.runMutation(internal.chats.addMessages, {
      pluginId: pluginId as any,
      messages: [{
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        status: 'pending',
      }],
    });

    // Schedule background generation
    try {
      await ctx.scheduler.runAfter(0, internal.chatGeneration.generateChatResponse, {
        messages,
        pluginId,
        assistantMessageId,
        toolContext,
      });
    } catch (error) {
      console.error('Failed to schedule background job:', error);
      
      // Fallback: mark as error
      await ctx.runMutation(internal.chats.updateMessageStatus, {
        pluginId: pluginId as any,
        messageId: assistantMessageId,
        status: "error",
        error: "Failed to schedule background generation",
      });
    }

    // Return immediately with the message ID
    return new Response(
      JSON.stringify({ 
        messageId: assistantMessageId,
        status: 'pending',
        message: 'Generation started in background',
      }), 
      { 
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );

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
