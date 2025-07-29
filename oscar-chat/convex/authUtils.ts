import { GenericQueryCtx, GenericMutationCtx } from "convex/server";
import { DataModel } from "./_generated/dataModel";
import { Id } from "./_generated/dataModel";

type AuthContext = GenericQueryCtx<DataModel> | GenericMutationCtx<DataModel>;

export interface AuthenticatedUser {
  _id: Id<"users">;
  email: string;
  name?: string;
  image?: string;
  organizationId?: Id<"organizations">;
  organizationRole?: "owner" | "member";
}

export interface UserWithOrganization extends AuthenticatedUser {
  organization: {
    _id: Id<"organizations">;
    name: string;
    subdomain: string;
    ownerId: Id<"users">;
    plan: "free" | "pro";
    createdAt: number;
  } | null;
}

export async function requireAuth(ctx: AuthContext): Promise<AuthenticatedUser> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  
  const user = await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("_id"), identity.subject!))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user as AuthenticatedUser;
}

export async function getAuthenticatedUser(ctx: AuthContext): Promise<AuthenticatedUser | null> {
  try {
    return await requireAuth(ctx);
  } catch {
    return null;
  }
}

export async function requireOrgMember(ctx: AuthContext, organizationId: Id<"organizations">): Promise<UserWithOrganization> {
  const user = await requireAuth(ctx);
  
  if ((!user.organizationId || user.organizationId !== organizationId)) {
    throw new Error("Access denied: User does not belong to this organization");
  }

  const organization = await ctx.db.get(organizationId);
  if (!organization) {
    throw new Error("Organization not found");
  }

  return {
    ...user,
    organization,
  };
}

export async function requireOrgOwner(ctx: AuthContext, organizationId: Id<"organizations">): Promise<UserWithOrganization> {
  const userWithOrg = await requireOrgMember(ctx, organizationId);
  
  if (userWithOrg.organizationRole !== "owner") {
    throw new Error("Access denied: Organization owner access required");
  }

  return userWithOrg;
}

export function validateUserOrgAccess(user: AuthenticatedUser, organizationId: Id<"organizations">): boolean {
  return user.organizationId === organizationId;
}

export function isOrgOwner(user: AuthenticatedUser, organizationId: Id<"organizations">): boolean {
  return user.organizationId === organizationId && user.organizationRole === "owner";
}

export async function requireUserExists(ctx: AuthContext, userId: Id<"users">): Promise<AuthenticatedUser> {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user as AuthenticatedUser;
}

