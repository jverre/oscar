import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get organization by name
export const getByName = query({
  args: {
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

    // Find organization by name
    const organization = await ctx.db
      .query("organizations")
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (!organization) {
      return null;
    }

    // Verify user has access to this organization
    if (organization._id !== user.organizationId) {
      return null;
    }

    return organization;
  },
});

// Get current user's organization
export const getCurrentUserOrg = query({
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

    return await ctx.db.get(user.organizationId);
  },
});