import { useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface SandboxState {
  status: 'idle' | 'creating' | 'active' | 'error';
  url: string | null;
  error: string | null;
}

export function useSandbox(pluginId: string | undefined) {
  const { data: session } = useSession();
  const [sandboxState, setSandboxState] = useState<SandboxState>({
    status: 'idle',
    url: null,
    error: null,
  });

  // Get current user and organization
  const currentUser = useQuery(
    api.users.currentUser,
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  // Get existing sandbox
  const existingSandbox = useQuery(
    api.sandboxes.getSandboxForPlugin,
    currentUser?.organization && pluginId
      ? {
          pluginId: pluginId as Id<"plugins">,
          organizationId: currentUser.organization._id,
        }
      : "skip"
  );

  // Update state when existing sandbox changes
  useEffect(() => {
    if (existingSandbox) {
      if (existingSandbox.status === 'active' && existingSandbox.sandboxUrl) {
        setSandboxState({
          status: 'active',
          url: existingSandbox.sandboxUrl,
          error: null,
        });
      } else if (existingSandbox.status === 'error') {
        setSandboxState({
          status: 'error',
          url: null,
          error: 'Sandbox creation failed',
        });
      } else if (existingSandbox.status === 'creating') {
        setSandboxState({
          status: 'creating',
          url: null,
          error: null,
        });
      }
    } else if (pluginId) {
      // No sandbox exists for this plugin
      setSandboxState({
        status: 'idle',
        url: null,
        error: null,
      });
    }
  }, [existingSandbox, pluginId]);

  return sandboxState;
} 