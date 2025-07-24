import { mutation, query, action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import type { ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const getPlugins = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const plugins = await ctx.db
      .query("plugins")
      .withIndex("by_org")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .order("desc")
      .collect();

    return plugins;
  },
});

export const createPlugin = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    organizationId: v.id("organizations"),
    visibility: v.union(v.literal("private"), v.literal("public")),
    port: v.optional(v.number()),
    startCommand: v.optional(v.string()),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log("[PLUGIN_CREATE] Starting plugin creation with args:", args);
    
    const pluginId = await ctx.db.insert("plugins", {
      name: args.name,
      description: args.description,
      organizationId: args.organizationId,
      visibility: args.visibility,
      isActive: false, // Default to inactive
      port: args.port,
      startCommand: args.startCommand,
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("[PLUGIN_CREATE] Plugin inserted with ID:", pluginId);

    // Schedule sandbox creation with dev server enabled by default
    console.log("[PLUGIN_CREATE] Scheduling sandbox creation for plugin:", pluginId);
    await ctx.scheduler.runAfter(0, internal.plugins.createSandboxForPlugin, {
      pluginId,
      organizationId: args.organizationId,
      createdBy: args.userId,
      startDevServer: true, // Always start dev server for new plugins
      projectType: "tanstack-start",
    });

    console.log("[PLUGIN_CREATE] Sandbox creation scheduled successfully");
    return pluginId;
  },
});

// Internal action to create sandbox for a plugin
export const createSandboxForPlugin = internalAction({
  args: {
    pluginId: v.id("plugins"),
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),
    startDevServer: v.optional(v.boolean()),
    projectType: v.optional(v.string()),
  },
  handler: async (ctx: ActionCtx, args): Promise<{ success: boolean; tunnelUrl?: string }> => {
    console.log("[SANDBOX_SCHEDULE] Starting scheduled sandbox creation for plugin:", args.pluginId);
    console.log("[SANDBOX_SCHEDULE] Args:", args);
    
    // Create sandbox via Modal API with dev server enabled by default
    console.log("[SANDBOX_SCHEDULE] Calling createSandboxViaModal...");
    
    const result = await ctx.runAction(api.sandboxes.createSandboxViaModal, {
      pluginId: args.pluginId,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      startDevServer: args.startDevServer ?? true,
      projectType: args.projectType ?? "tanstack-start",
    });
    
    console.log("[SANDBOX_SCHEDULE] createSandboxViaModal result:", result);
    
    // If sandbox creation was successful, update the plugin with service info
    if (result.success && result.tunnelUrl) {
      console.log("[SANDBOX_SCHEDULE] Updating plugin with service info...");
      
      await ctx.runMutation(api.plugins.updatePlugin, {
        pluginId: args.pluginId,
        startCommand: "npm run dev",
        port: 5173,
        isActive: true,
      });
      
      console.log("[SANDBOX_SCHEDULE] Plugin updated successfully");
    }
    
    return {
      success: result.success,
      tunnelUrl: result.tunnelUrl,
    };
  },
});

export const updatePlugin = mutation({
  args: {
    pluginId: v.id("plugins"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    isActive: v.optional(v.boolean()),
    port: v.optional(v.number()),
    startCommand: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { pluginId, ...updates } = args;
    
    await ctx.db.patch(pluginId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Specific mutation for updating sandbox configuration
export const updateSandboxConfiguration = mutation({
  args: {
    pluginId: v.id("plugins"),
    port: v.optional(v.number()),
    startCommand: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { pluginId, ...updates } = args;
    
    await ctx.db.patch(pluginId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deletePlugin = mutation({
  args: {
    pluginId: v.id("plugins"),
  },
  handler: async (ctx, args) => {
    // First, get the sandbox for this plugin to terminate it
    const plugin = await ctx.db.get(args.pluginId);
    if (!plugin) {
      throw new Error("Plugin not found");
    }

    const sandbox = await ctx.db
      .query("sandboxes")
      .withIndex("by_plugin", (q) => q.eq("pluginId", args.pluginId))
      .first();

    // Delete the plugin from database
    await ctx.db.delete(args.pluginId);

    // If there's a sandbox, handle its cleanup
    if (sandbox) {
      // Delete the sandbox record
      await ctx.db.delete(sandbox._id);
      
      // If it's an active sandbox, schedule its termination in Modal
      if (sandbox.modalSandboxId && sandbox.status === "active") {
        console.log("[PLUGIN_DELETE] Scheduling sandbox termination for:", sandbox.modalSandboxId);
        
        // Schedule the sandbox termination as a background task
        await ctx.scheduler.runAfter(0, internal.plugins.terminateSandboxForPlugin, {
          modalSandboxId: sandbox.modalSandboxId,
        });
      }
    }
  },
});

export const togglePluginActive = mutation({
  args: {
    pluginId: v.id("plugins"),
  },
  handler: async (ctx, args) => {
    const plugin = await ctx.db.get(args.pluginId);
    if (!plugin) {
      throw new Error("Plugin not found");
    }

    await ctx.db.patch(args.pluginId, {
      isActive: !plugin.isActive,
      updatedAt: Date.now(),
    });
  },
});

// Internal action to terminate sandbox for a deleted plugin
export const terminateSandboxForPlugin = internalAction({
  args: {
    modalSandboxId: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<{ success: boolean }> => {
    console.log("[SANDBOX_TERMINATE] Starting sandbox termination for:", args.modalSandboxId);
    
    try {
      // Call Modal to terminate the sandbox
      const modalResponse = await fetch(
        "https://jverre--ttyd-sandbox-terminate-sandbox.modal.run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.MODAL_AUTH_TOKEN}`,
          },
          body: JSON.stringify({
            sandbox_id: args.modalSandboxId,
          }),
        }
      );

      console.log("[SANDBOX_TERMINATE] Modal response status:", modalResponse.status);

      if (!modalResponse.ok) {
        const errorText = await modalResponse.text();
        console.error("[SANDBOX_TERMINATE] Modal response error:", errorText);
        // Don't throw error - sandbox might already be terminated
      } else {
        const responseData = await modalResponse.json();
        console.log("[SANDBOX_TERMINATE] Modal response:", responseData);
      }

      return { success: true };
    } catch (error) {
      console.error("[SANDBOX_TERMINATE] Error occurred:", error);
      return { success: false };
    }
  },
});

export const getPluginById = query({
  args: {
    pluginId: v.id("plugins"),
  },
  handler: async (ctx, args) => {
    const plugin = await ctx.db.get(args.pluginId);
    return plugin;
  },
});

// List files in plugin sandbox via Modal command execution
export const listPluginFiles = action({
  args: {
    pluginId: v.id("plugins"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx: ActionCtx, args): Promise<{ success: boolean; files?: Array<{name: string, path: string, isDirectory: boolean}>, error?: string }> => {
    console.log("[LIST_PLUGIN_FILES] Starting file listing for plugin:", args.pluginId);
    
    try {
      // Get plugin to verify ownership
      const plugin = await ctx.runQuery(api.plugins.getPluginById, { pluginId: args.pluginId });
      if (!plugin) {
        return { success: false, error: "Plugin not found" };
      }
      
      if (plugin.organizationId !== args.organizationId) {
        return { success: false, error: "Access denied" };
      }
      
      // Get sandbox for plugin
      const sandbox = await ctx.runQuery(api.sandboxes.getSandboxForPlugin, {
        pluginId: args.pluginId,
        organizationId: args.organizationId,
      });
      
      if (!sandbox || !sandbox.modalSandboxId) {
        return { success: false, error: "No active sandbox found for this plugin" };
      }
      
      if (sandbox.status !== "active") {
        return { success: false, error: "Sandbox is not active" };
      }
      
      console.log("[LIST_PLUGIN_FILES] Using sandbox:", sandbox.modalSandboxId);
      
      // Execute find command to list plugin files, excluding common build/dependency directories
      const response = await fetch(
        "https://jverre--ttyd-sandbox-execute-command.modal.run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.MODAL_AUTH_TOKEN}`,
          },
          body: JSON.stringify({
            sandbox_id: sandbox.modalSandboxId,
            command: "find /plugin -type f -o -type d | grep -v node_modules | grep -v .git | grep -v dist | grep -v build | grep -v .next | head -50", // Exclude common directories, limit to 50 items
          }),
        }
      );
      
      if (!response.ok) {
        console.error("[LIST_PLUGIN_FILES] Modal response error:", response.statusText);
        return { success: false, error: `Failed to list files: ${response.statusText}` };
      }
      
      const data = await response.json();
      console.log("[LIST_PLUGIN_FILES] Modal response:", data);
      
      if (data.returncode !== 0) {
        console.error("[LIST_PLUGIN_FILES] Command failed:", data.stderr);
        return { success: false, error: data.stderr || "Failed to list files" };
      }
      
      // Parse the output to extract file paths
      const stdout = data.stdout || "";
      const lines = stdout.split('\n').filter((line: string) => line.trim() && line !== '/plugin');
      
      // Get file details for each path
      const files = [];
      for (const line of lines) {
        const fullPath = line.trim();
        if (!fullPath) continue;
        
        // Get relative path from /plugin/
        const relativePath = fullPath.replace('/plugin/', '').replace('/plugin', '');
        if (!relativePath) continue;
        
        // Check if it's a directory with stat command
        const statResponse = await fetch(
          "https://jverre--ttyd-sandbox-execute-command.modal.run",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.MODAL_AUTH_TOKEN}`,
            },
            body: JSON.stringify({
              sandbox_id: sandbox.modalSandboxId,
              command: `test -d "${fullPath}" && echo "directory" || echo "file"`,
            }),
          }
        );
        
        let isDirectory = false;
        if (statResponse.ok) {
          const statData = await statResponse.json();
          isDirectory = statData.stdout?.trim() === "directory";
        }
        
        files.push({
          name: relativePath.split('/').pop() || relativePath,
          path: relativePath,
          isDirectory: isDirectory
        });
      }
      
      console.log("[LIST_PLUGIN_FILES] Processed files:", files);
      return { success: true, files };
      
    } catch (error) {
      console.error("[LIST_PLUGIN_FILES] Error:", error);
      return { success: false, error: `Error listing plugin files: ${error}` };
    }
  },
});

// Get content of a specific plugin file via Modal command execution
export const getPluginFileContent = action({
  args: {
    pluginId: v.id("plugins"),
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    filePath: v.string(),
  },
  handler: async (ctx: ActionCtx, args): Promise<{ success: boolean; content?: string, error?: string }> => {
    console.log("[GET_PLUGIN_FILE] Getting file content for:", args.filePath, "in plugin:", args.pluginId);
    
    try {
      // Get plugin to verify ownership
      const plugin = await ctx.runQuery(api.plugins.getPluginById, { pluginId: args.pluginId });
      if (!plugin) {
        return { success: false, error: "Plugin not found" };
      }
      
      if (plugin.organizationId !== args.organizationId) {
        return { success: false, error: "Access denied" };
      }
      
      // Get sandbox for plugin
      const sandbox = await ctx.runQuery(api.sandboxes.getSandboxForPlugin, {
        pluginId: args.pluginId,
        organizationId: args.organizationId,
      });
      
      if (!sandbox || !sandbox.modalSandboxId) {
        return { success: false, error: "No active sandbox found for this plugin" };
      }
      
      if (sandbox.status !== "active") {
        return { success: false, error: "Sandbox is not active" };
      }
      
      console.log("[GET_PLUGIN_FILE] Using sandbox:", sandbox.modalSandboxId);
      
      // Sanitize file path to prevent directory traversal
      const sanitizedPath = args.filePath.replace(/\.\./g, '').replace(/^\/+/, '');
      const fullPath = `/plugin/${sanitizedPath}`;
      
      // First check if file exists and is not a directory
      const checkResponse = await fetch(
        "https://jverre--ttyd-sandbox-execute-command.modal.run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.MODAL_AUTH_TOKEN}`,
          },
          body: JSON.stringify({
            sandbox_id: sandbox.modalSandboxId,
            command: `test -f "${fullPath}" && echo "file" || echo "not_file"`,
          }),
        }
      );
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.stdout?.trim() !== "file") {
          return { success: false, error: "File not found or is not a regular file" };
        }
      }
      
      // Execute cat command to get file content
      const response = await fetch(
        "https://jverre--ttyd-sandbox-execute-command.modal.run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.MODAL_AUTH_TOKEN}`,
          },
          body: JSON.stringify({
            sandbox_id: sandbox.modalSandboxId,
            command: `cat "${fullPath}"`,
          }),
        }
      );
      
      if (!response.ok) {
        console.error("[GET_PLUGIN_FILE] Modal response error:", response.statusText);
        return { success: false, error: `Failed to read file: ${response.statusText}` };
      }
      
      const data = await response.json();
      console.log("[GET_PLUGIN_FILE] Command result - returncode:", data.returncode);
      
      if (data.returncode !== 0) {
        console.error("[GET_PLUGIN_FILE] Command failed:", data.stderr);
        return { success: false, error: data.stderr || "Failed to read file" };
      }
      
      const content = data.stdout || "";
      console.log("[GET_PLUGIN_FILE] File content length:", content.length);
      
      return { success: true, content };
      
    } catch (error) {
      console.error("[GET_PLUGIN_FILE] Error:", error);
      return { success: false, error: `Error reading plugin file: ${error}` };
    }
  },
}); 