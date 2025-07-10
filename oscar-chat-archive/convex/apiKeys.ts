import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
// Using NextAuth integration - getUserIdentity from ctx.auth

// Generate a secure random API key
function generateApiKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 32;
    let key = 'osk_'; // Oscar API key prefix
    
    for (let i = 0; i < length; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return key;
}

// Create a new API key for a user
export const createApiKey = mutation({
    args: { 
        userId: v.id("users"),
        name: v.string() 
    },
    handler: async (ctx, args) => {
        const key = generateApiKey();
        
        const apiKeyId = await ctx.db.insert("apiKeys", {
            userId: args.userId,
            key,
            name: args.name,
            createdAt: Date.now(),
            isActive: true,
        });
        
        return { id: apiKeyId, key };
    },
});

// Get or create API key for authenticated user
export const getOrCreateApiKey = mutation({
    args: {name: v.string(), userId: v.id("users")},
    handler: async (ctx, args) => {
        const userId = args.userId;
        
        // Check if user already has an active API key with this name
        const existingKey = await ctx.db
            .query("apiKeys")
            .filter(q => q.and(
                q.eq(q.field("userId"), userId),
                q.eq(q.field("name"), args.name),
                q.eq(q.field("isActive"), true)
            ))
            .first();
            
        if (existingKey) {
            return { id: existingKey._id, key: existingKey.key };
        }
        
        // Create new API key
        const key = generateApiKey();
        const apiKeyId = await ctx.db.insert("apiKeys", {
            userId,
            key,
            name: args.name,
            createdAt: Date.now(),
            isActive: true,
        });
        
        return { id: apiKeyId, key };
    },
});

// Get user by API key (for authentication)
// Note: This is a mutation because we need to update lastUsedAt
export const getUserByApiKey = mutation({
    args: {apiKey: v.string()},
    handler: async (ctx, args) => {
        const apiKeyDoc = await ctx.db
            .query("apiKeys")
            .withIndex("by_key", q => q.eq("key", args.apiKey))
            .filter(q => q.eq(q.field("isActive"), true))
            .first();
            
        if (!apiKeyDoc) {
            return null;
        }
        
        // Update last used timestamp
        await ctx.db.patch(apiKeyDoc._id, {
            lastUsedAt: Date.now(),
        });
        
        // Get user
        const user = await ctx.db.get(apiKeyDoc.userId);
        return user;
    },
});

// List API keys for authenticated user
export const listApiKeys = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }
        const userId = identity.subject as any;
        
        const apiKeys = await ctx.db
            .query("apiKeys")
            .filter(q => q.and(
                q.eq(q.field("userId"), userId),
                q.eq(q.field("isActive"), true)
            ))
            .collect();
            
        // Return keys without the actual key value for security
        return apiKeys.map(({ key, ...rest }) => ({
            ...rest,
            keyPreview: `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
        }));
    },
});

// Revoke an API key
export const revokeApiKey = mutation({
    args: {apiKeyId: v.id("apiKeys"), userId: v.id("users")},
    handler: async (ctx, args) => {
        const userId = args.userId;
        
        const apiKey = await ctx.db.get(args.apiKeyId);
        if (!apiKey) {
            throw new Error("API key not found");
        }
        
        // Verify ownership
        if (userId !== apiKey.userId) {
            throw new Error("Unauthorized");
        }
        
        await ctx.db.patch(args.apiKeyId, {
            isActive: false,
        });
    },
});