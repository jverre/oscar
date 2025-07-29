"use client";

import React from 'react';
import { useQuery } from 'convex/react';
import { useFileContext } from '@/components/providers/FileProvider';
import { PluginBuilder } from '@/components/plugins/PluginBuilder';
import { UserFileViewer } from '@/components/plugins/UserFileViewer';
import { QueryLoading } from '@/components/ui/loading';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';

export const ContentRenderer = () => {
  const { getActiveTab } = useFileContext();
  const activeTab = getActiveTab();

  // Single query pattern for all content - determine by file.type, not tab type
  const file = useQuery(
    api.files.getFileByPath,
    activeTab ? { path: activeTab.path } : "skip"
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