import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAuth, getAuthenticatedUser } from "./authUtils";
import { Id } from "./_generated/dataModel";

export const currentUser = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    // Verify the requesting user is authenticated and matches the requested userId
    const authenticatedUser = await requireAuth(ctx);
    const userId = args.userId as any;
    
    if (authenticatedUser._id !== userId) {
      throw new Error("Access denied: Cannot access another user's information");
    }
    
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

export const getOrganizationBySubdomain = query({
  args: { 
    subdomain: v.string(),
  },
  handler: async (ctx, args) => {
    // Handle empty subdomain (base domain)
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .unique();

    return organization;
  },
});

export const validateTenantAccess = query({
  args: { 
    userId: v.string(),
    tenant: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = args.userId as Id<"users">;
    
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), userId))
      .unique();
      
    if (!user) {
      return {
        hasAccess: false,
        reason: "not_authenticated",
        user: null,
      };
    }
    
    
    // Check if user has an organization
    if (!user.organizationId) {
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

export const getTenantInfo = query({
  args: { 
    subdomain: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // First, get the organization by subdomain (unauthenticated)
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_subdomain", (q) => q.eq("subdomain", args.subdomain))
      .unique();

    // If no userId provided, return just organization info (unauthenticated case)
    if (!args.userId) {
      return {
        organization,
        hasAccess: false, // No subdomain allows unauthenticated access
        accessReason: "not_authenticated",
        user: null,
      };
    }

    // If userId provided, validate access
    const userId = args.userId as Id<"users">;
    
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), userId))
      .unique();
      
    if (!user) {
      return {
        organization,
        hasAccess: false, // No subdomain allows access without user
        accessReason: "not_authenticated",
        user: null,
      };
    }
    
    // All subdomains (including base domain) require user to have matching organization
    if (!user.organizationId) {
      return {
        organization,
        hasAccess: false,
        accessReason: "no_organization",
        user: {
          ...user,
          organization: null,
        },
      };
    }
    
    const userOrganization = await ctx.db.get(user.organizationId);
    if (!userOrganization) {
      return {
        organization,
        hasAccess: false,
        accessReason: "organization_not_found",
        user: {
          ...user,
          organization: null,
        },
      };
    }
    
    // Check if user's organization matches the requested subdomain
    if (userOrganization.subdomain !== args.subdomain) {
      return {
        organization,
        hasAccess: false,
        accessReason: "wrong_organization",
        user: {
          ...user,
          organization: userOrganization,
        },
      };
    }
    
    // User has access
    return {
        organization,
        hasAccess: true,
        accessReason: null,
        user: {
          ...user,
          organization: userOrganization,
        },
      };
  },
});