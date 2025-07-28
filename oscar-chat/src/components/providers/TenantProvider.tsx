"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

interface Organization {
  _id: Id<"organizations">;
  name: string;
  subdomain: string;
  ownerId: Id<"users">;
  plan: "free" | "pro";
  createdAt: number;
}

interface UserWithOrganization {
  _id: Id<"users">;
  email: string;
  name?: string;
  image?: string;
  organizationId?: Id<"organizations">;
  organizationRole?: "owner" | "member";
  organization: Organization | null;
}

interface TenantContextType {
  subdomain: string | null;
  organization: Organization | null;
  organizationId: Id<"organizations"> | null;
  isAuthenticated: boolean;
  user: UserWithOrganization | null;
  hasAccess: boolean;
  accessReason: string | null;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }

  return context;
};

interface TenantProviderProps {
  children: ReactNode;
  subdomain: string;
}

export const TenantProvider = ({ children, subdomain }: TenantProviderProps) => {
  const { data: session, status: sessionStatus } = useSession();
  
  // Get organization by subdomain (unauthenticated query)
  const organization = useQuery(
    api.users.getOrganizationBySubdomain,
    { subdomain }
  );
  
  // Validate tenant access if user is authenticated
  const accessResult = useQuery(
    api.users.validateTenantAccess,
    session?.user?.id && subdomain !== null
      ? { userId: session.user.id, tenant: subdomain || "" }
      : "skip"
  );

  const isLoading = sessionStatus === "loading" || 
    Boolean(subdomain && organization === undefined) ||
    Boolean(session && subdomain !== null && accessResult === undefined);

  const isAuthenticated = !!session;
  const organizationId = organization?._id || null;
  
  // For base domain (empty subdomain), allow unauthenticated access
  const hasAccess = subdomain === null 
    ? true  // Base domain - always allow access (unauthenticated or authenticated)
    : Boolean(accessResult?.hasAccess); // Subdomain - require auth validation
    
  // Ensure user has required properties and is typed correctly
  const user: UserWithOrganization | null = accessResult?.user && 'email' in accessResult.user 
    ? accessResult.user as UserWithOrganization
    : null;
  const accessReason = accessResult?.reason || null;

  const value: TenantContextType = {
    subdomain,
    organization: organization || null,
    organizationId,
    isAuthenticated,
    user,
    hasAccess,
    accessReason,
    isLoading,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};