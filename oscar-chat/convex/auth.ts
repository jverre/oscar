import { convexAuth } from "@convex-dev/auth/server";
import Google from "@auth/core/providers/google";

export const { auth, signIn, signOut, store } = convexAuth({
  providers: [Google],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, profile }) {
      if (existingUserId) {
        return existingUserId;
      }
      
      // Create new user
      const userId = await ctx.db.insert("users", {
        email: profile.email!,
        name: profile.name || profile.email!.split("@")[0],
        image: profile.image,
        createdAt: Date.now(),
      });
      
      return userId;
    },
  },
});
