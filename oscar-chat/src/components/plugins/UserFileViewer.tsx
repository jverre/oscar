"use client";

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { PluginHost } from './PluginHost';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useTenant } from '@/components/providers/TenantProvider';
import { useFileMessages } from '@/hooks/useFileMessages';

interface UserFileViewerProps {
  fileId: string;
}

export const UserFileViewer = ({ fileId }: UserFileViewerProps) => {
  const { data: session } = useSession();
  const { organizationId, isAuthenticated } = useTenant();
  const createSandbox = useMutation(api.sandboxes.createSandboxForFile);
  
  // Initialize file messages hook
  const fileMessages = useFileMessages(
    fileId as Id<"files">, 
    organizationId as Id<"organizations">
  );

  // Get the file
  const file = useQuery(api.files.getFileById, {
    fileId: fileId as Id<"files">,
  });

  // Try to get sandbox - include isPublicAccess parameter
  const sandbox = useQuery(
    api.sandboxes.getSandboxForFile,
    organizationId ? {
      fileId: fileId as Id<"files">,
      organizationId: organizationId,
      isPublicAccess: !isAuthenticated
    } : "skip"
  );
  let status: string = 'creating';
  
  if (sandbox) {
    status = sandbox.status;
  }

  useEffect(() => {
    if (sandbox === undefined || !organizationId) return; // Still loading
    if (!sandbox && organizationId) {
      // No sandbox exists, trigger creation
      void createSandbox({ 
        fileId: fileId as Id<"files">,
        organizationId: organizationId,
        isPublicAccess: !isAuthenticated
      });
    }
  }, [sandbox, createSandbox, fileId, organizationId, isAuthenticated]);

  const handlePluginMessage = (message: any) => {
    console.log('Plugin message:', message);
  };

  const handleSaveMessage = async (messageData: any) => {
    // Only save messages if user is authenticated
    if (!isAuthenticated || !organizationId) {
      console.log('Skipping message save - user not authenticated or no organization');
      return;
    }

    try {
      await fileMessages.createMessage(messageData);
      console.log('Message saved successfully:', messageData);
    } catch (error) {
      console.error('Failed to save message:', error);
      throw error; // Re-throw so PluginHost can handle the error
    }
  };

  const handleUpdateMessage = async (messageId: string, messageData: any) => {
    // Only update messages if user is authenticated
    if (!isAuthenticated || !organizationId) {
      console.log('Skipping message update - user not authenticated or no organization');
      return;
    }

    try {
      await fileMessages.updateMessage(messageId as Id<"fileMessages">, messageData);
      console.log('Message updated successfully:', messageId, messageData);
    } catch (error) {
      console.error('Failed to update message:', error);
      throw error; // Re-throw so PluginHost can handle the error
    }
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-orange-500">
          <AlertCircle className="h-5 w-5" />
          <div className="text-center">
            <div className="font-medium">File Not Found</div>
            <div className="text-sm text-muted-foreground mt-1">
              The requested file could not be found
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !file.isPublic) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-orange-500">
          <AlertCircle className="h-5 w-5" />
          <div className="text-center">
            <div className="font-medium">Authentication Required</div>
            <div className="text-sm text-muted-foreground mt-1">
              This file is private and requires authentication to view
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'creating') {
    return (
      <div className={`h-full w-full bg-background border border-border rounded-lg flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Creating sandbox...</p>
          <p className="text-xs text-muted-foreground mt-1">{file.path}</p>
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
          pluginId={fileId}
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
    <div className={`h-full w-full bg-background border border-border rounded-lg flex items-center justify-center`}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading sandbox...</p>
      </div>
    </div>
  );
};