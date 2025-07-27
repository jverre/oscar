"use client";

import React from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { AlertCircle } from "lucide-react";

interface PluginFile {
  name: string;
  path: string;
  isDirectory: boolean;
}

interface PluginFileListProps {
  pluginId: string;
  organizationId: Id<"organizations">;
  onFileClick: (pluginId: string, fileName: string, filePath: string) => void;
}

export const PluginFileList = ({ pluginId, organizationId, onFileClick }: PluginFileListProps) => {
  return (
    <div className="flex items-center h-6 text-sm select-none text-orange-500" style={{ paddingLeft: `${2 * 12 + 4}px` }}>
      <AlertCircle className="h-3 w-3 mr-2" />
      <span className="text-xs">File browsing not yet implemented</span>
    </div>
  );
};