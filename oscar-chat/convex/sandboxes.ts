import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import type { ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";

// Get sandbox for a plugin
export const getSandboxForPlugin = query({
  args: { 
    pluginId: v.id("plugins"),
    organizationId: v.id("organizations")
  },
  handler: async (ctx, args) => {
    const sandbox = await ctx.db
      .query("sandboxes")
      .withIndex("by_plugin", (q) => q.eq("pluginId", args.pluginId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();
    
    return sandbox;
  },
});

// Create a new sandbox
export const createSandbox = mutation({
  args: {
    pluginId: v.id("plugins"),
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if sandbox already exists
    const existingSandbox = await ctx.db
      .query("sandboxes")
      .withIndex("by_plugin", (q) => q.eq("pluginId", args.pluginId))
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .first();
    
    if (existingSandbox) {
      return existingSandbox._id;
    }
    
    // Create new sandbox
    const sandboxId = await ctx.db.insert("sandboxes", {
      pluginId: args.pluginId,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
      status: "creating",
      createdAt: Date.now(),
    });
    
    return sandboxId;
  },
});

// Update sandbox status and URL
export const updateSandbox = mutation({
  args: {
    sandboxId: v.id("sandboxes"),
    status: v.optional(v.union(
      v.literal("creating"),
      v.literal("active"),
      v.literal("terminated"),
      v.literal("error")
    )),
    sandboxUrl: v.optional(v.string()),
    modalSandboxId: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    serviceStatus: v.optional(v.union(
      v.literal("running"),
      v.literal("stopped"),
      v.literal("unknown")
    )),
    lastHealthCheck: v.optional(v.number()),
    restartCount: v.optional(v.number()),
    lastSnapshot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { sandboxId, ...updates } = args;
    
    await ctx.db.patch(sandboxId, {
      ...updates,
      lastAccessedAt: Date.now(),
    });
  },
});



// Action to create sandbox via Modal API
export const createSandboxViaModal = action({
  args: {
    pluginId: v.id("plugins"),
    organizationId: v.id("organizations"),
    createdBy: v.id("users"),
    startDevServer: v.optional(v.boolean()),
    projectType: v.optional(v.string()),
  },
  handler: async (ctx: ActionCtx, args): Promise<{ success: boolean; sandboxId?: any; tunnelUrl?: string }> => {
    console.log("[SANDBOX_CREATE] Starting createSandboxViaModal with args:", args);
    
    // Check if sandbox already exists
    console.log("[SANDBOX_CREATE] Checking for existing sandbox...");
    const existingSandbox = await ctx.runQuery(api.sandboxes.getSandboxForPlugin, {
      pluginId: args.pluginId,
      organizationId: args.organizationId,
    });

    console.log("[SANDBOX_CREATE] Existing sandbox found:", existingSandbox);

    if (existingSandbox && existingSandbox.status === "active") {
      console.log("[SANDBOX_CREATE] Using existing active sandbox");
      return { success: true, sandboxId: existingSandbox._id, tunnelUrl: existingSandbox.sandboxUrl };
    }

    // Create sandbox record first
    console.log("[SANDBOX_CREATE] Creating new sandbox record...");
    const sandboxId: any = await ctx.runMutation(api.sandboxes.createSandbox, {
      pluginId: args.pluginId,
      organizationId: args.organizationId,
      createdBy: args.createdBy,
    });

    console.log("[SANDBOX_CREATE] Sandbox record created with ID:", sandboxId);

    try {
      // Call Modal to create sandbox with dev server option
      const modalPayload = {
        plugin_id: args.pluginId,
        organization_id: args.organizationId,
        start_dev_server: args.startDevServer ?? true, // Default to true for new plugins
        project_type: args.projectType ?? "tanstack-start",
      };
      
      console.log("[SANDBOX_CREATE] Calling Modal API with payload:", modalPayload);
      console.log("[SANDBOX_CREATE] Modal URL:", "https://jverre--ttyd-sandbox-create-sandbox.modal.run");
      console.log("[SANDBOX_CREATE] Auth token exists:", !!process.env.MODAL_AUTH_TOKEN);
      
      const modalResponse = await fetch(
        "https://jverre--ttyd-sandbox-create-sandbox.modal.run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${process.env.MODAL_AUTH_TOKEN}`,
          },
          body: JSON.stringify(modalPayload),
        }
      );

      console.log("[SANDBOX_CREATE] Modal response status:", modalResponse.status);
      console.log("[SANDBOX_CREATE] Modal response ok:", modalResponse.ok);

      if (!modalResponse.ok) {
        const errorText = await modalResponse.text();
        console.error("[SANDBOX_CREATE] Modal response error:", errorText);
        
        // Update sandbox status to error
        await ctx.runMutation(api.sandboxes.updateSandbox, {
          sandboxId,
          status: "error",
        });
        throw new Error(`Failed to create sandbox: ${modalResponse.status} - ${errorText}`);
      }

      const responseText = await modalResponse.text();
      console.log("[SANDBOX_CREATE] Raw modal response text:", responseText);
      
      let modalData;
      try {
        modalData = JSON.parse(responseText);
        console.log("[SANDBOX_CREATE] Parsed modal response data:", modalData);
      } catch (parseError) {
        console.error("[SANDBOX_CREATE] Failed to parse modal response as JSON:", parseError);
        throw new Error(`Invalid JSON response from Modal: ${responseText}`);
      }
      
      // Extract tunnel URL from tunnel_info if available
      const tunnelUrl = modalData.tunnel_info?.url || modalData.sandbox_url;
      console.log("[SANDBOX_CREATE] Extracted tunnel URL:", tunnelUrl);
      
      // Update sandbox with success information
      const updateData = {
        sandboxId,
        status: "active" as const,
        modalSandboxId: modalData.sandbox_id,
        sandboxUrl: tunnelUrl,
        serviceStatus: modalData.tunnel_info ? "running" as const : "stopped" as const,
        expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
        lastHealthCheck: Date.now(),
      };
      
      console.log("[SANDBOX_CREATE] Updating sandbox with data:", updateData);
      
      await ctx.runMutation(api.sandboxes.updateSandbox, updateData);

      console.log("[SANDBOX_CREATE] Sandbox updated successfully");

      return { 
        success: true, 
        sandboxId,
        tunnelUrl 
      };
    } catch (error) {
      console.error("[SANDBOX_CREATE] Error occurred:", error);
      
      // Update sandbox status to error
      await ctx.runMutation(api.sandboxes.updateSandbox, {
        sandboxId,
        status: "error",
      });
      throw error;
    }
  },
}); 