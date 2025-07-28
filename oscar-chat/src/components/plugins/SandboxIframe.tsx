import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { useFileMessages } from '@/hooks/useFileMessages';
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
    if (sandbox === undefined || fileId === null || !currentUser?.organization?._id) return; // Still loading
    if (!sandbox) {
      // No sandbox exists, trigger creation
      void createSandbox({ 
        fileId: fileId as Id<"files">,
        organizationId: currentUser.organization._id
      });
    }
  }, [sandbox, createSandbox, fileId, currentUser?.organization?._id])

  // const {
  //   messages,
  //   createMessage,
  //   updateMessage,
  //   serializeMessage
  // } = useFileMessages(
  //   messageFileId as Id<"files"> | undefined, 
  //   organizationId as Id<"organizations"> | undefined
  // );

  const handlePluginMessage = (message: any) => {
    console.log('Plugin message:', message);
    // Handle plugin events here if needed
  };

  const handleSaveMessage = async (messageData: any) => {
    console.log('Saving message:', messageData);
    // await createMessage(messageData);
  };

  const handleUpdateMessage = async (messageId: string, messageData: any) => {
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
    return (
      <div className={`h-full w-full bg-background border border-border rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Failed to create sandbox
          </p>
          <Button
            onClick={() => window.location.reload()}
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
      <div className={`h-full w-full bg-background border border-border rounded-lg overflow-hidden`}>
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
    <div className={`h-full w-full bg-background border border-border rounded-lg flex items-center justify-center`}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading sandbox...</p>
      </div>
    </div>
  );
} 