"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const user = useQuery(api.users.current);
  const userOrg = useQuery(api.organizations.getCurrentUserOrg);
  const router = useRouter();

  useEffect(() => {
    // If user is authenticated and we have their org with subdomain, redirect to their subdomain
    if (user && userOrg && userOrg.subdomain) {
      // Redirect to their subdomain
      const protocol = window.location.protocol;
      const host = window.location.host;
      
      if (host.includes('localhost')) {
        // For development, redirect to subdomain.localhost:port
        const port = window.location.port ? `:${window.location.port}` : '';
        window.location.href = `${protocol}//${userOrg.subdomain}.localhost${port}/`;
      } else {
        // For production, redirect to subdomain.domain.com
        const baseDomain = host.replace(/^[^.]+\./, ''); // Remove any existing subdomain
        window.location.href = `${protocol}//${userOrg.subdomain}.${baseDomain}/`;
      }
    }
  }, [user, userOrg, router]);

  // Show loading while checking authentication
  if (user === undefined) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--text-accent)' }}></div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </main>
    );
  }

  // This page only shows for unauthenticated users
  return (
    <main className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Welcome to Oscar Chat</h1>
          <p className="text-muted-foreground">
            An IDE-inspired chat application powered by AI
          </p>
          <p className="text-sm text-muted-foreground">
            Sign in to start chatting with OpenAI, Anthropic, and Google Gemini
          </p>
        </div>
      </div>
    </main>
  );
}