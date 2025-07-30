"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/components/providers/TenantProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CenteredLoading } from "@/components/ui/loading";
import { Footer } from "@/components/layout/footer";

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
  const router = useRouter();
  
  // Redirect users without organization to create-organization page
  useEffect(() => {
    if (!isLoading && isAuthenticated && !hasAccess && accessReason === "no_organization") {
      router.push('/create-organization');
    }
  }, [isLoading, isAuthenticated, hasAccess, accessReason, router]);

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
      // Show loading state while redirecting
      return (
        <div className="h-screen flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <CenteredLoading 
              title="Redirecting..."
              description="Taking you to create your organization"
            />
          </div>
          <Footer />
        </div>
      );
    }

    if (accessReason === "wrong_organization" && user?.organization) {
      return (
        <div className="h-screen flex flex-col">
          <div className="flex-1 flex items-center justify-center">
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
          <Footer />
        </div>
      );
    }

    // Generic error state
    return (
      <div className="h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center bg-background">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You don&apos;t have access to this workspace.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // User has access - show children
  return children;
}