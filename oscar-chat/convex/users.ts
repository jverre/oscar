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

export const validateTenantAccess = query({
  args: { 
    userId: v.string(),
    tenant: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = args.userId as any;
    
    const user = await ctx.db.get(userId);
    if (!user) {
      return {
        hasAccess: false,
        reason: "not_authenticated",
        user: null,
      };
    }
    
    // Check if user has an organization
    if (!("organizationId" in user) || !user.organizationId) {
      return {
        hasAccess: false,
        reason: "no_organization",
        user: {
          ...user,
          organization: null,
        },
      };
    }
    
    // Fetch the organization
    const organization = await ctx.db.get(user.organizationId);
    if (!organization) {
      return {
        hasAccess: false,
        reason: "organization_not_found",
        user: {
          ...user,
          organization: null,
        },
      };
    }
    
    // Check if organization subdomain matches the requested tenant
    if (organization.subdomain !== args.tenant) {
      return {
        hasAccess: false,
        reason: "wrong_organization",
        user: {
          ...user,
          organization,
        },
      };
    }
    
    // User has access
    return {
      hasAccess: true,
      reason: null,
      user: {
        ...user,
        organization,
      },
    };
  },
});