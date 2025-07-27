import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import type { ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const getPlugins = mutation({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args): Promise<Array<any>> => {
    // Get regular organization plugins
    const plugins = await ctx.db
      .query("plugins")
      .withIndex("by_org")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .order("desc")
      .collect();

    // Get all marketplace plugins
    const allMarketplacePlugins = await ctx.db
      .query("pluginMarketplace")
      .collect();

    // Get organization's existing marketplace plugin records
    const orgMarketplacePlugins = await ctx.db
      .query("organizationMarketplacePlugins")
      .withIndex("by_org")
      .filter((q) => q.eq(q.field("organizationId"), args.organizationId))
      .collect();

    // Create a map of existing org marketplace plugins
    const existingOrgPluginMap = new Map(
      orgMarketplacePlugins.map(omp => [omp.marketplacePluginId, omp])
    );

    // Create missing organizationMarketplacePlugins and get all marketplace plugin details
    const marketplacePluginDetails = [];
    for (const mp of allMarketplacePlugins) {
      let orgPlugin = existingOrgPluginMap.get(mp._id);
      
      // If no org record exists, create it
      if (!orgPlugin) {
        const orgMarketplacePluginId = await ctx.db.insert("organizationMarketplacePlugins", {
          organizationId: args.organizationId,
          marketplacePluginId: mp._id,
          isActive: true,
          createdAt: Date.now(),
        });

        // Create demo file for this marketplace plugin
        const marketplacePluginStringId = `marketplace_${mp._id}`;
        const fileId: Id<"files"> = await ctx.runMutation(api.files.createPluginDemoFile, {
          userId: args.userId,
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

      marketplacePluginDetails.push({
        _id: `marketplace_${mp._id}`,
        name: mp.name,
        organizationId: args.organizationId,
        visibility: "public" as const,
        fileExtension: mp.fileExtension,
        fileId: orgPlugin?.fileId,
        createdBy: "system" as any,
        createdAt: mp.createdAt,
        updatedAt: mp.updatedAt,
        isTemplate: true,
        snapshotId: mp.snapshotId,
        marketplacePluginId: mp._id,
      });
    }

    // Combine regular plugins and marketplace plugins
    return [...plugins.map(p => ({ ...p, isTemplate: false })), ...marketplacePluginDetails];
  },
});

export const createPlugin = mutation({
  args: {
    name: v.string(),
    organizationId: v.id("organizations"),
    visibility: v.union(v.literal("private"), v.literal("public")),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log("[PLUGIN_CREATE] Starting plugin creation with args:", args);
    
    const pluginId = await ctx.db.insert("plugins", {
      name: args.name,
      organizationId: args.organizationId,
      visibility: args.visibility,
      isActive: true, // Always active now
      snapshotId: "im-rBgnGddbIwi512SqoanqPS",
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    console.log("[PLUGIN_CREATE] Plugin inserted with ID:", pluginId);

    // Create hidden demo file for this plugin
    console.log("[PLUGIN_CREATE] Creating demo file for plugin:", pluginId);
    const fileId: Id<"files"> = await ctx.runMutation(api.files.createPluginDemoFile, {
      userId: args.userId,
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
    name: v.optional(v.string()),
    visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
    fileExtension: v.optional(v.string()),
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
    // Delete the plugin from database
    await ctx.db.delete(args.pluginId);

  },
});


export const getPluginById = query({
  args: {
    pluginId: v.union(v.id("plugins"), v.string()),
  },
  handler: async (ctx, args) => {
    if (typeof args.pluginId === 'string' && args.pluginId.startsWith('marketplace_')) {
      // Handle marketplace plugin
      const marketplacePluginId = args.pluginId.replace('marketplace_', '') as Id<"pluginMarketplace">;
      const marketplacePlugin = await ctx.db.get(marketplacePluginId);
      
      if (!marketplacePlugin) {
        return null;
      }
      
      // Return in the same format as regular plugins
      return {
        _id: args.pluginId,
        name: marketplacePlugin.name,
        snapshotId: marketplacePlugin.snapshotId,
        fileExtension: marketplacePlugin.fileExtension,
        isTemplate: true,
        createdAt: marketplacePlugin.createdAt,
        updatedAt: marketplacePlugin.updatedAt,
      };
    } else {
      // Handle regular plugin
      const plugin = await ctx.db.get(args.pluginId as Id<"plugins">);
      return plugin;
    }
  },
});

export const getPluginByExtension = query({
  args: {
    extension: v.string(),
  },
  handler: async (ctx, args) => {
    const plugin = await ctx.db.query("plugins").filter((q) => q.eq(q.field("fileExtension"), args.extension)).first();
    return plugin;
  },
});

