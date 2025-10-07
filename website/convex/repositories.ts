import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    name: v.string(),
    repositoryUrl: v.string(),
    cloneSource: v.optional(v.union(v.literal('url'), v.literal('github'))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return;
    }

    const repositoryId = await ctx.db.insert("repositories", {
      name: args.name,
      repositoryUrl: args.repositoryUrl,
      ownerId: userId,
      cloneSource: args.cloneSource || "url",
      createdAt: Date.now(),
    });

    return repositoryId;
  },
});

export const getUserRepositories = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const repositories = await ctx.db
      .query("repositories")
      .filter((q) => q.eq(q.field("ownerId"), userId))
      .collect();

    return repositories;
  },
});