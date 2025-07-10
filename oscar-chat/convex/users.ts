import { query } from "./_generated/server";
import { v } from "convex/values";

export const currentUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const userId = args.userId as any;
    
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    
    // If user has an organization, fetch it too
    if ("organizationId" in user && user.organizationId) {
      const organization = await ctx.db.get(user.organizationId);
      return {
        ...user,
        organization,
      };
    }
    
    // Return user without organization
    return {
      ...user,
      organization: null,
    };
  },
});