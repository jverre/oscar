import { v } from "convex/values";
import { mutation, query, action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Toggle marketplace plugin activation for an organization
export const toggleMarketplacePlugin = mutation({
  args: {
    organizationId: v.id("organizations"),
    marketplacePluginId: v.id("pluginMarketplace"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if already activated
    const existing = await ctx.db
      .query("organizationMarketplacePlugins")
      .withIndex("by_org_marketplace")
      .filter((q) =>
        q.and(
          q.eq(q.field("organizationId"), args.organizationId),
          q.eq(q.field("marketplacePluginId"), args.marketplacePluginId)
        )
      )
      .first();

    if (existing) {
      // Toggle activation status
      await ctx.db.patch(existing._id, {
        isActive: !existing.isActive,
      });
      
      if (!existing.isActive) {
        // If activating, create demo file and sandbox
        const marketplacePlugin = await ctx.db.get(args.marketplacePluginId);
        if (marketplacePlugin) {
          const marketplacePluginStringId = `marketplace_${marketplacePlugin._id}`;
          
          // Create demo file
          const fileId = await ctx.runMutation(api.files.createPluginDemoFile, {
            userId: args.userId,
            organizationId: args.organizationId,
            pluginId: marketplacePluginStringId,
          });

          // Update the organizationMarketplacePlugins record with the fileId
          await ctx.db.patch(existing._id, {
            fileId: fileId as Id<"files">,
          });
        }
      }
    } else {
      // Create new activation
      const organizationMarketplacePluginsId = await ctx.db.insert("organizationMarketplacePlugins", {
        organizationId: args.organizationId,
        marketplacePluginId: args.marketplacePluginId,
        isActive: true,
        createdAt: Date.now(),
      });
      
      // Create demo file and sandbox
      const marketplacePlugin = await ctx.db.get(args.marketplacePluginId);
      if (marketplacePlugin) {
        const marketplacePluginStringId = `marketplace_${marketplacePlugin._id}`;
        
        // Create demo file
        const fileId = await ctx.runMutation(api.files.createPluginDemoFile, {
          userId: args.userId,
          organizationId: args.organizationId,
          pluginId: marketplacePluginStringId,
        });

        await ctx.db.patch(organizationMarketplacePluginsId, {
          fileId: fileId as Id<"files">,
        });
      }
    }
  },
});