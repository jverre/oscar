"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { ConversationContextMenu } from "./ConversationContextMenu";
import { DeleteConversationDialog } from "./DeleteConversationDialog";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTabContext } from "@/contexts/TabContext";
import { FolderNode, buildFolderStructure, getAllConversationsInFolder, getConversationDisplayName } from "@/utils/folderUtils";
import { FolderItem } from "./FolderItem";
import { useChatCreation } from "@/hooks/useChatCreation";
import { CHAT_EXTENSION, getBaseName } from "@/utils/extensionUtils";

interface ConversationListProps {
  conversations: Doc<"conversations">[] | undefined;
  shouldCreateChat: boolean;
  onChatCreated: () => void;
}

interface ContextMenuState {
  conversationId: string;
  x: number;
  y: number;
  isMultipleSelected: boolean;
  isFolder?: boolean;
}

interface DeleteDialogState {
  conversationId?: string;
  title?: string;
  selectedIds?: Set<string>;
  count?: number;
}

export function ConversationList({ 
  conversations,
  shouldCreateChat,
  onChatCreated
}: ConversationListProps) {
  const { addTab, closeTab, getTabByConversation, isTabOpenByConversation, switchToTab, activeTabId, openTabs } = useTabContext();
  const router = useRouter();
  const { createChat } = useChatCreation();
  
  // Get the current conversation ID from the active tab
  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const currentConversationId = activeTab?.conversationId || null;
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamingFolderPath, setRenamingFolderPath] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState("");
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

  const updateTitle = useMutation(api.conversations.updateTitle);
  const deleteConversation = useMutation(api.conversations.remove);

  // Build folder structure when conversations change
  useEffect(() => {
    if (conversations) {
      const structure = buildFolderStructure(conversations);
      
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
  }, [conversations]);

  const handleConversationClick = (conversationId: string, event?: React.MouseEvent) => {
    if (event) {
      const isCtrlOrCmd = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;
      
      // If modifier keys are pressed, handle selection instead of navigation
      if (isCtrlOrCmd || isShift) {
        event.preventDefault();
        // Clear folder selection when selecting individual conversations
        setSelectedFolders(new Set());
        toggleSelection(conversationId, isShift, isCtrlOrCmd);
        return;
      }
    }
    
    // Normal navigation - set as selected and open tab
    setSelectedIds(new Set([conversationId]));
    setLastSelectedId(conversationId);
    setSelectedFolders(new Set());
    const conversation = conversations?.find(c => c._id === conversationId);
    if (conversation) {
      const conversationIdTyped = conversationId as Id<"conversations">;
      
      // Check if tab already exists for this conversation
      if (isTabOpenByConversation(conversationIdTyped)) {
        // Switch to existing tab instead of creating new one
        const existingTab = getTabByConversation(conversationIdTyped);
        if (existingTab) {
          switchToTab(existingTab.id);
        }
      } else {
        // Create new tab only if none exists
        const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        addTab({
          id: newTabId,
          conversationId: conversationIdTyped,
          title: conversation.title
        });

        router.push(`/chat?conversation=${conversationId}`);
      }
    }
  };

  const handleContextMenu = (e: React.MouseEvent, conversationId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we're right-clicking on a selected item and there are multiple selections
    const isMultipleSelected = selectedIds.has(conversationId) && selectedIds.size > 1;
    
    // If showing bulk menu and current active chat isn't selected, add it to selection
    if (isMultipleSelected && currentConversationId && !selectedIds.has(currentConversationId)) {
      const currentConvInThisList = conversations?.some(c => c._id === currentConversationId);
      if (currentConvInThisList) {
        setSelectedIds(prev => new Set([...prev, currentConversationId]));
      }
    }
    
    setContextMenu({ 
      conversationId, 
      x: e.clientX, 
      y: e.clientY, 
      isMultipleSelected 
    });
  };

  const handleRename = (conversation: Doc<"conversations">) => {
    setRenamingId(conversation._id);
    setRenameValue(conversation.title);
    setContextMenu(null);
  };

  const handleRenameSubmit = async (conversationId: string) => {
    if (renameValue.trim()) {
      try {
        await updateTitle({
          conversationId: conversationId as Id<"conversations">,
          title: renameValue.trim(),
        });
      } catch (error) {
        console.error("Failed to rename conversation:", error);
      }
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const handleDelete = (conversationId: string) => {
    const conversation = conversations?.find(c => c._id === conversationId);
    if (conversation) {
      setDeleteDialog({
        conversationId,
        title: conversation.title
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
      // Get all selected conversations and open them as tabs
      const selectedConversations = conversations?.filter(c => 
        selectedIds.has(c._id)
      ) || [];
      
      // Open each conversation as a tab (only if not already open)
      selectedConversations.forEach(conversation => {
        const conversationIdTyped = conversation._id as Id<"conversations">;
        
        // Check if tab already exists for this conversation
        if (isTabOpenByConversation(conversationIdTyped)) {
          // Switch to existing tab instead of creating new one
          const existingTab = getTabByConversation(conversationIdTyped);
          if (existingTab) {
            switchToTab(existingTab.id);
          }
        } else {
          // Create new tab only if none exists
          const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          addTab({
            id: newTabId,
            conversationId: conversationIdTyped,
            title: conversation.title
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
        // Bulk deletion
        const deletePromises = Array.from(deleteDialog.selectedIds).map(id =>
          deleteConversation({
            conversationId: id as Id<"conversations">,
          })
        );
        await Promise.all(deletePromises);
        
        // Check if we're deleting the currently active conversation
        const isCurrentlyActive = currentConversationId && deleteDialog.selectedIds.has(currentConversationId);
        
        // Close all tabs for deleted conversations
        Array.from(deleteDialog.selectedIds).forEach(id => {
          const tab = getTabByConversation(id as Id<"conversations">);
          if (tab) {
            closeTab(tab.id);
          }
        });
        
        // If we deleted the current conversation but it didn't have a tab, redirect
        if (isCurrentlyActive && !getTabByConversation(currentConversationId)) {
          const remainingTabs = openTabs.filter(tab => 
            !tab.conversationId || !deleteDialog.selectedIds.has(tab.conversationId)
          );
          
          if (remainingTabs.length > 0) {
            const remainingTab = remainingTabs[0];
            if (remainingTab.conversationId) {
              router.push(`/chat?conversation=${remainingTab.conversationId}`);
            } else {
              router.push('/chat');
            }
          } else {
            router.push('/');
          }
        }
        
        // Clear selection after successful bulk delete
        clearSelection();
      } else if (deleteDialog.conversationId) {
        // Single deletion
        const deletedConversationId = deleteDialog.conversationId as Id<"conversations">;
        
        await deleteConversation({
          conversationId: deletedConversationId,
        });
        
        // Check if we're deleting the currently active conversation
        const isCurrentlyActive = currentConversationId === deletedConversationId;
        
        // Close the tab for the deleted conversation
        const tab = getTabByConversation(deletedConversationId);
        if (tab) {
          closeTab(tab.id);
        } else if (isCurrentlyActive) {
          // If no tab exists but this is the current conversation, redirect to remaining tabs or home
          if (openTabs.length > 0) {
            const remainingTab = openTabs[0];
            if (remainingTab.conversationId) {
              router.push(`/chat?conversation=${remainingTab.conversationId}`);
            } else {
              router.push('/chat');
            }
          } else {
            router.push('/');
          }
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation(s):", error);
    }
  };

  // Selection helper functions
  const toggleSelection = (conversationId: string, isShift: boolean, isCtrlOrCmd: boolean) => {
    if (isShift) {
      // Range selection - use lastSelectedId or currentConversationId as start point
      let startId = lastSelectedId;
      
      // If no lastSelectedId but we have a current conversation, use that as the start
      if (!startId && currentConversationId) {
        const currentConvInThisList = conversations?.some(c => c._id === currentConversationId);
        if (currentConvInThisList) {
          startId = currentConversationId;
        }
      }
      
      if (startId && conversations) {
        const startIndex = conversations.findIndex(c => c._id === startId);
        const endIndex = conversations.findIndex(c => c._id === conversationId);
        
        if (startIndex !== -1 && endIndex !== -1) {
          const start = Math.min(startIndex, endIndex);
          const end = Math.max(startIndex, endIndex);
          const rangeIds = conversations
            .slice(start, end + 1)
            .map(c => c._id);
          
          setSelectedIds(prev => {
            const newSet = new Set(prev);
            rangeIds.forEach(id => newSet.add(id));
            return newSet;
          });
          
          // Update lastSelectedId to the clicked item for future range selections
          setLastSelectedId(conversationId);
        }
      }
    } else if (isCtrlOrCmd) {
      // Toggle individual selection
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        
        // If this is the first selection and current conversation exists, include it
        if (newSet.size === 0 && currentConversationId && currentConversationId !== conversationId) {
          const currentConvInThisList = conversations?.some(c => c._id === currentConversationId);
          if (currentConvInThisList) {
            newSet.add(currentConversationId);
          }
        }
        
        if (newSet.has(conversationId)) {
          newSet.delete(conversationId);
        } else {
          newSet.add(conversationId);
        }
        return newSet;
      });
      setLastSelectedId(conversationId);
    } else {
      // Single selection (clear others)
      setSelectedIds(new Set([conversationId]));
      setLastSelectedId(conversationId);
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

  const handleFolderContextMenu = (e: React.MouseEvent, folderPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isMultipleSelected = selectedFolders.has(folderPath) && selectedFolders.size > 1;
    
    setContextMenu({ 
      conversationId: folderPath, 
      x: e.clientX, 
      y: e.clientY, 
      isMultipleSelected,
      isFolder: true
    });
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

  // Handle folder operations
  const handleFolderOpenAll = () => {
    if (!folderStructure || !contextMenu?.isFolder) return;
    
    const findFolder = (node: FolderNode, targetPath: string): FolderNode | null => {
      if (node.path === targetPath) return node;
      
      for (const child of node.children.values()) {
        const found = findFolder(child, targetPath);
        if (found) return found;
      }
      return null;
    };
    
    const folder = findFolder(folderStructure, contextMenu.conversationId);
    if (folder) {
      const allConversations = getAllConversationsInFolder(folder);
      
      allConversations.forEach(conversation => {
        const conversationIdTyped = conversation._id as Id<"conversations">;
        
        if (!isTabOpenByConversation(conversationIdTyped)) {
          const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          addTab({
            id: newTabId,
            conversationId: conversationIdTyped,
            title: conversation.title
          });
        }
      });
    }
    
    setContextMenu(null);
  };

  // Handle folder rename
  const handleFolderRename = (folderPath: string) => {
    if (!folderStructure) return;
    
    const findFolder = (node: FolderNode, targetPath: string): FolderNode | null => {
      if (node.path === targetPath) return node;
      
      for (const child of node.children.values()) {
        const found = findFolder(child, targetPath);
        if (found) return found;
      }
      return null;
    };
    
    const folder = findFolder(folderStructure, folderPath);
    if (folder) {
      setRenamingFolderPath(folderPath);
      setRenameFolderValue(folder.name);
      setContextMenu(null);
    }
  };

  const handleFolderRenameSubmit = async (folderPath: string) => {
    if (!renameFolderValue.trim() || !folderStructure) {
      setRenamingFolderPath(null);
      setRenameFolderValue("");
      return;
    }

    try {
      // Find all conversations in this folder and its subfolders
      const findFolder = (node: FolderNode, targetPath: string): FolderNode | null => {
        if (node.path === targetPath) return node;
        
        for (const child of node.children.values()) {
          const found = findFolder(child, targetPath);
          if (found) return found;
        }
        return null;
      };
      
      const folder = findFolder(folderStructure, folderPath);
      if (folder) {
        const allConversations = getAllConversationsInFolder(folder);
        
        // Get the old folder name and new folder name
        const pathParts = folderPath.split("/");
        const oldFolderName = pathParts[pathParts.length - 1];
        const newFolderName = renameFolderValue.trim();
        
        // Update all conversation titles
        const updatePromises = allConversations.map(conversation => {
          let newTitle = conversation.title;
          
          // If the conversation is directly in this folder
          if (conversation.title.startsWith(folderPath + "/")) {
            newTitle = conversation.title.replace(folderPath + "/", folderPath.replace(oldFolderName, newFolderName) + "/");
          }
          // If the conversation title starts with this folder path
          else if (conversation.title.startsWith(folderPath)) {
            newTitle = conversation.title.replace(folderPath, folderPath.replace(oldFolderName, newFolderName));
          }
          
          if (newTitle !== conversation.title) {
            return updateTitle({
              conversationId: conversation._id as Id<"conversations">,
              title: newTitle,
            });
          }
          return Promise.resolve();
        });
        
        await Promise.all(updatePromises);
      }
    } catch (error) {
      console.error("Failed to rename folder:", error);
    }
    
    setRenamingFolderPath(null);
    setRenameFolderValue("");
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
    document.addEventListener('clearConversationSelection', handleClearSelection);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('clearConversationSelection', handleClearSelection);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [selectedIds.size, selectedFolders.size, clearSelection]);

  // Handle placeholder input events
  const handlePlaceholderKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      await createChat({
        title: placeholderValue.trim() || undefined,
        navigate: true,
        skipNormalization: true // Use the title exactly as entered by user
      });
      
      // Clear the placeholder and close it regardless of success
      setPlaceholderValue("");
      onChatCreated();
    } else if (e.key === "Escape") {
      setPlaceholderValue("");
      onChatCreated();
    }
  };

  const handlePlaceholderBlur = () => {
    setPlaceholderValue("");
    onChatCreated();
  };

  const handlePlaceholderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlaceholderValue(e.target.value);
  };

  // Focus placeholder input when shouldCreateChat becomes true
  useEffect(() => {
    if (shouldCreateChat && placeholderInputRef.current) {
      // Initialize with .chat extension
      setPlaceholderValue(CHAT_EXTENSION);
      placeholderInputRef.current.focus();
      // Position cursor before the dot
      setTimeout(() => {
        if (placeholderInputRef.current) {
          placeholderInputRef.current.setSelectionRange(0, 0);
        }
      }, 0);
    }
  }, [shouldCreateChat]);

  // Clear placeholder text when shouldCreateChat becomes false
  useEffect(() => {
    if (!shouldCreateChat) {
      setPlaceholderValue("");
    }
  }, [shouldCreateChat]);

  // Render folder structure recursively
  const renderFolderStructure = (folder: FolderNode, level: number = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];
    
    // Render subfolders
    Array.from(folder.children.entries()).forEach(([folderName, childFolder]) => {
      const isSelected = selectedFolders.has(childFolder.path);
      const isRenaming = renamingFolderPath === childFolder.path;
      
      if (isRenaming) {
        const indentLevel = level * 8;
        elements.push(
          <div key={childFolder.path} className="relative h-[22px] flex items-center">
            <input
              type="text"
              value={renameFolderValue}
              onChange={(e) => setRenameFolderValue(e.target.value)}
              onBlur={() => handleFolderRenameSubmit(childFolder.path)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleFolderRenameSubmit(childFolder.path);
                } else if (e.key === "Escape") {
                  setRenamingFolderPath(null);
                  setRenameFolderValue("");
                }
              }}
              onFocus={(e) => {
                e.target.select();
              }}
              className="w-full h-[20px] text-[13px] bg-sidebar text-sidebar-foreground focus:outline-none"
              style={{
                paddingLeft: `${20 + indentLevel}px`,
                paddingRight: '8px',
                boxShadow: 'inset 0 1px 0 0 var(--border-subtle), inset 0 -1px 0 0 var(--border-subtle)'
              }}
              autoFocus
            />
          </div>
        );
      } else {
        elements.push(
          <FolderItem
            key={childFolder.path}
            folder={childFolder}
            level={level}
            onToggleExpanded={toggleFolderExpanded}
            onFolderClick={handleFolderClick}
            onFolderContextMenu={handleFolderContextMenu}
            isSelected={isSelected}
          />
        );
      }
      
      // Render contents if expanded
      if (childFolder.isExpanded) {
        elements.push(...renderFolderStructure(childFolder, level + 1));
      }
    });
    
    // Render conversations in this folder
    folder.conversations.forEach(conversation => {
      const indentLevel = level * 8;
      const displayName = getConversationDisplayName(conversation);
      const isActive = currentConversationId === conversation._id;
      const isSelected = selectedIds.has(conversation._id);
      
      elements.push(
        <div key={conversation._id}>
          {renamingId === conversation._id ? (
            <div className="relative h-[22px] flex items-center">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => handleRenameSubmit(conversation._id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameSubmit(conversation._id);
                  } else if (e.key === "Escape") {
                    setRenamingId(null);
                    setRenameValue("");
                  }
                }}
                onFocus={(e) => {
                  const lastDotIndex = renameValue.lastIndexOf('.');
                  if (lastDotIndex > 0) {
                    e.target.setSelectionRange(0, lastDotIndex);
                  } else {
                    e.target.select();
                  }
                }}
                className="w-full h-[20px] text-[13px] bg-sidebar text-sidebar-foreground focus:outline-none"
                style={{
                  paddingLeft: `${20 + indentLevel + (level > 0 ? 4 : 0)}px`,
                  paddingRight: '8px',
                  boxShadow: 'inset 0 1px 0 0 var(--border-subtle), inset 0 -1px 0 0 var(--border-subtle)'
                }}
                autoFocus
              />
            </div>
          ) : (
            <div
              onClick={(e) => handleConversationClick(conversation._id, e)}
              onContextMenu={(e) => handleContextMenu(e, conversation._id)}
              className={cn(
                "h-[22px] flex items-center text-[13px] cursor-pointer text-sidebar-foreground truncate select-none",
                (isActive || isSelected) && "bg-sidebar-accent"
              )}
              style={{ 
                paddingLeft: `${20 + indentLevel + (level > 0 ? 4 : 0)}px`,
                paddingRight: '8px',
                backgroundColor: isSelected 
                  ? 'var(--interactive-hover)'       // Selected (takes precedence)
                  : isActive 
                  ? 'var(--interactive-primary)'     // Active (fallback)
                  : 'transparent'
              }}
              onMouseEnter={(e) => {
                if (!isActive && !isSelected) {
                  e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive && !isSelected) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              <span style={{ 
                opacity: 0.8,
                color: (isActive || isSelected) ? 'white' : 'inherit'
              }}>{displayName}</span>
            </div>
          )}
        </div>
      );
    });
    
    return elements;
  };

  if (!conversations) {
    return (
      <div className="text-sm text-muted-foreground p-2">
        Loading conversations...
      </div>
    );
  }

  return (
    <>
      <div className="space-y-0" data-sidebar>
        {/* Placeholder conversation for creating new chat */}
        {shouldCreateChat && (
          <div className="relative h-[22px] flex items-center">
            <input
              ref={placeholderInputRef}
              type="text"
              value={placeholderValue}
              onChange={handlePlaceholderChange}
              onBlur={handlePlaceholderBlur}
              onKeyDown={handlePlaceholderKeyDown}
              className="w-full h-[20px] px-5 text-[13px] bg-sidebar text-sidebar-foreground focus:outline-none"
              style={{
                boxShadow: 'inset 0 1px 0 0 var(--border-subtle), inset 0 -1px 0 0 var(--border-subtle)'
              }}
              placeholder="conversation-name.chat"
            />
          </div>
        )}

        {/* Folder structure */}
        {folderStructure && renderFolderStructure(folderStructure)}
      </div>

      {contextMenu && (
        <ConversationContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onOpen={() => contextMenu.isFolder ? handleFolderClick(contextMenu.conversationId) : handleConversationClick(contextMenu.conversationId)}
          onRename={() => {
            if (contextMenu.isFolder) {
              handleFolderRename(contextMenu.conversationId);
            } else {
              const conversation = conversations?.find(
                (c) => c._id === contextMenu.conversationId
              );
              if (conversation) handleRename(conversation);
            }
          }}
          onDelete={() => contextMenu.isMultipleSelected ? handleBulkDelete() : handleDelete(contextMenu.conversationId)}
          onOpenAll={contextMenu.isFolder ? handleFolderOpenAll : handleOpenAll}
          isMultipleSelected={contextMenu.isMultipleSelected}
          isFolder={contextMenu.isFolder}
        />
      )}

      <DeleteConversationDialog
        isOpen={!!deleteDialog}
        conversationTitle={deleteDialog?.title}
        conversationCount={deleteDialog?.count}
        onClose={() => setDeleteDialog(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}