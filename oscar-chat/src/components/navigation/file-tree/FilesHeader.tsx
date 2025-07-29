import React from "react";
import { FilePlus, FolderPlus } from "lucide-react";
import { FilesHeaderProps } from "./types";

export const FilesHeader = ({ 
  onCreateFile,
  onCreateFolder 
}: Omit<FilesHeaderProps, 'organizationId'>) => {
  return (
    <div className="group flex items-center justify-between h-8 px-2 text-sm font-medium text-foreground/80 border-b border-sidebar-border mb-2">
      <span className="text-xs uppercase tracking-wide">Files</span>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onCreateFile}
          className="p-1 hover:bg-sidebar-accent-hover rounded-sm transition-colors"
          title="New File"
        >
          <FilePlus className="h-4 w-4" />
        </button>
        <button
          onClick={onCreateFolder}
          className="p-1 hover:bg-sidebar-accent-hover rounded-sm transition-colors"
          title="New Folder"
        >
          <FolderPlus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}; 