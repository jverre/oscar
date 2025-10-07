import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const userData = internalQuery({
    args: {userId: v.id("users")},
    handler: async (ctx, args) => {
        const user = await ctx.db.get(args.userId);
        if (!user) {
            return null;
        }
        return {
            userId: user._id,
            email: user.email,
            name: user.name,
            githubInstallationId: user.githubInstallationId,
        }
      },
})