import { v } from "convex/values";
import { query } from "./_generated/server";


// List timeline events for the current user
export const list = query({
    args: {limit: v.optional(v.number()), userId: v.id("users")},
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity(); const userId = identity?.subject as any;
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