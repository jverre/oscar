"use client";

import React from 'react';
import { useQuery } from 'convex/react';
import { useFileContext } from '@/components/providers/FileProvider';
import { PluginBuilder } from '@/components/plugins/PluginBuilder';
import { UserFileViewer } from '@/components/plugins/UserFileViewer';
import { PluginSourceFileViewer } from '@/components/plugins/PluginSourceFileViewer';
import { QueryLoading } from '@/components/ui/loading';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useTenant } from '@/components/providers/TenantProvider';

export const ContentRenderer = () => {
  const { getActiveTab } = useFileContext();
  const { organizationId, isAuthenticated } = useTenant();
  const activeTab = getActiveTab();

  // Check if this is a plugin source file (virtual files from sandboxes)
  const isPluginSourceFile = activeTab?.path.startsWith('pluginSource:') ?? false;
  
  // Single query pattern for regular files - skip if it's a plugin source file
  const file = useQuery(
    api.files.getFileByPath,
    activeTab && !isPluginSourceFile ? { path: activeTab.path } : "skip"
  );

  if (!activeTab) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No content selected</h2>
          <p className="text-muted-foreground">Select a file or plugin to view its content</p>
        </div>
      </div>
    );
  }

  // Handle plugin source files directly (these don't exist in the database)
  if (isPluginSourceFile) {
    // Remove the pluginSource: prefix and parse the path
    const pathWithoutPrefix = activeTab.path.replace('pluginSource:', '');
    const pathParts = pathWithoutPrefix.split('/');
    const pluginId = pathParts[0];
    const filePath = '/' + pathParts.slice(1).join('/');
    
    if (!organizationId || !isAuthenticated) {
      return (
        <div className="p-6 h-full flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">Please log in to view plugin files</p>
          </div>
        </div>
      );
    }

    return (
      <PluginSourceFileViewer 
        pluginId={pluginId}
        filePath={filePath}
        organizationId={organizationId}
      />
    );
  }

  return (
    <QueryLoading
      data={file}
      loadingTitle="Loading..."
      loadingDescription="Loading content..."
      className="p-6 h-full"
      error={
        <div className="p-6 h-full flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Content not found</h2>
            <p className="text-muted-foreground mb-2">Path: {activeTab.path}</p>
            <p className="text-muted-foreground">
              This content may not exist or may have been deleted
            </p>
          </div>
        </div>
      }
    >
      {file?.type === 'plugin' ? (
        <PluginBuilder fileId={file._id as Id<"files">} />
      ) : file?.type === 'user' ? (
        <UserFileViewer fileId={file._id} />
      ) : file?.type === 'folder' ? (
        <div className="p-6 h-full flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Folder</h2>
            <p className="text-muted-foreground">This is a folder. Select a file to view its content.</p>
          </div>
        </div>
      ) : (
        <div className="p-6 h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Content</h2>
            <p className="text-muted-foreground mb-2">File: {activeTab.title}</p>
            <p className="text-muted-foreground">Content would be displayed here</p>
          </div>
        </div>
      )}
    </QueryLoading>
  );
}; 