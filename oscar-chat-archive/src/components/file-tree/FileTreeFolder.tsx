"use client";

import { useState, useRef, useEffect } from "react";
import { Doc } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { FolderNode, getAllFilesInFolder } from "@/utils/folderUtils";
import { FileTreeItem } from "./FileTreeItem";
import { EmptyFolderState } from "../chat/EmptyFolderState";
import { ChevronRight, ChevronDown, FolderClosed, FolderOpen, GitBranch, Globe, Lock } from "lucide-react";
import { useTabContext } from "@/contexts/TabContext";
import { useFileCreation } from "@/hooks/useFileCreation";

interface FileTreeFolderProps {
  folder: FolderNode;
  level: number;
  selection: ReturnType<typeof import("@/hooks/useFileSelection").useFileSelection>;
  fileOps: ReturnType<typeof import("@/hooks/useFileOperations").useFileOperations>;
  folderExpansion: ReturnType<typeof import("@/hooks/useFolderExpansion").useFolderExpansion>;
  navigation: ReturnType<typeof import("@/hooks/useFileNavigation").useFileNavigation>;
  onContextMenu: (e: React.MouseEvent, fileId: string, isFolder?: boolean) => void;
  onDelete: (fileId: string, name: string) => void;
  onCreateFile?: () => void;
  onCreateBlog?: () => void;
}

export function FileTreeFolder({
  folder,
  level,
  selection,
  fileOps,
  folderExpansion,
  navigation,
  onContextMenu,
  onDelete,
  onCreateFile,
  onCreateBlog
}: FileTreeFolderProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [showFilePlaceholder, setShowFilePlaceholder] = useState(false);
  const [showBlogPlaceholder, setShowBlogPlaceholder] = useState(false);
  const [placeholderValue, setPlaceholderValue] = useState("");
  const placeholderInputRef = useRef<HTMLInputElement>(null);
  
  const { activeTabId, openTabs } = useTabContext();
  const { createFile } = useFileCreation();
  
  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const currentFileId = activeTab?.fileId || null;
  
  const isExpanded = folder.isExpanded;
  const isEmpty = folder.files.length === 0 && folder.children.size === 0;
  
  const handleFolderClick = () => {
    if (!folder.isGitRepo) {
      folderExpansion.toggleFolder(folder.path);
    }
  };
  
  const handleFolderSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      selection.toggleFolderSelection(folder.path);
    } else if (e.shiftKey) {
      // Handle shift selection for folders if needed
    } else {
      selection.selectFolder(folder.path);
    }
  };
  
  const handleFileSelect = (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      selection.toggleFileSelection(fileId);
    } else if (e.shiftKey && selection.lastSelectedId) {
      selection.selectRange(selection.lastSelectedId, fileId);
    } else {
      selection.selectFile(fileId);
    }
  };
  
  const handleFolderContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const allFiles = getAllFilesInFolder(folder);
    if (allFiles.length > 0) {
      selection.selectMultipleFiles(allFiles.map(f => f._id));
      onContextMenu(e, allFiles[0]._id, true);
    }
  };
  
  const handlePlaceholderSubmit = async (isChat: boolean) => {
    const trimmedValue = placeholderValue.trim();
    if (!trimmedValue) return;
    
    try {
      const fullPath = folder.isVisibilityContainer 
        ? trimmedValue 
        : `${folder.path.replace('__public__/', '').replace('__private__/', '')}/${trimmedValue}`;
      
      await createFile({
        name: fullPath,
        navigate: true,
        skipNormalization: true,
        fileType: isChat ? 'chat' : 'blog'
      });
      
      setShowFilePlaceholder(false);
      setShowBlogPlaceholder(false);
      setPlaceholderValue("");
    } catch (error) {
      console.error("Failed to create file:", error);
    }
  };
  
  useEffect(() => {
    if ((showFilePlaceholder || showBlogPlaceholder) && placeholderInputRef.current) {
      const extension = showFilePlaceholder ? ".chat" : ".blog";
      setPlaceholderValue(extension);
      placeholderInputRef.current.focus();
      setTimeout(() => {
        if (placeholderInputRef.current) {
          placeholderInputRef.current.setSelectionRange(0, 0);
        }
      }, 0);
    }
  }, [showFilePlaceholder, showBlogPlaceholder]);
  
  useEffect(() => {
    if (folder.isVisibilityContainer && folder.visibility === "private") {
      if (onCreateFile && !showFilePlaceholder) {
        setShowFilePlaceholder(true);
        onCreateFile();
      }
      if (onCreateBlog && !showBlogPlaceholder) {
        setShowBlogPlaceholder(true);
        onCreateBlog();
      }
    }
  }, [onCreateFile, onCreateBlog, folder.isVisibilityContainer, folder.visibility]);

  useEffect(() => {
    const handleStartRename = (event: CustomEvent) => {
      const { fileId } = event.detail;
      const fileInFolder = folder.files.find(f => f._id === fileId);
      if (fileInFolder) {
        setRenamingId(fileId);
      }
    };

    document.addEventListener('startFileRename', handleStartRename as EventListener);
    return () => {
      document.removeEventListener('startFileRename', handleStartRename as EventListener);
    };
  }, [folder.files]);
  
  const getFolderIcon = () => {
    let icon;
    if (folder.isGitRepo) {
      icon = <GitBranch className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />;
    } else if (folder.isVisibilityContainer) {
      icon = folder.visibility === "public" 
        ? <Globe className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
        : <Lock className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />;
    } else {
      icon = isExpanded 
        ? <FolderOpen className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />
        : <FolderClosed className="h-3 w-3" style={{ color: 'var(--text-secondary)' }} />;
    }
    return <div className="w-3 h-3 flex items-center justify-center">{icon}</div>;
  };
  
  return (
    <>
      <div
        className={cn(
          "flex items-center px-2 py-0.5 cursor-pointer select-none group",
          "hover:bg-muted/50 transition-colors",
          selection.isFolderSelected(folder.path) && "bg-muted"
        )}
        style={{ 
          paddingLeft: `${(level * 12) + 8}px`,
          backgroundColor: selection.isFolderSelected(folder.path) ? 'var(--interactive-selected)' : 'transparent'
        }}
        onClick={folder.isGitRepo ? undefined : handleFolderClick}
        onContextMenu={handleFolderContextMenu}
      >
        {!folder.isGitRepo && !folder.isVisibilityContainer ? (
          <div className="w-3 h-3 flex items-center justify-center">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" style={{ opacity: 0.6 }} />
            ) : (
              <ChevronRight className="h-3 w-3" style={{ opacity: 0.6 }} />
            )}
          </div>
        ) : (
          getFolderIcon()
        )}
        <span 
          className="ml-1.5 text-xs font-medium font-mono"
          style={{ color: 'var(--text-secondary)' }}
        >
          {folder.name}
        </span>
      </div>
      
      {isExpanded && (
        <>
          {showFilePlaceholder && (
            <div
              className="flex items-center px-2 py-0.5"
              style={{ paddingLeft: `${((level + 1) * 12) + 8}px` }}
            >
              <input
                ref={placeholderInputRef}
                type="text"
                value={placeholderValue}
                onChange={(e) => setPlaceholderValue(e.target.value)}
                onBlur={() => {
                  setShowFilePlaceholder(false);
                  setPlaceholderValue("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handlePlaceholderSubmit(true);
                  } else if (e.key === "Escape") {
                    setShowFilePlaceholder(false);
                    setPlaceholderValue("");
                  }
                }}
                className="ml-4 flex-1 bg-transparent border-none outline-none text-xs font-mono"
                style={{ 
                  color: 'var(--text-primary)',
                  caretColor: 'var(--text-primary)'
                }}
                placeholder="Enter file name..."
              />
            </div>
          )}
          
          {showBlogPlaceholder && (
            <div
              className="flex items-center px-2 py-0.5"
              style={{ paddingLeft: `${((level + 1) * 12) + 8}px` }}
            >
              <input
                ref={placeholderInputRef}
                type="text"
                value={placeholderValue}
                onChange={(e) => setPlaceholderValue(e.target.value)}
                onBlur={() => {
                  setShowBlogPlaceholder(false);
                  setPlaceholderValue("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handlePlaceholderSubmit(false);
                  } else if (e.key === "Escape") {
                    setShowBlogPlaceholder(false);
                    setPlaceholderValue("");
                  }
                }}
                className="ml-4 flex-1 bg-transparent border-none outline-none text-xs font-mono"
                style={{ 
                  color: 'var(--text-primary)',
                  caretColor: 'var(--text-primary)'
                }}
                placeholder="Enter blog name..."
              />
            </div>
          )}
          
          {folder.files.map(file => (
            <FileTreeItem
              key={file._id}
              file={file}
              level={level + 1}
              isSelected={selection.isFileSelected(file._id)}
              isRenaming={renamingId === file._id}
              currentFileId={currentFileId}
              files={folder.files}
              onSelect={handleFileSelect}
              onOpen={navigation.openFile}
              onContextMenu={onContextMenu}
              onStartRename={setRenamingId}
              onRename={fileOps.renameFile}
              onCancelRename={() => setRenamingId(null)}
            />
          ))}
          
          {Array.from(folder.children.values()).map(childFolder => (
            <FileTreeFolder
              key={childFolder.path}
              folder={childFolder}
              level={level + 1}
              selection={selection}
              fileOps={fileOps}
              folderExpansion={folderExpansion}
              navigation={navigation}
              onContextMenu={onContextMenu}
              onDelete={onDelete}
            />
          ))}
          
          {isEmpty && folder.isVisibilityContainer && (
            <EmptyFolderState
              folderName={folder.name}
              level={level + 1}
            />
          )}
        </>
      )}
    </>
  );
}