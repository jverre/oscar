import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { RESERVED_SUBDOMAINS, SUBDOMAIN_REGEX } from "./constants";

// Mutation for org creation (called from client with NextAuth)
export const createOrganization = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    subdomain: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate subdomain
    if (!SUBDOMAIN_REGEX.test(args.subdomain)) {
      throw new Error("Invalid subdomain format");
    }
    
    if (RESERVED_SUBDOMAINS.includes(args.subdomain)) {
      throw new Error("Subdomain is reserved");
    }
    
    // Check if subdomain exists
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .unique();
    
    if (existing) {
      throw new Error("Subdomain already taken");
    }
    
    // Get the user ID from the args
    const userId = args.userId as any;
    
    // Check if user already has an org
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    
    // Check if this is a user document with organizationId
    if ("organizationId" in user && user.organizationId) {
      throw new Error("User already has an organization");
    }
    
    // Create organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      subdomain: args.subdomain,
      ownerId: userId,
      plan: "free",
      createdAt: Date.now(),
    });
    
    // Update user with org
    await ctx.db.patch(userId, {
      organizationId: orgId,
      organizationRole: "owner",
    });
    
    return { organizationId: orgId, subdomain: args.subdomain };
  },
});