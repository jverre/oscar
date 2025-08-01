import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { PluginHost } from './PluginHost';
import { api } from '../../../convex/_generated/api';
import { useTenant } from '@/components/providers/TenantProvider';
import { CenteredLoading } from '@/components/ui/loading';
import { useFileMessages } from '@/hooks/useFileMessages';
import { Id } from '../../../convex/_generated/dataModel';

interface SandboxIframeProps {
  pluginId: string;
}

export function SandboxIframe({ pluginId }: SandboxIframeProps) {
  const { organizationId, isAuthenticated } = useTenant();
  const createSandbox = useMutation(api.sandboxes.createSandboxForFile);

  const file = useQuery(api.files.getFileByPath, {
    path: `${pluginId}`,
  });

  const fileId = file?._id;

  const refreshSandbox = useMutation(api.sandboxes.refreshSandbox);
  const [retryCount, setRetryCount] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  let status: string = 'creating';
  const sandbox = useQuery(
    api.sandboxes.getSandboxForFile, 
    fileId && organizationId ? {
      fileId: fileId as Id<"files">,
      organizationId: organizationId
    } : "skip"
  );

  if (sandbox) {
    status = sandbox.status;
  }
  

  useEffect(() => {
    if (sandbox === undefined || !fileId || !organizationId) return; // Still loading
    if (!sandbox) {
      // No sandbox exists, trigger creation
      void createSandbox({ 
        fileId: fileId as Id<"files">,
        organizationId: organizationId
      });
    }
  }, [sandbox, createSandbox, fileId, organizationId]);

  // Auto-retry logic for failed sandboxes
  useEffect(() => {
    if (sandbox?.status === 'error' && retryCount < 3 && !isRetrying) {
      const retryDelay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
      
      setIsRetrying(true);
      const timeout = setTimeout(async () => {
        if (fileId && organizationId) {
          try {
            await refreshSandbox({
              fileId: fileId as Id<"files">,
              organizationId: organizationId
            });
            setRetryCount(prev => prev + 1);
          } catch (error) {
            console.error("Retry failed:", error);
          }
        }
        setIsRetrying(false);
      }, retryDelay);

      return () => clearTimeout(timeout);
    }
  }, [sandbox?.status, retryCount, isRetrying, refreshSandbox, fileId, organizationId]);

  // Reset retry count when sandbox becomes active
  useEffect(() => {
    if (sandbox?.status === 'active') {
      setRetryCount(0);
      setIsRetrying(false);
    }
  }, [sandbox?.status]);

  // Set up silent refresh timer when sandbox is active
  useEffect(() => {
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    // Only set timer if sandbox is active and has expiration time
    if (sandbox?.status === 'active' && sandbox?.expiresAt) {
      const now = Date.now();
      const expiresAt = sandbox.expiresAt;
      const timeUntilExpiry = expiresAt - now;
      
      // Check if sandbox is already expired
      if (timeUntilExpiry < 0) {
        // Sandbox has expired, refresh immediately
        if (fileId && organizationId) {
          refreshSandbox({
            fileId: fileId as Id<"files">,
            organizationId: organizationId
          }).catch(error => {
            console.error('Failed to refresh expired sandbox:', error);
          });
        }
        return;
      }
      
      // Refresh 2 minutes before expiry (58 minutes after creation)
      const refreshTime = timeUntilExpiry - (2 * 60 * 1000);
      
      if (refreshTime > 0) {
        
        refreshTimerRef.current = setTimeout(async () => {
          if (fileId && organizationId) {
            try {
              await refreshSandbox({
                fileId: fileId as Id<"files">,
                organizationId: organizationId
              });
            } catch (error) {
              console.error('Failed to refresh sandbox:', error);
            }
          }
        }, refreshTime);
      } else {
        // Less than 2 minutes until expiry, refresh immediately
        if (fileId && organizationId) {
          refreshSandbox({
            fileId: fileId as Id<"files">,
            organizationId: organizationId
          }).catch(error => {
            console.error('Failed to refresh sandbox near expiry:', error);
          });
        }
      }
    }

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [sandbox?.status, sandbox?.expiresAt, fileId, organizationId, refreshSandbox]);

  // Initialize file messages hook for sandbox message persistence
  const fileMessages = useFileMessages(
    fileId as Id<"files">, 
    organizationId as Id<"organizations">
  );

  const handlePluginMessage = (message: unknown) => {
    // Handle plugin events/messages - could be used for sandbox communication
    console.debug('Sandbox plugin message received:', message);
  };

  const handleSaveMessage = async (messageData: unknown) => {
    // Save messages for authenticated users only
    if (!isAuthenticated || !organizationId) {
      console.debug('Sandbox save message (unauthenticated - not persisted):', messageData);
      return Promise.resolve();
    }

    try {
      await fileMessages.createMessage(messageData);
    } catch (error) {
      console.error('Failed to save sandbox message:', error);
      throw error; // Re-throw so PluginHost can handle the error
    }
  };

  const handleUpdateMessage = async (messageId: string, messageData: unknown) => {
    // Update messages for authenticated users only
    if (!isAuthenticated || !organizationId) {
      console.debug('Sandbox update message (unauthenticated - not persisted):', messageId, messageData);
      return Promise.resolve();
    }

    try {
      await fileMessages.updateMessage(messageId as Id<"fileMessages">, messageData);
    } catch (error) {
      console.error('Failed to update sandbox message:', error);
      throw error; // Re-throw so PluginHost can handle the error
    }
  };


  if (status === 'creating') {
    return (
      <div className={`h-full w-full bg-background border border-border rounded-lg`}>
        <CenteredLoading 
          title="Creating sandbox..."
          description={`${pluginId} - ${fileId}`}
          className="h-full"
        />
      </div>
    );
  }

  if (status === 'error') {
    if (isRetrying) {
      return (
        <div className={`h-full w-full bg-background border border-border rounded-lg`}>
          <CenteredLoading 
            title="Retrying sandbox creation..."
            description={`Attempt ${retryCount + 1}/3`}
            className="h-full"
          />
        </div>
      );
    }

    return (
      <div className={`h-full w-full bg-background border border-border rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-1">
            Failed to create sandbox
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground mb-3">
              Auto-retry failed {retryCount}/3 times
            </p>
          )}
          <Button
            onClick={() => {
              if (fileId && organizationId) {
                setRetryCount(0); // Reset retry count for manual retry
                refreshSandbox({
                  fileId: fileId as Id<"files">,
                  organizationId: organizationId
                });
              }
            }}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'active' && sandbox?.sandboxUrl) {
    return (
      <div className={`h-full w-full bg-background border border-border overflow-hidden`}>
        <PluginHost 
          url={sandbox.sandboxUrl}
          pluginId={pluginId}
          fileId={fileId}
          fileMessages={fileMessages.message ? [fileMessages.message.message] : []}
          onMessage={handlePluginMessage}
          onSaveMessage={handleSaveMessage}
          onUpdateMessage={handleUpdateMessage}
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className={`h-full w-full bg-background border border-border`}>
      <CenteredLoading 
        title="Loading sandbox..."
        className="h-full"
      />
    </div>
  );
} 