import { mutation, query, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { requireOrgMember } from "./authUtils";
import { MARKETPLACE_PLUGINS } from "./constants";
import { lsTools } from "./tools/ls";
import { readTools } from "./tools/read";
import { ToolContext } from "./tools/index";

export const getPluginFiles = action({
  args: {
    pluginId: v.union(v.id("plugins"), v.id("organizationMarketplacePlugins"), v.string()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get plugin data
    const plugin = await ctx.runQuery(internal.plugins.getPluginById, {
      pluginId: args.pluginId,
    });
    
    if (!plugin) {
      throw new Error("Plugin not found");
    }
    
    // Verify the plugin belongs to the organization
    if (plugin.organizationId !== args.organizationId) {
      throw new Error("Plugin does not belong to this organization");
    }
    
    // Get sandbox for the plugin using the existing query
    const sandbox = await ctx.runQuery(internal.sandboxes.getSandboxByFileId, {
      fileId: plugin.fileId as Id<"files">,
    });
    
    if (!sandbox || sandbox.status !== "active") {
      return {
        success: false,
        error: "No active sandbox found for this plugin",
        files: []
      };
    }
    
    // Create tool context
    const toolContext: ToolContext = {
      sandboxId: sandbox.modalSandboxId,
      pluginId: plugin._id,
      organizationId: args.organizationId,
      modalAuthToken: process.env.MODAL_AUTH_TOKEN,
    };
    
    // Use ls tool to list files in the sandbox root
    const result = await lsTools.ls.execute(
      { 
        path: "/plugin/",
        ignore: ["node_modules", ".git", ".next", "dist", "build"]
      }, 
      toolContext
    );
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to list files",
        files: []
      };
    }
    
    return {
      success: true,
      files: result.data.files || [],
      output: result.data.output || "",
      truncated: result.data.truncated || false
    };
  },
});

export const fetchPluginFile = action({
  args: {
    pluginId: v.union(v.id("plugins"), v.id("organizationMarketplacePlugins"), v.string()),
    filePath: v.string(),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Get plugin data
    const plugin = await ctx.runQuery(internal.plugins.getPluginById, {
      pluginId: args.pluginId,
    });
    
    if (!plugin) {
      throw new Error("Plugin not found");
    }
    
    // Verify the plugin belongs to the organization
    if (plugin.organizationId !== args.organizationId) {
      throw new Error("Plugin does not belong to this organization");
    }
    
    // Get sandbox for the plugin
    const sandbox = await ctx.runQuery(internal.sandboxes.getSandboxByFileId, {
      fileId: plugin.fileId as Id<"files">,
    });
    
    if (!sandbox || sandbox.status !== "active") {
      return {
        success: false,
        error: "No active sandbox found for this plugin",
        content: null
      };
    }
    
    // Create tool context
    const toolContext: ToolContext = {
      sandboxId: sandbox.modalSandboxId,
      pluginId: plugin._id,
      organizationId: args.organizationId,
      modalAuthToken: process.env.MODAL_AUTH_TOKEN,
    };
    
    // Prepend /plugin/ to the file path to match sandbox structure
    const fullFilePath = `/plugin${args.filePath.startsWith('/') ? '' : '/'}${args.filePath}`;
    
    // Use read tool to fetch file content
    const result = await readTools.read.execute(
      { 
        file_path: fullFilePath
      }, 
      toolContext
    );
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || "Failed to read file",
        content: null
      };
    }
    
    return {
      success: true,
      content: result.data.content || "",
      metadata: {
        filePath: args.filePath,
        isImage: result.data.is_image || false,
        lineCount: result.data.line_count || 0
      }
    };
  },
});

export const getPlugins = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args): Promise<Array<any>> => {
    // Require user to be a member of the organization and get user info
    const userWithOrg = await requireOrgMember(ctx, args.organizationId);
    // Get regular organization plugins
    const plugins = await ctx.db
      .query("plugins")
      .withIndex("by_org")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .order("desc")
      .collect();

    // Get organization's existing marketplace plugin records
    const orgMarketplacePlugins = await ctx.db
      .query("organizationMarketplacePlugins")
      .withIndex("by_org")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    // Create a map of existing org marketplace plugins by name
    const existingOrgPluginMap = new Map(
      orgMarketplacePlugins.map(omp => [omp.name, omp])
    );

    // Create missing organizationMarketplacePlugins and get all marketplace plugin details
    const marketplacePluginDetails = [];
    for (const [pluginName, pluginData] of Object.entries(MARKETPLACE_PLUGINS)) {
      if (!pluginData.isActive) continue; // Skip inactive plugins
      
      let orgPlugin = existingOrgPluginMap.get(pluginName);
      
      // If no org record exists, create it
      if (!orgPlugin) {
        const orgMarketplacePluginId = await ctx.db.insert("organizationMarketplacePlugins", {
          name: pluginData.name,
          organizationId: args.organizationId,
          visibility: "public",
          snapshotId: pluginData.snapshotId,
          isActive: true,
          fileExtension: pluginData.fileExtension,
          createdBy: userWithOrg._id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Create demo file for this marketplace plugin
        const marketplacePluginStringId = `marketplace_${pluginName}`;
        const fileId: Id<"files"> = await ctx.runMutation(internal.files.createPluginDemoFile, {
          userId: userWithOrg._id,
          organizationId: args.organizationId,
          pluginId: marketplacePluginStringId,
        });

        // Update with fileId
        await ctx.db.patch(orgMarketplacePluginId, {
          fileId: fileId,
        });

        // Get the updated record for our response
        orgPlugin = await ctx.db.get(orgMarketplacePluginId) ?? undefined;
      }

      if (orgPlugin) {
        marketplacePluginDetails.push(orgPlugin);
      }
    }

    // Combine regular plugins and marketplace plugins
    return [...plugins.map(p => ({ ...p, isTemplate: false })), ...marketplacePluginDetails.map(mp => ({ ...mp, isTemplate: true }))];
  },
});

export const createPlugin = mutation({
  args: {
    name: v.string(),
    organizationId: v.id("organizations"),
    visibility: v.union(v.literal("private"), v.literal("public")),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization and get user info
    const userWithOrg = await requireOrgMember(ctx, args.organizationId);
    
    const pluginId = await ctx.db.insert("plugins", {
      name: args.name,
      organizationId: args.organizationId,
      visibility: args.visibility,
      isActive: true, // Always active now
      snapshotId: "im-rBgnGddbIwi512SqoanqPS",
      createdBy: userWithOrg._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const fileId: Id<"files"> = await ctx.runMutation(internal.files.createPluginDemoFile, {
      userId: userWithOrg._id,
      organizationId: args.organizationId,
      pluginId,
    });

    await ctx.db.patch(pluginId, {
      fileId,
    });

    return {pluginId, fileId};
  },
});

export const updatePlugin = mutation({
  args: {
    pluginId: v.id("plugins"),
    organizationId: v.id("organizations"),
    name: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    fileExtension: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);
    
    // Verify the plugin belongs to the organization
    const plugin = await ctx.db.get(args.pluginId);
    if (!plugin) {
      throw new Error("Plugin not found");
    }
    if (plugin.organizationId !== args.organizationId) {
      throw new Error("Plugin does not belong to this organization");
    }
    
    const { pluginId, organizationId, ...updates } = args;
    
    await ctx.db.patch(pluginId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deletePlugin = mutation({
  args: {
    pluginId: v.id("plugins"),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);
    
    // Verify the plugin belongs to the organization
    const plugin = await ctx.db.get(args.pluginId);
    if (!plugin) {
      throw new Error("Plugin not found");
    }
    if (plugin.organizationId !== args.organizationId) {
      throw new Error("Plugin does not belong to this organization");
    }
    
    // Delete the plugin from database
    await ctx.db.delete(args.pluginId);

  },
});


export const getPluginData = query({
  args: {
    pluginId: v.union(v.id("plugins"), v.id("organizationMarketplacePlugins"), v.string()),
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    // Require user to be a member of the organization
    await requireOrgMember(ctx, args.organizationId);
    
    // Handle marketplace plugin string IDs (format: "marketplace_<pluginName>")
    if (typeof args.pluginId === 'string' && args.pluginId.startsWith('marketplace_')) {
      const pluginName = args.pluginId.replace('marketplace_', '');
      
      // Find the organization marketplace plugin by name
      const orgMarketplacePlugin = await ctx.db.query("organizationMarketplacePlugins")
        .filter((q) => q.eq(q.field("name"), pluginName))
        .first();
      
      return orgMarketplacePlugin || null;
    }
    
    // Try to get as regular plugin first
    const plugin = await ctx.db.get(args.pluginId as Id<"plugins">);
    if (plugin) {
      return plugin;
    }
    
    // Try to get as organization marketplace plugin
    const orgMarketplacePlugin = await ctx.db.get(args.pluginId as Id<"organizationMarketplacePlugins">);
    return orgMarketplacePlugin;
  },
});

export const getPluginById = internalQuery({
  args: {
    pluginId: v.union(v.id("plugins"), v.id("organizationMarketplacePlugins"), v.string()),
  },
  handler: async (ctx, args) => {
    // Handle marketplace plugin string IDs (format: "marketplace_<pluginName>")
    if (typeof args.pluginId === 'string' && args.pluginId.startsWith('marketplace_')) {
      const pluginName = args.pluginId.replace('marketplace_', '');
      
      // Find the organization marketplace plugin by name
      const orgMarketplacePlugin = await ctx.db.query("organizationMarketplacePlugins")
        .filter((q) => q.eq(q.field("name"), pluginName))
        .first();
      
      return orgMarketplacePlugin || null;
    }
    
    // Try to get as regular plugin first
    try {
      const plugin = await ctx.db.get(args.pluginId as Id<"plugins">);
      if (plugin) {
        return plugin;
      }
    } catch (e) {
      // Not a plugin ID
    }
    
    // Try to get as organization marketplace plugin
    try {
      const orgMarketplacePlugin = await ctx.db.get(args.pluginId as Id<"organizationMarketplacePlugins">);
      return orgMarketplacePlugin;
    } catch (e) {
      // Not found
    }
    
    return null;
  },
});

export const getPluginByExtension = internalQuery({
  args: {
    extension: v.string(),
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    // If organizationId is provided, search in that organization's plugins first
    if (args.organizationId) {
      // Try to find in organization's regular plugins
      const plugin = await ctx.db.query("plugins")
        .withIndex("by_org")
        .filter((q) => q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("fileExtension"), args.extension)
        ))
        .first();
      if (plugin) {
        return plugin;
      }
      
      // Try to find in organization marketplace plugins
      const orgMarketplacePlugin = await ctx.db.query("organizationMarketplacePlugins")
        .withIndex("by_org")
        .filter((q) => q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("fileExtension"), args.extension)
        ))
        .first();
      if (orgMarketplacePlugin) {
        return orgMarketplacePlugin;
      }
    }
    
    // No plugin found
    return null;
  },
});

