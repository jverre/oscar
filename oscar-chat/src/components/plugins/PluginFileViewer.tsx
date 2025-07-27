"use client";

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface PluginFileViewerProps {
  pluginId: string;
  filePath: string;
  fileName: string;
  organizationId: string;
}

export const PluginFileViewer = ({ pluginId, filePath, fileName, organizationId }: PluginFileViewerProps) => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-3 text-orange-500">
        <AlertCircle className="h-5 w-5" />
        <div className="text-center">
          <div className="font-medium">Plugin File Viewer Not Available</div>
          <div className="text-sm text-muted-foreground mt-1">
            File browsing for plugins is not yet implemented
          </div>
        </div>
      </div>
    </div>
  );
};