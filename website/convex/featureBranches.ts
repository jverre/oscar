import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { SandboxStatus } from "./schema";

export const create = mutation({
  args: {
    name: v.string(),
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }

    // Verify the user owns the repository
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository || repository.ownerId !== userId) {
      throw new Error("Repository not found or access denied");
    }

    const featureBranchId = await ctx.db.insert("featureBranches", {
      name: args.name,
      repositoryId: args.repositoryId,
      ownerId: userId,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.sandbox.createSandbox, {
      featureBranchId: featureBranchId,
    });

    return featureBranchId;
  },
});

export const getByName = action({
  args: {
    repositoryName: v.string(),
    featureName: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the feature branch from the database
    const repository = await ctx.runQuery(internal.featureBranches.getRepositoryByName, {
      repositoryName: args.repositoryName,
    });

    if (!repository) {
      return null;
    }

    const featureBranch = await ctx.runQuery(internal.featureBranches.getFeatureBranchByName, {
      repositoryId: repository._id,
      featureName: args.featureName,
    });

    if (!featureBranch) {
      return null;
    }

    // Only do health check if sandbox is running
    if (featureBranch.sandboxStatus === SandboxStatus.RUNNING && featureBranch.sandboxUrl && featureBranch.sandboxId) {
      try {
        const healthResponse = await fetch(`${featureBranch.sandboxUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        if (!healthResponse.ok) {
          // Health check failed - trigger restart
          console.log(`Health check failed for sandbox ${featureBranch.sandboxId}, triggering restart...`);

          // Update status to stopped
          await ctx.runMutation(internal.featureBranches.updateSandbox, {
            featureBranchId: featureBranch._id,
            sandboxId: featureBranch.sandboxId,
            sandboxStatus: SandboxStatus.STARTING_SERVER,
            sandboxUrl: featureBranch.sandboxUrl,
            sandboxUrlToken: featureBranch.sandboxUrlToken,
          });

          // Trigger restart
          await ctx.scheduler.runAfter(0, internal.sandbox.restartSandbox, {
            featureBranchId: featureBranch._id,
            sandboxId: featureBranch.sandboxId,
          });

          // Return updated status
          return {
            ...featureBranch,
            sandboxStatus: SandboxStatus.STARTING_SERVER,
          };
        }
      } catch (error) {
        // Health check failed - trigger restart
        console.log(`Health check failed for sandbox ${featureBranch.sandboxId}:`, error);

        // Update status to starting server (restarting)
        await ctx.runMutation(internal.featureBranches.updateSandbox, {
          featureBranchId: featureBranch._id,
          sandboxId: featureBranch.sandboxId,
          sandboxStatus: SandboxStatus.STARTING_SERVER,
          sandboxUrl: featureBranch.sandboxUrl,
          sandboxUrlToken: featureBranch.sandboxUrlToken,
        });

        // Trigger restart
        await ctx.scheduler.runAfter(0, internal.sandbox.restartSandbox, {
          featureBranchId: featureBranch._id,
          sandboxId: featureBranch.sandboxId,
        });

        // Return updated status
        return {
          ...featureBranch,
          sandboxStatus: SandboxStatus.STARTING_SERVER,
        };
      }
    }

    return featureBranch;
  },
});

export const getByRepository = query({
  args: {
    repositoryId: v.id("repositories"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Verify the user owns the repository
    const repository = await ctx.db.get(args.repositoryId);
    if (!repository || repository.ownerId !== userId) {
      return [];
    }

    const featureBranches = await ctx.db
      .query("featureBranches")
      .withIndex("by_repository", (q) => q.eq("repositoryId", args.repositoryId))
      .collect();

    return featureBranches;
  },
});

export const deleteFeatureBranch = mutation({
  args: {
    featureBranchId: v.id("featureBranches"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Verify the user owns the feature branch
    const featureBranch = await ctx.db.get(args.featureBranchId);
    if (!featureBranch || featureBranch.ownerId !== userId) {
      throw new Error("Feature branch not found or access denied");
    }

    // Delete the associated sandbox if it exists
    if (featureBranch.sandboxId) {
      await ctx.scheduler.runAfter(0, internal.sandbox.deleteSandbox, {
        sandboxId: featureBranch.sandboxId,
      });
    }

    await ctx.db.delete(args.featureBranchId);
  },
});

export const updateSandbox = internalMutation({
  args: {
    featureBranchId: v.id("featureBranches"),
    sandboxId: v.string(),
    sandboxStatus: v.string(),
    sandboxUrl: v.optional(v.string()),
    sandboxUrlToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.featureBranchId, {
      sandboxId: args.sandboxId,
      sandboxStatus: args.sandboxStatus,
      sandboxUrl: args.sandboxUrl || undefined,
      sandboxUrlToken: args.sandboxUrlToken || undefined,
    });
  },
});

export const getRepositoryByName = internalQuery({
  args: {
    repositoryName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.query("repositories")
      .filter((q) => q.eq(q.field("name"), args.repositoryName))
      .first();
  },
});

export const getFeatureBranchByName = internalQuery({
  args: {
    repositoryId: v.id("repositories"),
    featureName: v.string(),
  },
  handler: async (ctx, args) => {
    const featureBranch = await ctx.db.query("featureBranches")
      .filter((q) => q.eq(q.field("name"), args.featureName))
      .first();

    if (!featureBranch || featureBranch.repositoryId !== args.repositoryId) {
      return null;
    }

    return featureBranch;
  },
});