"use client";

import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useQuery } from "convex/react";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../../convex/_generated/api";
import { InlineLoading, CenteredLoading } from "@/components/ui/loading";

function SignInContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const workspace = searchParams.get("workspace");
  
  const user = useQuery(api.users.currentUser, session?.user?.id ? { userId: session.user.id } : "skip");
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
                  You don&apos;t have access to the &quot;{workspace}&quot; workspace.
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
              You&apos;re signed in as {user.email}
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

  // If user exists but no org, redirect to create-organization page
  if (user && 'email' in user && !user.organizationId) {
    router.push('/create-organization');
    return null;
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
              const callbackUrl = workspace ? `/?workspace=${workspace}` : '/';
              signIn("google", { callbackUrl });
            }}
            className="w-full"
            disabled={isLoading}
          >
            <InlineLoading 
              text="Continue with Google"
              loadingText="Signing in..."
              isLoading={isLoading}
            />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<CenteredLoading title="Loading..." className="min-h-screen" />}>
      <SignInContent />
    </Suspense>
  );
}