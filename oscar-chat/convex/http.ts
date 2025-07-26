import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
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
    
    if (pluginId) {
      const plugin = await ctx.runQuery(api.plugins.getPluginById, {
        pluginId: pluginId as any,
      });
      
      if (plugin) {
        const sandbox = await ctx.runQuery(api.sandboxes.getSandboxForPlugin, {
          pluginId: pluginId as any,
          organizationId: plugin.organizationId,
        });
        
        if (sandbox) {
          sandboxId = sandbox.modalSandboxId;
          organizationId = plugin.organizationId;
        }
      }
    }

    // Create tool context
    const toolContext: ToolContext = {
      sandboxId,
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

// Plugin update endpoint for tools
export const updatePluginEndpoint = httpAction(async (ctx, request) => {
  try {
    const { pluginId, port, startCommand } = await request.json();
    
    // Check authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Update the plugin
    await ctx.runMutation(api.plugins.updatePlugin, {
      pluginId,
      port,
      startCommand,
    });
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Update plugin error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

http.route({
  path: "/updatePlugin",
  method: "POST",
  handler: updatePluginEndpoint,
});

// Sandbox update endpoint for tools
export const updateSandboxEndpoint = httpAction(async (ctx, request) => {
  try {
    const { pluginId, organizationId, modalSandboxId, sandboxUrl, status } = await request.json();
    
    // Check authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Find the sandbox record by plugin and organization
    const sandbox = await ctx.runQuery(api.sandboxes.getSandboxForPlugin, {
      pluginId,
      organizationId,
    });
    
    if (sandbox) {
      // Update the sandbox with new information
      await ctx.runMutation(api.sandboxes.updateSandbox, {
        sandboxId: sandbox._id,
        status,
        modalSandboxId,
        sandboxUrl: sandboxUrl || undefined, // Convert null to undefined for Convex validation
      });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Update sandbox error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

http.route({
  path: "/updateSandbox",
  method: "POST",
  handler: updateSandboxEndpoint,
});

// Sandbox health update endpoint for tools
export const updateSandboxHealthEndpoint = httpAction(async (ctx, request) => {
  try {
    const { pluginId, organizationId, sandboxAccessible, serviceRunning, lastHealthCheck } = await request.json();
    
    // Check authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Find the sandbox record by plugin and organization
    const sandbox = await ctx.runQuery(api.sandboxes.getSandboxForPlugin, {
      pluginId,
      organizationId,
    });
    
    if (sandbox) {
      // Update the sandbox with health check information
      await ctx.runMutation(api.sandboxes.updateSandbox, {
        sandboxId: sandbox._id,
        serviceStatus: serviceRunning ? "running" : (sandboxAccessible ? "stopped" : "unknown"),
        lastHealthCheck,
      });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Update sandbox health error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

// Get service status endpoint for tools
export const getServiceStatusEndpoint = httpAction(async (ctx, request) => {
  try {
    const { pluginId, organizationId } = await request.json();
    
    // Check authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Find the sandbox record by plugin and organization
    const sandbox = await ctx.runQuery(api.sandboxes.getSandboxForPlugin, {
      pluginId,
      organizationId,
    });
    
    if (!sandbox) {
      return new Response(JSON.stringify({ success: false, error: "Sandbox not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    // Get plugin information
    const plugin = await ctx.runQuery(api.plugins.getPluginById, {
      pluginId,
    });
    
    return new Response(JSON.stringify({ 
      success: true,
      status: sandbox.status,
      serviceStatus: sandbox.serviceStatus,
      sandboxUrl: sandbox.sandboxUrl,
      lastHealthCheck: sandbox.lastHealthCheck,
      restartCount: sandbox.restartCount,
      createdAt: sandbox.createdAt,
      expiresAt: sandbox.expiresAt,
      plugin: plugin,
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Get service status error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

// Sandbox restart update endpoint for tools
export const updateSandboxRestartEndpoint = httpAction(async (ctx, request) => {
  try {
    const { pluginId, organizationId, modalSandboxId, sandboxUrl, status, serviceStatus, lastSnapshot } = await request.json();
    
    // Check authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    // Find the sandbox record by plugin and organization
    const sandbox = await ctx.runQuery(api.sandboxes.getSandboxForPlugin, {
      pluginId,
      organizationId,
    });
    
    if (sandbox) {
      // Increment restart count and update sandbox info
      await ctx.runMutation(api.sandboxes.updateSandbox, {
        sandboxId: sandbox._id,
        status,
        serviceStatus,
        modalSandboxId,
        sandboxUrl: sandboxUrl || undefined,
        restartCount: (sandbox.restartCount || 0) + 1,
        lastSnapshot,
        lastHealthCheck: Date.now(),
      });
    }
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('Update sandbox restart error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
});

http.route({
  path: "/updateSandboxHealth",
  method: "POST",
  handler: updateSandboxHealthEndpoint,
});

http.route({
  path: "/getServiceStatus",
  method: "POST",
  handler: getServiceStatusEndpoint,
});

http.route({
  path: "/updateSandboxRestart",
  method: "POST",
  handler: updateSandboxRestartEndpoint,
});

export default http;
