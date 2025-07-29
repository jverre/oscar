"use client";

import { useTenant } from "@/components/providers/TenantProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CenteredLoading } from "@/components/ui/loading";

interface TenantAccessGuardProps {
  children: React.ReactNode;
}

export function TenantAccessGuard({ children }: TenantAccessGuardProps) {
  const { 
    subdomain, 
    isAuthenticated, 
    hasAccess, 
    accessReason, 
    user, 
    isLoading 
  } = useTenant();

  // Loading state
  if (isLoading) {
    return (
      <CenteredLoading 
        title="Loading workspace..."
        description="Checking access permissions"
        className="min-h-screen bg-background"
      />
    );
  }

  // User not authenticated - allow access to all domains to view public content
  if (!isAuthenticated) {
    return children;
  }

  // Handle different access denial reasons
  if (!hasAccess) {
    
    if (accessReason === "no_organization") {
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

    if (accessReason === "wrong_organization" && user?.organization) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don&apos;t have access to the &quot;{subdomain}&quot; workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are signed in as {`${'email' in user ? user.email : 'unknown'}`} and belong to the `{user.organization.name}` workspace.
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
                  const workspaceUrl = `${protocol}//${user.organization?.subdomain}.${baseDomain}${port}`;
                  window.location.href = workspaceUrl;
                }}
                className="w-full"
              >
                Go to your workspace: {user.organization?.name}
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
              You don&apos;t have access to this workspace.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // User has access - show children
  return children;
}