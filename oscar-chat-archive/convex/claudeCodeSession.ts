import { v } from "convex/values";
import { mutation, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

import { Id } from "./_generated/dataModel";

// Internal action to create Modal sandbox
export const createModalSandbox = internalAction({
  args: {userId: v.id("users")},
  handler: async (ctx, args) => {
    const modalAuthToken = process.env.MODAL_AUTH_TOKEN;
    if (!modalAuthToken) {
      throw new Error("MODAL_AUTH_TOKEN environment variable is not set");
    }

    try {
      const response = await fetch("https://jverre--ttyd-sandbox-create-sandbox.modal.run", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${modalAuthToken}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Modal API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success || !data.terminal_url) {
        throw new Error(`Modal API returned unsuccessful response: ${JSON.stringify(data)}`);
      }

      return {
        success: true,
        terminalUrl: data.terminal_url,
        message: data.message || "Sandbox created successfully",
      };
    } catch (error) {
      console.error("Error creating Modal sandbox:", error);
      throw error;
    }
  },
});

// Public mutation to create a new session file
export const createSession = mutation({
  args: {name: v.optional(v.string()), userId: v.id("users")},
  handler: async (ctx, args): Promise<{ fileId: Id<"files">; sessionName: string }> => {
    const identity = await ctx.auth.getUserIdentity(); const userId = identity?.subject as any;
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Generate a unique session name if not provided
    const sessionName = args.name || `New Claude Session.claude_session`;

    // Create the file with pending state
    const fileId: Id<"files"> = await ctx.runMutation(internal.files.internalCreate, {
      userId,
      name: sessionName,
      visibility: "private",
      metadata: {
        state: "pending",
        createdAt: Date.now(),
      },
    });

    // Schedule the sandbox creation asynchronously
    await ctx.scheduler.runAfter(0, internal.claudeCodeSession.createAndUpdateSandbox, {
      fileId,
      userId,
    });

    return { fileId, sessionName };
  },
});

// Internal action to create sandbox and update file metadata
export const createAndUpdateSandbox = internalAction({
  args: {
    fileId: v.id("files"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    try {
      // Create the Modal sandbox
      const sandboxResult = await ctx.runAction(internal.claudeCodeSession.createModalSandbox, {
        userId: args.userId,
      });

      // Update the file metadata with the terminal URL
      await ctx.runMutation(internal.files.updateFileMetadata, {
        fileId: args.fileId,
        metadata: {
          state: "ready",
          terminalUrl: sandboxResult.terminalUrl,
          createdAt: Date.now(),
        },
      });

      console.log(`Sandbox created successfully for file ${args.fileId}: ${sandboxResult.terminalUrl}`);
    } catch (error) {
      console.error("Error creating sandbox:", error);
      
      // Update the file metadata with error state
      await ctx.runMutation(internal.files.updateFileMetadata, {
        fileId: args.fileId,
        metadata: {
          state: "error",
          error: error instanceof Error ? error.message : String(error),
          createdAt: Date.now(),
        },
      });
    }
  },
});