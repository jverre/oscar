import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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

    return featureBranchId;
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

    await ctx.db.delete(args.featureBranchId);
  },
});