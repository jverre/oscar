import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";
import { internal } from "./_generated/api";

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
      if (existingUserId) {
        // User already exists, just return the ID
        return existingUserId;
      }
      
      // Generate a unique subdomain for the user
      const baseName = (profile.name || profile.email!.split("@")[0])
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      
      let subdomain = baseName;
      let counter = 1;
      
      // Ensure subdomain is unique
      while (true) {
        const existingOrg = await ctx.db
          .query("organizations")
          .filter((q) => q.eq(q.field("subdomain"), subdomain))
          .first();
        
        if (!existingOrg) {
          break;
        }
        
        subdomain = `${baseName}${counter}`;
        counter++;
      }
      
      // Create a personal organization for the new user
      const organizationId = await ctx.db.insert("organizations", {
        name: `${profile.name || profile.email!.split("@")[0]}`,
        domain: profile.email!.split("@")[1],
        subdomain,
        type: "personal",
        createdAt: Date.now(),
      });
      
      // Create the user with the organization
      const userId = await ctx.db.insert("users", {
        email: profile.email!,
        name: profile.name || profile.email!.split("@")[0],
        image: profile.image,
        organizationId,
        createdAt: Date.now(),
      });
      
      // Create API key if user doesn't have one
      const apiKey = generateApiKey();
      await ctx.db.insert("apiKeys", {
        userId,
        key: apiKey,
        name: "VS Code Extension",
        createdAt: Date.now(),
        isActive: true,
      });
      
      return userId;
    },
  },
});
