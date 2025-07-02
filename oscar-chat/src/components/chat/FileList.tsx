"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTabContext } from "@/contexts/TabContext";
import { useFileCreation } from "@/hooks/useFileCreation";
import { FileContextMenu } from "./FileContextMenu";
import { DeleteFileDialog } from "./DeleteFileDialog";
import { FolderNode, buildFolderStructure, isGitRepo } from "@/utils/folderUtils";
import { FolderItem } from "./FolderItem";
import { VisibilityFolderItem } from "./VisibilityFolderItem";
import { GitRepoItem } from "./GitRepoItem";
import { FileItem } from "./FileItem";
import { EmptyFolderState } from "./EmptyFolderState";
import { buildFileUrl } from "@/utils/fileUrlUtils";
import { validateFileName, areFileNamesDuplicate } from "@/utils/fileNameUtils";

interface FileListProps {
  files: Doc<"files">[] | undefined;
  shouldCreateFile: boolean;
  onFileCreated: () => void;
  shouldCreateBlog?: boolean;
  onBlogCreated?: () => void;
}

interface ContextMenuState {
  fileId: string;
  x: number;
  y: number;
  isMultipleSelected: boolean;
  isFolder?: boolean;
}

interface DeleteDialogState {
  fileId?: string;
  name?: string;
  selectedIds?: Set<string>;
  count?: number;
}

export function FileList({ 
  files,
  shouldCreateFile,
  onFileCreated,
  shouldCreateBlog = false,
  onBlogCreated = () => {}
}: FileListProps) {
  const { addTab, closeTab, closeTabs, getTabByFile, isTabOpenByFile, switchToTab, updateTabTitle, activeTabId, openTabs } = useTabContext();
  const router = useRouter();
  const { createFile, error: createFileError } = useFileCreation();
  
  // Get user's organization and team for URL generation
  const userOrg = useQuery(api.organizations.getCurrentUserOrg);
  const userTeam = useQuery(api.teams.getCurrentUserTeam);
  
  // Get the current file ID from the active tab
  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const currentFileId = activeTab?.fileId || null;
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  
  // Folder state
  const [folderStructure, setFolderStructure] = useState<FolderNode | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  

  // Placeholder input state
  const [placeholderValue, setPlaceholderValue] = useState("");
  const placeholderInputRef = useRef<HTMLInputElement>(null);
  
  // Blog placeholder input state
  const [blogPlaceholderValue, setBlogPlaceholderValue] = useState("");
  const blogPlaceholderInputRef = useRef<HTMLInputElement>(null);
  
  // Rename validation state
  const [renameError, setRenameError] = useState<string | null>(null);

  const updateName = useMutation(api.files.updateName);
  const updateVisibility = useMutation(api.files.updateVisibility);
  const deleteFileMutation = useMutation(api.files.remove);
  const regenerateTitleMutation = useMutation(api.files.regenerateTitle);

  // Build folder structure when files change
  useEffect(() => {
    if (files) {
      const structure = buildFolderStructure(files);
      
      // Restore expansion state from localStorage
      const savedExpansionState = localStorage.getItem('folderExpansionState');
      if (savedExpansionState) {
        try {
          const expansionState: Record<string, boolean> = JSON.parse(savedExpansionState);
          const applyExpansionState = (node: FolderNode): FolderNode => {
            const newChildren = new Map();
            node.children.forEach((child, key) => {
              const restoredChild = applyExpansionState(child);
              if (expansionState[restoredChild.path] !== undefined) {
                restoredChild.isExpanded = expansionState[restoredChild.path];
              }
              newChildren.set(key, restoredChild);
            });
            return { ...node, children: newChildren };
          };
          
          setFolderStructure(applyExpansionState(structure));
        } catch (error) {
          console.error('Failed to restore folder expansion state:', error);
          setFolderStructure(structure);
        }
      } else {
        setFolderStructure(structure);
      }
    }
  }, [files]);


  const handleFileClick = (fileId: string, event?: React.MouseEvent) => {
    if (event) {
      const isCtrlOrCmd = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;
      
      // If modifier keys are pressed, handle selection instead of navigation
      if (isCtrlOrCmd || isShift) {
        event.preventDefault();
        // Clear folder selection when selecting individual files
        setSelectedFolders(new Set());
        toggleSelection(fileId, isShift, isCtrlOrCmd);
        return;
      }
    }
    
    // Normal navigation - set as selected and open tab
    setSelectedIds(new Set([fileId]));
    setLastSelectedId(fileId);
    setSelectedFolders(new Set());
    const file = files?.find(f => f._id === fileId);
    if (file) {
      const fileIdTyped = fileId as Id<"files">;
      
      // Check if tab already exists for this file
      if (isTabOpenByFile(fileIdTyped)) {
        // Switch to existing tab instead of creating new one
        const existingTab = getTabByFile(fileIdTyped);
        if (existingTab) {
          switchToTab(existingTab.id);
        }
      } else {
        // Create new tab only if none exists
        const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        addTab({
          id: newTabId,
          fileId: fileIdTyped,
          title: file.name
        });

        // Generate new URL format: /{org}/{team}/{filename}
        if (userOrg && userTeam) {
          router.push(buildFileUrl(file, userOrg, userTeam));
        } else {
          // If org/team not loaded yet, do nothing or show loading state
          console.log("Org/team data not loaded yet");
        }
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, fileId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're right-clicking on a selected item and there are multiple selections
    const isMultipleSelected = selectedIds.has(fileId) && selectedIds.size > 1;
    
    // If showing bulk menu and current active file isn't selected, add it to selection
    if (isMultipleSelected && currentFileId && !selectedIds.has(currentFileId)) {
      const currentFileInThisList = files?.some(f => f._id === currentFileId);
      if (currentFileInThisList) {
        setSelectedIds(prev => new Set([...prev, currentFileId]));
      }
    }
    
    setContextMenu({ 
      fileId, 
      x: e.clientX, 
      y: e.clientY, 
      isMultipleSelected 
    });
  };

  const handleRename = (file: Doc<"files">) => {
    setRenamingId(file._id);
    setRenameValue(file.name);
    setRenameError(null);
    setContextMenu(null);
  };

  const handleRenameSubmit = async (fileId: string) => {
    const trimmedName = renameValue.trim();
    
    if (!trimmedName) {
      setRenameError("File name cannot be empty");
      return;
    }
    
    // Validate the file name
    const validationError = validateFileName(trimmedName);
    if (validationError) {
      setRenameError(validationError);
      return;
    }
    
    // Check for duplicates (excluding the current file)
    const currentFile = files?.find(f => f._id === fileId);
    if (currentFile && files) {
      const otherFiles = files.filter(f => f._id !== fileId);
      const isDuplicate = otherFiles.some(f => areFileNamesDuplicate(f.name, trimmedName));
      
      if (isDuplicate) {
        setRenameError(`A file named "${trimmedName}" already exists. Please choose a different name.`);
        return;
      }
    }
    
    try {
      await updateName({
        fileId: fileId as Id<"files">,
        name: trimmedName,
      });
      
      // Update tab title if file has an open tab
      updateTabTitle(fileId as Id<"files">, trimmedName);
      
      // Clear states on successful rename
      setRenamingId(null);
      setRenameValue("");
      setRenameError(null);
    } catch (error) {
      console.error("Failed to rename file:", error);
      
      // Extract error message for user display
      const errorMessage = error instanceof Error ? error.message : "Failed to rename file";
      setRenameError(errorMessage);
    }
  };

  const handleDelete = (fileId: string) => {
    const file = files?.find(f => f._id === fileId);
    if (file) {
      setDeleteDialog({
        fileId,
        name: file.name
      });
    }
  };

  const handleRegenerateTitle = async (fileId: string) => {
    try {
      const result = await regenerateTitleMutation({ fileId: fileId as Id<"files"> });
      if (result.success) {
        console.log("Title regeneration started");
      }
    } catch (error) {
      console.error("Failed to regenerate title:", error);
      // Could add a toast notification here in the future
    }
    setContextMenu(null);
  };

  const handleFolderDelete = (folderPath: string) => {
    if (!folderStructure) return;
    
    // Find the Git repository folder node
    const findFolderNode = (node: FolderNode, targetPath: string): FolderNode | null => {
      if (node.path === targetPath && node.isGitRepo && node.gitRepoFile) {
        return node;
      }
      
      for (const child of node.children.values()) {
        const found = findFolderNode(child, targetPath);
        if (found) return found;
      }
      
      return null;
    };
    
    const gitFolder = findFolderNode(folderStructure, folderPath);
    if (gitFolder && gitFolder.gitRepoFile) {
      setDeleteDialog({
        fileId: gitFolder.gitRepoFile._id,
        name: gitFolder.name
      });
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size > 0) {
      setDeleteDialog({
        selectedIds: new Set(selectedIds),
        count: selectedIds.size
      });
    }
  };

  const handleOpenAll = () => {
    if (selectedIds.size > 0) {
      // Get all selected files and open them as tabs
      const selectedFiles = files?.filter(f => 
        selectedIds.has(f._id)
      ) || [];
      
      // Open each file as a tab (only if not already open)
      selectedFiles.forEach(file => {
        const fileIdTyped = file._id as Id<"files">;
        
        // Check if tab already exists for this file
        if (isTabOpenByFile(fileIdTyped)) {
          // Switch to existing tab instead of creating new one
          const existingTab = getTabByFile(fileIdTyped);
          if (existingTab) {
            switchToTab(existingTab.id);
          }
        } else {
          // Create new tab only if none exists
          const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          addTab({
            id: newTabId,
            fileId: fileIdTyped,
            title: file.name
          });
        }
      });
      
      // Clear selection after opening all tabs
      clearSelection();
      setContextMenu(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteDialog) return;
    
    try {
      if (deleteDialog.selectedIds) {
        // Bulk deletion - atomic operation
        const fileIdsToDelete = Array.from(deleteDialog.selectedIds);
        
        // Delete all files in parallel
        const deletePromises = fileIdsToDelete.map(id =>
          deleteFileMutation({
            fileId: id as Id<"files">,
          })
        );
        await Promise.all(deletePromises);
        
        // Find all tabs that need to be closed in bulk
        const tabIdsToClose: string[] = [];
        fileIdsToDelete.forEach(fileId => {
          const tab = getTabByFile(fileId as Id<"files">);
          if (tab) {
            tabIdsToClose.push(tab.id);
          }
        });
        
        // Close all tabs in one atomic operation
        if (tabIdsToClose.length > 0) {
          closeTabs(tabIdsToClose);
        }
        
        // If we deleted the current file but it didn't have a tab, redirect
        const isCurrentlyActive = currentFileId && deleteDialog.selectedIds.has(currentFileId);
        if (isCurrentlyActive && !getTabByFile(currentFileId)) {
          const remainingTabs = openTabs.filter(tab => 
            !tab.fileId || !deleteDialog.selectedIds!.has(tab.fileId)
          );
          
          if (remainingTabs.length > 0) {
            const remainingTab = remainingTabs[0];
            if (remainingTab.fileId) {
              const file = files?.find(f => f._id === remainingTab.fileId);
              if (file && userOrg && userTeam) {
                router.push(buildFileUrl(file, userOrg, userTeam));
              } else {
                // Go to home if file not found or org/team not loaded
                router.push('/');
              }
            } else if (userOrg && userTeam) {
              router.push(`/${encodeURIComponent(userOrg.name)}/${encodeURIComponent(userTeam.name)}/`);
            } else {
              router.push('/');
            }
          } else if (userOrg && userTeam) {
            router.push(`/${encodeURIComponent(userOrg.name)}/${encodeURIComponent(userTeam.name)}/`);
          } else {
            router.push(`/chat`);
          }
        }
        
        // Clear selection after successful bulk delete
        clearSelection();
      } else if (deleteDialog.fileId) {
        // Single deletion
        const deletedFileId = deleteDialog.fileId as Id<"files">;
        
        await deleteFileMutation({
          fileId: deletedFileId,
        });
        
        // Check if we're deleting the currently active file
        const isCurrentlyActive = currentFileId === deletedFileId;
        
        // Close the tab for the deleted file
        const tab = getTabByFile(deletedFileId);
        if (tab) {
          closeTab(tab.id);
        } else if (isCurrentlyActive) {
          // If no tab exists but this is the current file, redirect to remaining tabs or home
          if (openTabs.length > 0) {
            const remainingTab = openTabs[0];
            if (remainingTab.fileId) {
              const file = files?.find(f => f._id === remainingTab.fileId);
              if (file && userOrg && userTeam) {
                router.push(buildFileUrl(file, userOrg, userTeam));
              } else {
                // Go to home if file not found or org/team not loaded
                router.push('/');
              }
            } else if (userOrg && userTeam) {
              router.push(`/${encodeURIComponent(userOrg.name)}/${encodeURIComponent(userTeam.name)}/`);
            } else {
              router.push('/');
            }
          } else if (userOrg && userTeam) {
            router.push(`/${encodeURIComponent(userOrg.name)}/${encodeURIComponent(userTeam.name)}/`);
          } else {
            router.push(`/chat`);
          }
        }
      }
    } catch (error) {
      console.error("Failed to delete file(s):", error);
    }
    
    setDeleteDialog(null);
  };

  // Get files in their display order (as they appear in the UI)
  const getFilesInDisplayOrder = useCallback((): Doc<"files">[] => {
    if (!folderStructure) return files || [];
    
    const orderedFiles: Doc<"files">[] = [];
    
    const traverseFolder = (folder: FolderNode) => {
      // If folder is expanded (or root), add its files
      if (folder.isExpanded || !folder.name) {
        // Add files in this folder (skip Git repos as they're handled as folders)
        folder.files.forEach(file => {
          if (!isGitRepo(file.name)) {
            orderedFiles.push(file);
          }
        });
        
        // Traverse child folders recursively
        Array.from(folder.children.values()).forEach(childFolder => {
          traverseFolder(childFolder);
        });
      }
    };
    
    traverseFolder(folderStructure);
    return orderedFiles;
  }, [folderStructure, files]);

  // Selection helper functions
  const toggleSelection = (fileId: string, isShift: boolean, isCtrlOrCmd: boolean) => {
    if (isShift) {
      // Range selection - use lastSelectedId or currentFileId as start point
      let startId = lastSelectedId;
      
      // If no lastSelectedId but we have a current file, use that as the start
      if (!startId && currentFileId) {
        const displayOrderFiles = getFilesInDisplayOrder();
        const currentFileInThisList = displayOrderFiles.some(f => f._id === currentFileId);
        if (currentFileInThisList) {
          startId = currentFileId;
        }
      }
      
      if (startId) {
        const displayOrderFiles = getFilesInDisplayOrder();
        const startIndex = displayOrderFiles.findIndex(f => f._id === startId);
        const endIndex = displayOrderFiles.findIndex(f => f._id === fileId);
        
        if (startIndex !== -1 && endIndex !== -1) {
          const start = Math.min(startIndex, endIndex);
          const end = Math.max(startIndex, endIndex);
          const rangeIds = displayOrderFiles
            .slice(start, end + 1)
            .map(f => f._id);
          
          setSelectedIds(prev => {
            const newSet = new Set(prev);
            rangeIds.forEach(id => newSet.add(id));
            return newSet;
          });
          
          // Update lastSelectedId to the clicked item for future range selections
          setLastSelectedId(fileId);
        }
      }
    } else if (isCtrlOrCmd) {
      // Toggle individual selection
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        
        // If this is the first selection and current file exists, include it
        if (newSet.size === 0 && currentFileId && currentFileId !== fileId) {
          const displayOrderFiles = getFilesInDisplayOrder();
          const currentFileInThisList = displayOrderFiles.some(f => f._id === currentFileId);
          if (currentFileInThisList) {
            newSet.add(currentFileId);
          }
        }
        
        if (newSet.has(fileId)) {
          newSet.delete(fileId);
        } else {
          newSet.add(fileId);
        }
        return newSet;
      });
      setLastSelectedId(fileId);
    } else {
      // Single selection (clear others)
      setSelectedIds(new Set([fileId]));
      setLastSelectedId(fileId);
    }
  };

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setLastSelectedId(null);
    setSelectedFolders(new Set());
  }, []);

  // Folder interaction handlers
  const toggleFolderExpanded = (folderPath: string) => {
    if (!folderStructure) return;
    
    const updateFolderExpansion = (node: FolderNode, targetPath: string): FolderNode => {
      if (node.path === targetPath) {
        return { ...node, isExpanded: !node.isExpanded };
      }
      
      const newChildren = new Map();
      node.children.forEach((child, key) => {
        newChildren.set(key, updateFolderExpansion(child, targetPath));
      });
      
      return { ...node, children: newChildren };
    };
    
    const updatedStructure = updateFolderExpansion(folderStructure, folderPath);
    setFolderStructure(updatedStructure);
    
    // Save expansion state to localStorage
    const saveExpansionState = (node: FolderNode, state: Record<string, boolean> = {}): Record<string, boolean> => {
      if (node.path) {
        state[node.path] = node.isExpanded;
      }
      node.children.forEach(child => {
        saveExpansionState(child, state);
      });
      return state;
    };
    
    const expansionState = saveExpansionState(updatedStructure);
    localStorage.setItem('folderExpansionState', JSON.stringify(expansionState));
  };

  const handleFolderClick = (folderPath: string, event?: React.MouseEvent) => {
    if (!folderStructure) return;
    
    if (event) {
      const isCtrlOrCmd = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;
      
      if (isCtrlOrCmd || isShift) {
        event.preventDefault();
        toggleFolderSelection(folderPath, isShift, isCtrlOrCmd);
        return;
      }
    }
    
    // Normal click - toggle expansion and set folder as selected
    toggleFolderExpanded(folderPath);
    setSelectedIds(new Set());
    setSelectedFolders(new Set([folderPath]));
  };

  const toggleFolderSelection = (folderPath: string, isShift: boolean, isCtrlOrCmd: boolean) => {
    if (!folderStructure) return;
    
    if (isCtrlOrCmd) {
      setSelectedFolders(prev => {
        const newSet = new Set(prev);
        if (newSet.has(folderPath)) {
          newSet.delete(folderPath);
        } else {
          newSet.add(folderPath);
        }
        return newSet;
      });
    } else {
      setSelectedFolders(new Set([folderPath]));
    }
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // For now, treat folder context menu similar to file context menu
    // but with folder-specific actions
    setContextMenu({ 
      fileId: folderPath, // Use folderPath as identifier
      x: e.clientX, 
      y: e.clientY, 
      isMultipleSelected: false,
      isFolder: true
    });
  };

  // Handle drag and drop for visibility folders
  const handleVisibilityDrop = async (draggedFileIds: string[], targetVisibility: "public" | "private") => {
    try {
      // Update visibility for all dragged files
      for (const fileId of draggedFileIds) {
        await updateVisibility({ fileId: fileId as Id<"files">, visibility: targetVisibility });
      }
    } catch (error) {
      console.error("Failed to update file visibility:", error);
    }
  };

  const handleDragStart = (e: React.DragEvent, fileIds: string[]) => {
    e.dataTransfer.setData('application/json', JSON.stringify(fileIds));
    e.dataTransfer.effectAllowed = 'move';
  };

  // Render folder structure recursively like ConversationList
  const renderFolderStructure = (folder: FolderNode, level: number = 0): React.ReactNode[] => {
    const elements: React.ReactNode[] = [];

    // Render the folder itself if it's not the root
    if (folder.name) {
      if (folder.isVisibilityContainer) {
        // Render Public/Private folder with special styling and drag-drop
        elements.push(
          <VisibilityFolderItem
            key={folder.path}
            folder={folder}
            onToggleExpanded={toggleFolderExpanded}
            onFolderClick={handleFolderClick}
            onFolderContextMenu={handleFolderContextMenu}
            isSelected={selectedFolders.has(folder.path)}
            onDrop={handleVisibilityDrop}
          />
        );
      } else if (folder.isGitRepo) {
        // Render Git repository as special folder
        elements.push(
          <GitRepoItem
            key={folder.path}
            folder={folder}
            level={level}
            isSelected={selectedFolders.has(folder.path)}
            onToggleExpanded={toggleFolderExpanded}
            onFolderClick={handleFolderClick}
            onFolderContextMenu={handleFolderContextMenu}
            selectedFolders={selectedFolders}
          />
        );
      } else {
        // Render regular folder
        elements.push(
          <FolderItem
            key={folder.path}
            folder={folder}
            level={level}
            onToggleExpanded={toggleFolderExpanded}
            onFolderClick={handleFolderClick}
            onFolderContextMenu={handleFolderContextMenu}
            isSelected={selectedFolders.has(folder.path)}
          />
        );
      }
    }

    // If folder is expanded (or root), render its contents
    if (folder.isExpanded || !folder.name) {
      // Add placeholder inputs for new files in the Private folder
      if (folder.isVisibilityContainer && folder.visibility === "private") {
        // Placeholder file for creating new chat
        if (shouldCreateFile) {
          elements.push(
            <div key="placeholder-chat" className="relative">
              <div className="h-[22px] flex items-center" style={{ paddingLeft: `${20 + (level + 1) * 16}px` }}>
                <input
                  ref={placeholderInputRef}
                  type="text"
                  value={placeholderValue}
                  onChange={handlePlaceholderChange}
                  onBlur={handlePlaceholderBlur}
                  onKeyDown={handlePlaceholderKeyDown}
                  className={cn(
                    "w-full h-[20px] text-[13px] bg-sidebar text-sidebar-foreground focus:outline-none",
                    createFileError && "border border-red-500"
                  )}
                  style={{
                    boxShadow: createFileError 
                      ? 'inset 0 1px 0 0 var(--status-error), inset 0 -1px 0 0 var(--status-error)'
                      : 'inset 0 1px 0 0 var(--border-subtle), inset 0 -1px 0 0 var(--border-subtle)'
                  }}
                  placeholder="file-name.chat"
                />
              </div>
              {createFileError && (
                <div className="absolute z-10 px-2 py-1 text-xs text-white bg-red-600 rounded shadow-lg max-w-64 break-words" style={{ left: `${20 + (level + 1) * 16}px`, top: '24px' }}>
                  {createFileError}
                </div>
              )}
            </div>
          );
        }

        // Placeholder input for creating new blog
        if (shouldCreateBlog) {
          elements.push(
            <div key="placeholder-blog" className="relative">
              <div className="h-[22px] flex items-center" style={{ paddingLeft: `${20 + (level + 1) * 16}px` }}>
                <input
                  ref={blogPlaceholderInputRef}
                  type="text"
                  value={blogPlaceholderValue}
                  onChange={handleBlogPlaceholderChange}
                  onBlur={handleBlogPlaceholderBlur}
                  onKeyDown={handleBlogPlaceholderKeyDown}
                  className={cn(
                    "w-full h-[20px] text-[13px] bg-sidebar text-sidebar-foreground focus:outline-none",
                    createFileError && "border border-red-500"
                  )}
                  style={{
                    boxShadow: createFileError 
                      ? 'inset 0 1px 0 0 var(--status-error), inset 0 -1px 0 0 var(--status-error)'
                      : 'inset 0 1px 0 0 var(--border-subtle), inset 0 -1px 0 0 var(--border-subtle)'
                  }}
                  placeholder="blog-name.blog"
                />
              </div>
              {createFileError && (
                <div className="absolute z-10 px-2 py-1 text-xs text-white bg-red-600 rounded shadow-lg max-w-64 break-words" style={{ left: `${20 + (level + 1) * 16}px`, top: '24px' }}>
                  {createFileError}
                </div>
              )}
            </div>
          );
        }
      }

      // Render files in this folder (skip Git repos as they're handled as folders above)
      folder.files.forEach(file => {
        if (!isGitRepo(file.name)) {
          const isActive = currentFileId === file._id;
          const isSelected = selectedIds.has(file._id);
          const indentLevel = (folder.name ? level + 1 : level);

          elements.push(
            <div
              key={file._id}
              draggable={!renamingId}
              onDragStart={(e) => {
                if (isSelected && selectedIds.size > 1) {
                  // Drag all selected files
                  handleDragStart(e, Array.from(selectedIds));
                } else {
                  // Drag just this file
                  handleDragStart(e, [file._id]);
                }
              }}
            >
              <FileItem
                file={file}
                level={indentLevel}
                isActive={isActive}
                isSelected={isSelected}
                onFileClick={handleFileClick}
                onContextMenu={handleContextMenu}
                renamingId={renamingId}
                renameValue={renameValue}
                onRenameValueChange={setRenameValue}
                onRenameSubmit={handleRenameSubmit}
                onRenameCancel={() => {
                  setRenamingId(null);
                  setRenameValue("");
                  setRenameError(null);
                }}
                renameError={renameError}
                onRenameErrorChange={setRenameError}
                files={files}
              />
            </div>
          );
        }
      });

      // Show empty state for visibility containers with no content when expanded
      if (folder.isVisibilityContainer && folder.files.length === 0 && folder.children.size === 0 && folder.isExpanded) {
        elements.push(
          <EmptyFolderState
            key={`${folder.path}-empty`}
            folderName={folder.name}
            level={level + 1}
          />
        );
      }

      // Render child folders recursively
      Array.from(folder.children.values()).forEach(childFolder => {
        elements.push(...renderFolderStructure(childFolder, folder.name ? level + 1 : level));
      });
    }

    return elements;
  };



  // Keyboard and custom event handlers for clearing selection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (selectedIds.size > 0 || selectedFolders.size > 0)) {
        clearSelection();
      }
    };

    const handleClearSelection = () => {
      if (selectedIds.size > 0 || selectedFolders.size > 0) {
        clearSelection();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Check if click is outside the sidebar area
      const target = event.target as Element;
      const sidebar = target.closest('[data-sidebar]');
      if (!sidebar && (selectedIds.size > 0 || selectedFolders.size > 0)) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('clearFileSelection', handleClearSelection);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('clearFileSelection', handleClearSelection);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [selectedIds.size, selectedFolders.size, clearSelection]);

  // Handle placeholder input events
  const handlePlaceholderKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      try {
        const fileName = placeholderValue.trim();
        if (fileName) {
          await createFile({
            name: fileName,
            navigate: true,
            skipNormalization: true
          });
        }
      } catch (error) {
        console.error("Failed to create file:", error);
      }
      
      // Clear the placeholder and close it regardless of success
      setPlaceholderValue("");
      onFileCreated();
    } else if (e.key === "Escape") {
      setPlaceholderValue("");
      onFileCreated();
    }
  };

  const handlePlaceholderBlur = () => {
    setPlaceholderValue("");
    onFileCreated();
  };

  const handlePlaceholderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaceholderValue(e.target.value);
  };

  const handleBlogPlaceholderKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      try {
        const blogName = blogPlaceholderValue.trim();
        if (blogName) {
          await createFile({
            name: blogName,
            navigate: true,
            skipNormalization: true,
            fileType: 'blog'
          });
        }
      } catch (error) {
        console.error("Failed to create blog:", error);
      }
      
      // Clear the placeholder and close it regardless of success
      setBlogPlaceholderValue("");
      onBlogCreated();
    } else if (e.key === "Escape") {
      setBlogPlaceholderValue("");
      onBlogCreated();
    }
  };

  const handleBlogPlaceholderBlur = () => {
    setBlogPlaceholderValue("");
    onBlogCreated();
  };

  const handleBlogPlaceholderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBlogPlaceholderValue(e.target.value);
  };

  // Function to ensure Private folder is expanded
  const ensurePrivateFolderExpanded = () => {
    if (!folderStructure) return;
    
    // Find and expand the Private folder
    const privateFolderPath = "__private__";
    const findAndExpandPrivateFolder = (node: FolderNode): FolderNode => {
      if (node.path === privateFolderPath && node.isVisibilityContainer && node.visibility === "private") {
        return { ...node, isExpanded: true };
      }
      
      const newChildren = new Map();
      node.children.forEach((child, key) => {
        newChildren.set(key, findAndExpandPrivateFolder(child));
      });
      
      return { ...node, children: newChildren };
    };
    
    const updatedStructure = findAndExpandPrivateFolder(folderStructure);
    setFolderStructure(updatedStructure);
  };

  // Focus placeholder input when shouldCreateFile becomes true
  useEffect(() => {
    if (shouldCreateFile && placeholderInputRef.current) {
      // Ensure Private folder is expanded
      ensurePrivateFolderExpanded();
      
      // Initialize with .chat extension
      setPlaceholderValue(".chat");
      placeholderInputRef.current.focus();
      // Position cursor before the dot
      setTimeout(() => {
        if (placeholderInputRef.current) {
          placeholderInputRef.current.setSelectionRange(0, 0);
        }
      }, 0);
    }
  }, [shouldCreateFile]);

  // Clear placeholder text when shouldCreateFile becomes false
  useEffect(() => {
    if (!shouldCreateFile) {
      setPlaceholderValue("");
    }
  }, [shouldCreateFile]);

  // Focus blog placeholder input when shouldCreateBlog becomes true
  useEffect(() => {
    if (shouldCreateBlog && blogPlaceholderInputRef.current) {
      // Ensure Private folder is expanded
      ensurePrivateFolderExpanded();
      
      setBlogPlaceholderValue(".blog");
      blogPlaceholderInputRef.current.focus();
      // Position cursor before the dot
      setTimeout(() => {
        if (blogPlaceholderInputRef.current) {
          blogPlaceholderInputRef.current.setSelectionRange(0, 0);
        }
      }, 0);
    }
  }, [shouldCreateBlog]);

  // Clear blog placeholder text when shouldCreateBlog becomes false
  useEffect(() => {
    if (!shouldCreateBlog) {
      setBlogPlaceholderValue("");
    }
  }, [shouldCreateBlog]);


  if (!files) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        Loading files...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-0" data-sidebar>
        {/* Folder structure */}
        {folderStructure && renderFolderStructure(folderStructure)}
      </div>

      {contextMenu && (
        <FileContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onOpen={() => handleFileClick(contextMenu.fileId)}
          onRename={() => {
            const file = files?.find(f => f._id === contextMenu.fileId);
            if (file) handleRename(file);
          }}
          onDelete={() => {
            if (contextMenu.isMultipleSelected) {
              handleBulkDelete();
            } else if (contextMenu.isFolder) {
              handleFolderDelete(contextMenu.fileId);
            } else {
              handleDelete(contextMenu.fileId);
            }
          }}
          onRegenerateTitle={() => handleRegenerateTitle(contextMenu.fileId)}
          onOpenAll={handleOpenAll}
          isMultipleSelected={contextMenu.isMultipleSelected}
          isChatFile={(() => {
            const file = files?.find(f => f._id === contextMenu.fileId);
            return file?.name.endsWith('.chat') || false;
          })()}
        />
      )}

      <DeleteFileDialog
        isOpen={!!deleteDialog}
        fileName={deleteDialog?.name}
        fileCount={deleteDialog?.count}
        onClose={() => setDeleteDialog(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}