import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";

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

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      const userId = existingUserId || await ctx.db.insert("users", {
        email: profile.email!,
        name: profile.name || profile.email!.split("@")[0],
        image: profile.image,
        createdAt: Date.now(),
      });
      
      // Ensure user has an API key for VS Code extension
      const existingApiKey = await ctx.db
        .query("apiKeys")
        .filter(q => q.and(
          q.eq(q.field("userId"), userId),
          q.eq(q.field("name"), "VS Code Extension"),
          q.eq(q.field("isActive"), true)
        ))
        .first();
      
      if (!existingApiKey) {
        // Create API key if user doesn't have one
        const apiKey = generateApiKey();
        await ctx.db.insert("apiKeys", {
          userId,
          key: apiKey,
          name: "VS Code Extension",
          createdAt: Date.now(),
          isActive: true,
        });
      }
      
      return userId;
    },
  },
});
