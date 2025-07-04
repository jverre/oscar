import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// List timeline events for the current user
export const list = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return [];
        }

        const limit = args.limit || 50;

        const events = await ctx.db
            .query("timeline_events")
            .withIndex("by_user_and_timestamp", (q) => 
                q.eq("userId", userId)
            )
            .order("desc")
            .take(limit);

        return events;
    },
});