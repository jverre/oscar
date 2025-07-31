"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, FileText, Folder, Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useFileContext } from "@/components/providers/FileProvider";

interface PluginFileListProps {
  pluginId: string;
  organizationId: Id<"organizations">;
}

export const PluginFileList = ({ pluginId, organizationId }: PluginFileListProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<string>("");
  const [files, setFiles] = useState<string[]>([]);
  const getPluginFiles = useAction(api.plugins.getPluginFiles);
  const { openContent } = useFileContext();

  useEffect(() => {
    const loadFiles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await getPluginFiles({
          pluginId: pluginId as any,
          organizationId,
        });
        
        if (!result.success) {
          setError(result.error || "Failed to load files");
        } else {
          setFileTree(result.output || "");
          setFiles(result.files || []);
        }
      } catch (err) {
        console.error("Failed to load plugin files:", err);
        setError("Failed to load plugin files");
      } finally {
        setIsLoading(false);
      }
    };

    loadFiles();
  }, [pluginId, organizationId, getPluginFiles]);

  if (isLoading) {
    return (
      <div className="flex items-center h-6 text-sm select-none text-foreground/50" style={{ paddingLeft: `${2 * 12 + 4}px` }}>
        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
        <span className="text-xs">Loading files...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center h-6 text-sm select-none text-orange-500" style={{ paddingLeft: `${2 * 12 + 4}px` }}>
        <AlertCircle className="h-3 w-3 mr-2" />
        <span className="text-xs">{error}</span>
      </div>
    );
  }

  // Parse and render the file tree
  const lines = fileTree.split('\n').filter(line => line.trim());
  
  const handleFileClick = (fileName: string) => {
    // Find the actual file path from the files array
    const matchingFile = files.find(file => {
      const fileParts = file.split('/');
      return fileParts[fileParts.length - 1] === fileName;
    });
    
    if (matchingFile) {
      // Remove the /plugin/ prefix for the file ID and add pluginSource: prefix
      const cleanPath = matchingFile.replace('/plugin/', '');
      const fileId = `pluginSource:${pluginId}/${cleanPath}`;
      openContent(fileId, fileName);
    }
  };
  
  return (
    <div className="text-xs">
      {lines.slice(1).map((line, index) => {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine === "(empty directory)") {
          return null;
        }

        const indentLevel = (line.length - line.trimStart().length) / 2;
        const isDirectory = trimmedLine.endsWith('/');
        const isMoreFiles = trimmedLine.startsWith('...');
        
        return (
          <div
            key={index}
            className={`flex items-center h-5 text-sm select-none text-foreground/70 ${!isDirectory && !isMoreFiles ? 'hover:bg-sidebar-accent-hover cursor-pointer' : ''}`}
            style={{ paddingLeft: `${(2 + indentLevel) * 12 + 4}px` }}
            onClick={() => {
              if (!isDirectory && !isMoreFiles) {
                handleFileClick(trimmedLine);
              }
            }}
          >
            {!isMoreFiles && (
              <>
                {isDirectory ? (
                  <Folder className="h-3 w-3 mr-1.5 text-foreground/50" />
                ) : (
                  <FileText className="h-3 w-3 mr-1.5 text-foreground/50" />
                )}
              </>
            )}
            <span className="text-xs truncate">
              {isDirectory ? trimmedLine.slice(0, -1) : trimmedLine}
            </span>
          </div>
        );
      })}
    </div>
  );
};