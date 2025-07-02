import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get team by organization ID and team name
export const getByOrgAndName = query({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    // Get the user to verify access
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Find team by organization and name
    const team = await ctx.db
      .query("teams")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (!team) {
      return null;
    }

    // Verify user has access to this team
    if (team._id !== user.teamId) {
      return null;
    }

    return team;
  },
});

// Get current user's team
export const getCurrentUserTeam = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return await ctx.db.get(user.teamId);
  },
});

// Get team by organization ID and name (public access for public files)
export const getByOrgAndNamePublic = query({
  args: {
    organizationId: v.id("organizations"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Find team by organization and name (no authentication required)
    const team = await ctx.db
      .query("teams")
      .withIndex("by_organization", (q) => q.eq("organizationId", args.organizationId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    return team;
  },
});