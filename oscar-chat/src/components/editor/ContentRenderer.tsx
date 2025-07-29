"use client";

import React from 'react';
import { useFileContext } from '@/components/providers/FileProvider';
import { PluginBuilder } from '@/components/plugins/PluginBuilder';
import { UserFileViewer } from '@/components/plugins/UserFileViewer';
import { Id } from '../../../convex/_generated/dataModel';

export const ContentRenderer = () => {
  const { getActiveTab } = useFileContext();
  const activeTab = getActiveTab();

  if (!activeTab) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">No file or plugin selected</h2>
          <p className="text-muted-foreground">Select a file or plugin to view its content</p>
        </div>
      </div>
    );
  }

  if (activeTab.type === 'plugin') {
    return (
      <PluginBuilder
        fileId={activeTab.id as Id<"files">}
      />
    );
  }

  if (activeTab.type === 'user') {
    return (
      <UserFileViewer
        fileId={activeTab.id}
      />
    );
  }

  // Fallback for unknown file types
  return (
    <div className="p-6 h-full">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">File Content</h2>
        <p className="text-muted-foreground mb-2">File: {activeTab.title}</p>
        <p className="text-muted-foreground">File content would be displayed here</p>
      </div>
    </div>
  );
}; 