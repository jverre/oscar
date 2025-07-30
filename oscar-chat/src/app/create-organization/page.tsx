"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "../../../convex/_generated/api";
import { InlineLoading } from "@/components/ui/loading";
import { Check, X, AlertCircle } from "lucide-react";

export default function CreateOrganizationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orgName, setOrgName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [subdomainTouched, setSubdomainTouched] = useState(false);

  const user = useQuery(api.users.currentUser, 
    session?.user?.id ? { userId: session.user.id } : "skip"
  );
  
  const createOrg = useMutation(api.auth.createOrganization);
  
  // Check subdomain availability
  const subdomainCheck = useQuery(api.auth.checkSubdomainAvailability, 
    subdomain.length >= 3 ? { subdomain } : "skip"
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  // Redirect if user already has an organization
  useEffect(() => {
    if (user && "organizationId" in user && user.organizationId && user.organization?.subdomain) {
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
      const workspaceUrl = `${protocol}//${user.organization.subdomain}.${baseDomain}${port}`;
      
      window.location.href = workspaceUrl;
    }
  }, [user]);

  const handleSubdomainChange = (value: string) => {
    // Auto-format: lowercase, remove spaces and special chars except hyphens
    const formatted = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(formatted);
    if (!subdomainTouched && value.length > 0) {
      setSubdomainTouched(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!subdomainCheck?.available) {
      setError(subdomainCheck?.reason || "Subdomain is not available");
      return;
    }
    
    setIsCreating(true);
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
      setIsCreating(false);
    }
  };

  const getSubdomainStatus = () => {
    if (!subdomainTouched || subdomain.length === 0) return null;
    if (subdomain.length < 3) {
      return { icon: <AlertCircle className="h-4 w-4" />, color: "text-amber-600", message: "Too short (min 3 characters)" };
    }
    if (subdomainCheck === undefined) {
      return { icon: <AlertCircle className="h-4 w-4 animate-pulse" />, color: "text-muted-foreground", message: "Checking..." };
    }
    if (subdomainCheck.available) {
      return { icon: <Check className="h-4 w-4" />, color: "text-green-600", message: "Available" };
    }
    return { icon: <X className="h-4 w-4" />, color: "text-red-600", message: subdomainCheck.reason };
  };

  const subdomainStatus = getSubdomainStatus();
  const isFormValid = orgName.trim().length > 0 && subdomain.length >= 3 && subdomainCheck?.available;

  // Show loading while checking auth status
  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <InlineLoading text="Loading..." loadingText="Loading..." isLoading={true} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Your Organization</CardTitle>
          <CardDescription>
            Set up your workspace to start using Oscar Chat
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                placeholder="My Company"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                disabled={isCreating}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                This is your organization&apos;s display name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subdomain">Workspace URL</Label>
              <div className="relative">
                <Input
                  id="subdomain"
                  placeholder="my-company"
                  value={subdomain}
                  onChange={(e) => handleSubdomainChange(e.target.value)}
                  pattern="[a-z0-9-]{3,32}"
                  required
                  disabled={isCreating}
                  className={subdomainStatus ? "pr-10" : ""}
                />
                {subdomainStatus && (
                  <div className={`absolute right-3 top-2.5 ${subdomainStatus.color}`}>
                    {subdomainStatus.icon}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Your workspace will be accessible at:
                </p>
                <p className="text-xs font-mono">
                  {subdomain || "my-company"}.getoscar.ai
                </p>
                {subdomainStatus && (
                  <p className={`text-xs ${subdomainStatus.color}`}>
                    {subdomainStatus.message}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isCreating || !isFormValid}
            >
              <InlineLoading 
                text="Create Organization"
                loadingText="Creating..."
                isLoading={isCreating}
              />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}