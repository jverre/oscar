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
  
  // Single consolidated query for tenant info
  const tenantInfo = useQuery(
    api.users.getTenantInfo,
    {
      subdomain: subdomain || "",
      userId: session?.user?.id
    }
  );

  const isLoading = sessionStatus === "loading" || tenantInfo === undefined;
  const isAuthenticated = !!session;
  const organization = tenantInfo?.organization || null;
  const organizationId = organization?._id || null;
  const hasAccess = tenantInfo?.hasAccess || false;
  const accessReason = tenantInfo?.accessReason || null;
  
  // Ensure user has required properties and is typed correctly
  const user: UserWithOrganization | null = tenantInfo?.user && 'email' in tenantInfo.user 
    ? tenantInfo.user as UserWithOrganization
    : null;

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