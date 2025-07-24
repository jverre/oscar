"use client";

import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery } from "convex/react";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../../convex/_generated/api";
import { validateSubdomain } from "@/utils/validation";

function SignInContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const workspace = searchParams.get("workspace");
  
  const user = useQuery(api.users.currentUser, session?.user?.id ? { userId: session.user.id } : "skip");
  const createOrg = useMutation(api.auth.createOrganization);
  const [orgName, setOrgName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // If user exists with an org, redirect to their workspace or show workspace selector
  if (user && 'email' in user && user.organizationId && user.organization?.subdomain) {
    // If workspace specified in URL, redirect there after auth
    if (workspace) {
      // Check if user has access to this workspace
      if (user.organization.subdomain === workspace) {
        // User has access - redirect to their workspace
        const currentHostname = window.location.hostname;
        const parts = currentHostname.split('.');
        
        let baseDomain;
        if (parts.length >= 2) {
          baseDomain = parts.slice(-2).join('.');
        } else {
          baseDomain = currentHostname;
        }

        const protocol = window.location.protocol;
        const port = window.location.port ? `:${window.location.port}` : "";
        const workspaceUrl = `${protocol}//${workspace}.${baseDomain}${port}`;
        
        window.location.href = workspaceUrl;
        return null;
      } else {
        // User doesn't have access to this workspace
        return (
          <div className="min-h-screen flex items-center justify-center">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  You don't have access to the "{workspace}" workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    const currentHostname = window.location.hostname;
                    const parts = currentHostname.split('.');
                    
                    let baseDomain;
                    if (parts.length >= 2) {
                      baseDomain = parts.slice(-2).join('.');
                    } else {
                      baseDomain = currentHostname;
                    }

                    const protocol = window.location.protocol;
                    const port = window.location.port ? `:${window.location.port}` : "";
                    const orgUrl = `${protocol}//${user.organization?.subdomain}.${baseDomain}${port}`;
                    window.location.href = orgUrl;
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
    }

    // No workspace specified - redirect to user's org
    const currentHostname = window.location.hostname;
    const parts = currentHostname.split('.');

    let baseDomain;
    if (parts.length >= 2) {
      baseDomain = parts.slice(-2).join('.');
    } else {
      baseDomain = currentHostname;
    }

    const protocol = window.location.protocol;
    const port = window.location.port ? `:${window.location.port}` : "";
    const orgUrl = `${protocol}//${user.organization?.subdomain}.${baseDomain}${port}`;

    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome back!</CardTitle>
            <CardDescription>
              You're signed in as {user.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => window.location.href = orgUrl}
              className="w-full"
            >
              Go to {user.organization?.name}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If user exists but no org, show org creation
  if (user && 'email' in user && !user.organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Create Your Organization</CardTitle>
            <CardDescription>
              Choose a name and subdomain for your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              
              // Client-side validation
              const validationError = validateSubdomain(subdomain);
              if (validationError) {
                setError(validationError);
                return;
              }
              
              setIsLoading(true);
              try {
                const result = await createOrg({ 
                  userId: session!.user!.id!,
                  name: orgName, 
                  subdomain 
                });
                
                // Redirect to org subdomain
                const protocol = window.location.protocol;
                const port = window.location.port ? `:${window.location.port}` : "";
                
                const currentHostname = window.location.hostname;
                const parts = currentHostname.split('.');

                let baseDomain;
                if (parts.length >= 2) {
                  baseDomain = parts.slice(-2).join('.');
                } else {
                  baseDomain = currentHostname;
                }
                
                const newUrl = `${protocol}//${result.subdomain}.${baseDomain}${port}`;
                window.location.href = newUrl;
              } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Failed to create organization");
                setIsLoading(false);
              }
            }}>
              <div className="space-y-4">
                <div>
                  <Input
                    placeholder="Organization Name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Input
                    placeholder="Subdomain (e.g., my-company)"
                    value={subdomain}
                    onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    pattern="[a-z0-9-]{3,32}"
                    required
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your organization will be accessible at {subdomain || "subdomain"}.oscar-chat.com
                  </p>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Create Organization"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sign in - show workspace-specific branding if workspace parameter exists
  const pageTitle = workspace ? `Sign in to ${workspace}` : "Sign In to Oscar Chat";
  const pageDescription = workspace 
    ? `Access your ${workspace} workspace` 
    : "Manage your AI coding assistant conversations";

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{pageTitle}</CardTitle>
          <CardDescription>
            {pageDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              setIsLoading(true);
              const callbackUrl = workspace 
                ? `/signin?workspace=${workspace}`
                : '/signin';
              signIn("google", { callbackUrl });
            }}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Continue with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignInContent />
    </Suspense>
  );
}