"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface TenantAccessGuardProps {
  children: React.ReactNode;
  tenant: string;
}

export function TenantAccessGuard({ children, tenant }: TenantAccessGuardProps) {
  const { data: session, status } = useSession();
  const accessResult = useQuery(
    api.users.validateTenantAccess, 
    session?.user?.id ? { userId: session.user.id, tenant } : "skip"
  );

  // Loading state
  if (status === "loading" || (session && accessResult === undefined)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">Loading...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User not authenticated
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in to {tenant}</CardTitle>
            <CardDescription>
              You need to sign in to access this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                // Get current domain info
                const protocol = window.location.protocol;
                const hostname = window.location.hostname;
                const port = window.location.port ? `:${window.location.port}` : "";
                
                // Extract base domain
                const parts = hostname.split('.');
                let baseDomain;
                if (parts.length >= 2) {
                  baseDomain = parts.slice(-2).join('.');
                } else {
                  baseDomain = hostname;
                }
                
                // Redirect to signin with workspace parameter
                const signinUrl = `${protocol}//${baseDomain}${port}/signin?workspace=${tenant}`;
                window.location.href = signinUrl;
              }}
              className="w-full"
            >
              Sign in to {tenant}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if we're still loading the access result
  if (!accessResult) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            <div className="text-center">Validating access...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle different access denial reasons
  if (!accessResult.hasAccess) {
    const { reason, user } = accessResult;
    
    if (reason === "no_organization") {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>No Organization</CardTitle>
              <CardDescription>
                You need to create an organization first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => {
                  // Get current domain info
                  const protocol = window.location.protocol;
                  const hostname = window.location.hostname;
                  const port = window.location.port ? `:${window.location.port}` : "";
                  
                  // Extract base domain
                  const parts = hostname.split('.');
                  let baseDomain;
                  if (parts.length >= 2) {
                    baseDomain = parts.slice(-2).join('.');
                  } else {
                    baseDomain = hostname;
                  }
                  
                  // Redirect to signin to create org
                  const signinUrl = `${protocol}//${baseDomain}${port}/signin`;
                  window.location.href = signinUrl;
                }}
                className="w-full"
              >
                Create Organization
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (reason === "wrong_organization" && user?.organization) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don't have access to the "{tenant}" workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are signed in as {'email' in user ? user.email : 'unknown'} and belong to the "{user.organization.name}" workspace.
              </p>
              <Button
                onClick={() => {
                  // Get current domain info
                  const protocol = window.location.protocol;
                  const hostname = window.location.hostname;
                  const port = window.location.port ? `:${window.location.port}` : "";
                  
                  // Extract base domain
                  const parts = hostname.split('.');
                  let baseDomain;
                  if (parts.length >= 2) {
                    baseDomain = parts.slice(-2).join('.');
                  } else {
                    baseDomain = hostname;
                  }
                  
                  // Redirect to user's actual workspace
                  const workspaceUrl = `${protocol}//${user.organization.subdomain}.${baseDomain}${port}`;
                  window.location.href = workspaceUrl;
                }}
                className="w-full"
              >
                Go to your workspace: {user.organization.name}
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Generic error state
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have access to this workspace.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // User has access - show children
  return children;
}