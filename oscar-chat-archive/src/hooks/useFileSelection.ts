import { useState, useCallback, useEffect } from "react";
import { Doc } from "../../convex/_generated/dataModel";

export function useFileSelection(files: Doc<"files">[] | undefined) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectedFolders(new Set());
    setLastSelectedId(null);
  }, []);
  
  const selectFile = useCallback((fileId: string) => {
    setSelectedIds(new Set([fileId]));
    setLastSelectedId(fileId);
    setSelectedFolders(new Set());
  }, []);
  
  const toggleFileSelection = useCallback((fileId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
    setLastSelectedId(fileId);
  }, []);
  
  const selectMultipleFiles = useCallback((fileIds: string[]) => {
    setSelectedIds(new Set(fileIds));
    if (fileIds.length > 0) {
      setLastSelectedId(fileIds[fileIds.length - 1]);
    }
  }, []);
  
  const selectFolder = useCallback((folderPath: string) => {
    setSelectedFolders(new Set([folderPath]));
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }, []);
  
  const toggleFolderSelection = useCallback((folderPath: string) => {
    setSelectedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderPath)) {
        newSet.delete(folderPath);
      } else {
        newSet.add(folderPath);
      }
      return newSet;
    });
  }, []);
  
  const selectRange = useCallback((fromId: string, toId: string) => {
    if (!files) return;
    
    const fromIndex = files.findIndex(f => f._id === fromId);
    const toIndex = files.findIndex(f => f._id === toId);
    
    if (fromIndex === -1 || toIndex === -1) return;
    
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    
    const newSelection = new Set<string>();
    for (let i = start; i <= end; i++) {
      newSelection.add(files[i]._id);
    }
    
    setSelectedIds(newSelection);
    setLastSelectedId(toId);
  }, [files]);
  
  const isFileSelected = useCallback((fileId: string) => {
    return selectedIds.has(fileId);
  }, [selectedIds]);
  
  const isFolderSelected = useCallback((folderPath: string) => {
    return selectedFolders.has(folderPath);
  }, [selectedFolders]);
  
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
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('clearFileSelection', handleClearSelection);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('clearFileSelection', handleClearSelection);
    };
  }, [selectedIds.size, selectedFolders.size, clearSelection]);
  
  return {
    selectedIds,
    selectedFolders,
    lastSelectedId,
    clearSelection,
    selectFile,
    toggleFileSelection,
    selectMultipleFiles,
    selectFolder,
    toggleFolderSelection,
    selectRange,
    isFileSelected,
    isFolderSelected,
  };
}