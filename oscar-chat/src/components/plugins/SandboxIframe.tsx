import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { PluginHost } from './PluginHost';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface SandboxIframeProps {
  pluginId: string;
}

export function SandboxIframe({ pluginId }: SandboxIframeProps) {
  const { data: session } = useSession();
  const createSandbox = useMutation(api.sandboxes.createSandboxForFile);

  // Get current user and organization information
  const currentUser = useQuery(
    api.users.currentUser, 
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  const file = useQuery(api.files.getFileByPath, {
    path: `${pluginId}`,
  });

  const fileId = file?._id;
  console.log("fileId", fileId);

  const refreshSandbox = useMutation(api.sandboxes.refreshSandbox);
  const [retryCount, setRetryCount] = React.useState(0);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  let status: string = 'creating';
  const sandbox = useQuery(
    api.sandboxes.getSandboxForFile, 
    fileId && currentUser?.organization?._id ? {
      fileId: fileId as Id<"files">,
      organizationId: currentUser.organization._id
    } : "skip"
  );

  if (sandbox) {
    status = sandbox.status;
  }
  console.log("sandbox", sandbox);
  

  useEffect(() => {
    if (sandbox === undefined || !fileId || !currentUser?.organization?._id) return; // Still loading
    if (!sandbox) {
      // No sandbox exists, trigger creation
      void createSandbox({ 
        fileId: fileId as Id<"files">,
        organizationId: currentUser.organization._id
      });
    }
  }, [sandbox, createSandbox, fileId, currentUser?.organization?._id]);

  // Auto-retry logic for failed sandboxes
  useEffect(() => {
    if (sandbox?.status === 'error' && retryCount < 3 && !isRetrying) {
      const retryDelay = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
      console.log(`Sandbox failed, auto-retrying in ${retryDelay}ms (attempt ${retryCount + 1}/3)`);
      
      setIsRetrying(true);
      const timeout = setTimeout(async () => {
        if (fileId && currentUser?.organization?._id) {
          try {
            await refreshSandbox({
              fileId: fileId as Id<"files">,
              organizationId: currentUser.organization._id
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
  }, [sandbox?.status, retryCount, isRetrying, refreshSandbox, fileId, currentUser?.organization?._id]);

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
      
      // Refresh 2 minutes before expiry (58 minutes after creation)
      const refreshTime = timeUntilExpiry - (2 * 60 * 1000);
      
      if (refreshTime > 0) {
        console.log(`Setting refresh timer for ${refreshTime / 1000 / 60} minutes from now`);
        
        refreshTimerRef.current = setTimeout(async () => {
          console.log('Silently refreshing sandbox before expiration');
          if (fileId && currentUser?.organization?._id) {
            try {
              await refreshSandbox({
                fileId: fileId as Id<"files">,
                organizationId: currentUser.organization._id
              });
              console.log('Sandbox refreshed successfully');
            } catch (error) {
              console.error('Failed to refresh sandbox:', error);
            }
          }
        }, refreshTime);
      }
    }

    // Cleanup timer on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [sandbox?.status, sandbox?.expiresAt, fileId, currentUser?.organization?._id, refreshSandbox]);

  // const {
  //   messages,
  //   createMessage,
  //   updateMessage,
  //   serializeMessage
  // } = useFileMessages(
  //   messageFileId as Id<"files"> | undefined, 
  //   organizationId as Id<"organizations"> | undefined
  // );

  const handlePluginMessage = (message: unknown) => {
    console.log('Plugin message:', message);
    // Handle plugin events here if needed
  };

  const handleSaveMessage = async (messageData: unknown) => {
    console.log('Saving message:', messageData);
    // await createMessage(messageData);
  };

  const handleUpdateMessage = async (messageId: string, messageData: unknown) => {
    console.log('Updating message:', messageId, messageData);
    // await updateMessage(messageId as Id<"fileMessages">, messageData);
  };

  // Convert messages to ArrayBuffer format for PluginHost
  // const fileMessages = messages?.map((msg: any) => msg.message) ?? [];

  if (status === 'creating') {
    return (
      <div className={`h-full w-full bg-background border border-border rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Creating sandbox...</p>
          <p className="text-sm text-muted-foreground">{pluginId} - {fileId}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    if (isRetrying) {
      return (
        <div className={`h-full w-full bg-background border border-border rounded-lg flex items-center justify-center`}>
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-1">
              Retrying sandbox creation...
            </p>
            <p className="text-xs text-muted-foreground">
              Attempt {retryCount + 1}/3
            </p>
          </div>
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
              if (fileId && currentUser?.organization?._id) {
                setRetryCount(0); // Reset retry count for manual retry
                refreshSandbox({
                  fileId: fileId as Id<"files">,
                  organizationId: currentUser.organization._id
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
          // fileId={messageFileId}
          // fileMessages={fileMessages}
          onMessage={handlePluginMessage}
          onSaveMessage={handleSaveMessage}
          onUpdateMessage={handleUpdateMessage}
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className={`h-full w-full bg-background border border-border flex items-center justify-center`}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading sandbox...</p>
      </div>
    </div>
  );
} 