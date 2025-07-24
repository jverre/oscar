"use client";

import React, { useEffect, useState } from "react";
import { useAction } from "convex/react";
import { useSession } from "next-auth/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, FileText, Folder } from "lucide-react";

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
  const { data: session } = useSession();
  const [files, setFiles] = useState<PluginFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listPluginFiles = useAction(api.plugins.listPluginFiles);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!session?.user?.id) {
        console.log("[PLUGIN_FILE_LIST] No user session");
        return;
      }

      console.log("[PLUGIN_FILE_LIST] Fetching files for plugin:", pluginId);
      setLoading(true);
      setError(null);

      try {
        const result = await listPluginFiles({
          pluginId: pluginId as Id<"plugins">,
          organizationId,
          userId: session.user.id as Id<"users">,
        });

        console.log("[PLUGIN_FILE_LIST] Result:", result);

        if (result.success && result.files) {
          setFiles(result.files);
          console.log("[PLUGIN_FILE_LIST] Files loaded:", result.files.length);
        } else {
          setError(result.error || "Failed to load files");
          console.error("[PLUGIN_FILE_LIST] Error:", result.error);
        }
      } catch (err) {
        console.error("[PLUGIN_FILE_LIST] Exception:", err);
        setError("Failed to load plugin files");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [pluginId, organizationId, session?.user?.id, listPluginFiles]);

  const handleFileClick = (file: PluginFile) => {
    if (!file.isDirectory) {
      console.log("[PLUGIN_FILE_LIST] File clicked:", file);
      onFileClick(pluginId, file.name, file.path);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center h-6 text-sm select-none text-foreground/70" style={{ paddingLeft: `${2 * 12 + 4}px` }}>
        <Loader2 className="h-3 w-3 animate-spin mr-2" />
        <span className="text-xs text-muted-foreground">Loading files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center h-6 text-sm select-none text-red-500" style={{ paddingLeft: `${2 * 12 + 4}px` }}>
        <span className="text-xs">Error: {error}</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center h-6 text-sm select-none text-foreground/70" style={{ paddingLeft: `${2 * 12 + 4}px` }}>
        <span className="text-xs text-muted-foreground">No files found</span>
      </div>
    );
  }

  return (
    <div>
      {files.map((file, index) => (
        <div
          key={index}
          className={`flex items-center h-6 text-sm select-none group transition-colors duration-150 text-foreground/70 ${
            !file.isDirectory ? "cursor-pointer hover:bg-sidebar-accent-hover" : "cursor-default"
          }`}
          style={{ paddingLeft: `${2 * 12 + 4}px` }}
          onClick={() => handleFileClick(file)}
        >
          <div className="flex items-center flex-1">
            <div className="flex items-center justify-center w-4 h-4 mr-1 flex-shrink-0">
              {file.isDirectory ? (
                <Folder className="h-3 w-3 text-foreground/50" />
              ) : (
                <FileText className="h-3 w-3 text-foreground/50" />
              )}
            </div>
            
            <span className="truncate text-xs leading-none">
              {file.path}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};