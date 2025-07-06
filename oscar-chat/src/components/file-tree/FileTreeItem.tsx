"use client";

import { useState, useRef, useEffect } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { getFileDisplayName } from "@/utils/folderUtils";
import { validateFileName, areFileNamesDuplicate } from "@/utils/fileNameUtils";
import { File, Hash, GitBranch, Globe, Lock, Bot, Terminal } from "lucide-react";

interface FileTreeItemProps {
  file: Doc<"files">;
  level: number;
  isSelected: boolean;
  isRenaming: boolean;
  currentFileId: string | null;
  files: Doc<"files">[];
  onSelect: (fileId: string, event: React.MouseEvent) => void;
  onOpen: (file: Doc<"files">) => void;
  onContextMenu: (e: React.MouseEvent, fileId: string) => void;
  onStartRename: (fileId: string) => void;
  onRename: (fileId: Id<"files">, newName: string) => Promise<{ success: boolean; error?: unknown }>;
  onCancelRename: () => void;
}

export function FileTreeItem({
  file,
  level,
  isSelected,
  isRenaming,
  currentFileId,
  files,
  onSelect,
  onOpen,
  onContextMenu,
  onStartRename,
  onRename,
  onCancelRename
}: FileTreeItemProps) {
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  
  const displayName = getFileDisplayName(file);
  const isActive = currentFileId === file._id;
  
  const getFileIcon = () => {
    let icon;
    if (file.name.endsWith('.chat')) {
      icon = <Hash className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />;
    } else if (file.name.endsWith('.claude')) {
      icon = <Bot className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />;
    } else if (file.name.endsWith('.claude_session')) {
      icon = <Terminal className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />;
    } else if (file.name.endsWith('.blog')) {
      icon = <File className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />;
    } else if (file.name.endsWith('.git')) {
      icon = <GitBranch className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />;
    } else {
      icon = <File className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />;
    }
    return <div className="w-3 h-3 flex items-center justify-center">{icon}</div>;
  };
  
  const getVisibilityIcon = () => {
    if (file.visibility === "public") {
      return <Globe className="h-2.5 w-2.5" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />;
    }
    return <Lock className="h-2.5 w-2.5" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />;
  };
  
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      setRenameValue(displayName);
      renameInputRef.current.focus();
      
      const nameWithoutExtension = displayName.lastIndexOf('.') > 0 
        ? displayName.substring(0, displayName.lastIndexOf('.'))
        : displayName;
      
      renameInputRef.current.setSelectionRange(0, nameWithoutExtension.length);
    }
  }, [isRenaming, displayName]);
  
  const handleRenameSubmit = async () => {
    const trimmedValue = renameValue.trim();
    
    if (!trimmedValue) {
      setRenameError("File name cannot be empty");
      return;
    }
    
    const validation = validateFileName(trimmedValue);
    if (validation) {
      setRenameError(validation);
      return;
    }
    
    const folderPath = file.name.includes('/') 
      ? file.name.substring(0, file.name.lastIndexOf('/') + 1)
      : '';
    const newFullName = folderPath + trimmedValue;
    
    const otherFiles = files.filter(f => f._id !== file._id);
    const isDuplicate = otherFiles.some(f => areFileNamesDuplicate(f.name, newFullName));
    if (isDuplicate) {
      setRenameError("A file with this name already exists");
      return;
    }
    
    try {
      await onRename(file._id, newFullName);
      onCancelRename();
    } catch (error) {
      console.error("Failed to rename file:", error);
      setRenameError("Failed to rename file");
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      onCancelRename();
    }
  };
  
  if (isRenaming) {
    return (
      <div
        className="flex items-center px-2 py-0.5"
        style={{ paddingLeft: `${(level * 12) + 8}px` }}
      >
        {getFileIcon()}
        <input
          ref={renameInputRef}
          type="text"
          value={renameValue}
          onChange={(e) => {
            setRenameValue(e.target.value);
            setRenameError(null);
          }}
          onBlur={handleRenameSubmit}
          onKeyDown={handleKeyDown}
          className={cn(
            "ml-1.5 flex-1 bg-transparent border-none outline-none text-xs",
            renameError && "text-red-500"
          )}
          style={{ 
            color: renameError ? 'var(--error)' : 'var(--text-primary)',
            caretColor: 'var(--text-primary)'
          }}
        />
        <div className="ml-1">
          {getVisibilityIcon()}
        </div>
      </div>
    );
  }
  
  return (
    <div
      className={cn(
        "flex items-center px-2 py-0.5 cursor-pointer select-none group",
        "hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted",
        isActive && "bg-accent text-accent-foreground"
      )}
      style={{ 
        paddingLeft: `${(level * 12) + 8}px`,
        backgroundColor: isActive ? 'var(--interactive-active)' : (isSelected ? 'var(--interactive-selected)' : 'transparent')
      }}
      onClick={(e) => {
        onSelect(file._id, e);
        onOpen(file);
      }}
      onContextMenu={(e) => onContextMenu(e, file._id)}
    >
      {getFileIcon()}
      <span 
        className="ml-1.5 text-xs truncate flex-1 font-mono"
        style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        title={displayName}
      >
        {displayName}
      </span>
      <div className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {getVisibilityIcon()}
      </div>
    </div>
  );
}