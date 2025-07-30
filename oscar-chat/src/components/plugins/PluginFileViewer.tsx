"use client";

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { PluginHost } from './PluginHost';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

interface PluginFileViewerProps {
  pluginId: string;
  filePath: string;
  fileName: string;
  organizationId: string;
}

export const PluginFileViewer = ({ pluginId, fileName, organizationId }: Omit<PluginFileViewerProps, 'filePath'>) => {
  const { data: session } = useSession();
  const createSandbox = useMutation(api.sandboxes.createSandboxForFile);

  // Get the file by path
  const file = useQuery(api.files.getFileByPath, {
    path: pluginId,
  });

  const fileId = file?._id;
  const isAuthenticated = !!session?.user?.id;

  const sandbox = useQuery(
    api.sandboxes.getSandboxForFile,
    fileId ? {
      fileId: fileId as Id<"files">,
      organizationId: organizationId as Id<"organizations">,
      isPublicAccess: !isAuthenticated
    } : "skip"
  );
  let status: string = 'creating';
  
  if (sandbox) {
    status = sandbox.status;
  }

  useEffect(() => {
    if (sandbox === undefined || fileId === null) return; // Still loading
    if (!sandbox && fileId) {
      // No sandbox exists, trigger creation
      void createSandbox({ 
        fileId: fileId as Id<"files">,
        organizationId: organizationId as Id<"organizations">,
        isPublicAccess: !isAuthenticated
      });
    }
  }, [sandbox, createSandbox, fileId, organizationId, isAuthenticated]);

  const handlePluginMessage = (message: unknown) => {
    // Handle plugin events/messages - could be used for plugin-specific logic
    console.debug('Plugin message received:', message);
  };

  const handleSaveMessage = async (messageData: unknown) => {
    // Plugin files don't persist messages to the database
    // They handle their own message storage or rely on ephemeral state
    console.debug('Plugin save message (not persisted):', messageData);
    
    // Return success to prevent PluginHost from showing errors
    return Promise.resolve();
  };

  const handleUpdateMessage = async (messageId: string, messageData: unknown) => {
    // Plugin files don't persist message updates to the database
    // They handle their own message storage or rely on ephemeral state
    console.debug('Plugin update message (not persisted):', messageId, messageData);
    
    // Return success to prevent PluginHost from showing errors
    return Promise.resolve();
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-orange-500">
          <AlertCircle className="h-5 w-5" />
          <div className="text-center">
            <div className="font-medium">File Not Found</div>
            <div className="text-sm text-muted-foreground mt-1">
              The requested plugin file could not be found
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
          <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
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