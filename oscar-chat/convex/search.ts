import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Combined search across files and messages
export const searchCombined = query({
    args: {
        searchText: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) {
            return {
                files: [],
                messages: [],
                totalResults: 0
            };
        }

        // Get the user to find their organization
        const user = await ctx.db.get(userId);
        if (!user) {
            return {
                files: [],
                messages: [],
                totalResults: 0
            };
        }

        const limit = args.limit || 20;
        const searchText = args.searchText.trim();
        
        if (!searchText) {
            return {
                files: [],
                messages: [],
                totalResults: 0
            };
        }

        // Search files by name
        const fileResults = await ctx.db
            .query("files")
            .withSearchIndex("search_name", (q) =>
                q.search("name", searchText)
                 .eq("organizationId", user.organizationId)
            )
            .take(Math.floor(limit / 2)); // Allocate half the limit to files

        // Search messages by content
        const messageResults = await ctx.db
            .query("messages")
            .withSearchIndex("search_content", (q) =>
                q.search("searchableText", searchText)
                 .eq("userId", userId)
            )
            .take(Math.floor(limit / 2)); // Allocate half the limit to messages

        // Get file information for message results
        const messageResultsWithFiles = await Promise.all(
            messageResults.map(async (message) => {
                const file = await ctx.db.get(message.fileId);
                return {
                    ...message,
                    file
                };
            })
        );

        // Filter out messages from files not in user's organization
        const validMessageResults = messageResultsWithFiles.filter(
            (result) => result.file && result.file.organizationId === user.organizationId
        );

        return {
            files: fileResults,
            messages: validMessageResults,
            totalResults: fileResults.length + validMessageResults.length
        };
    },
});

