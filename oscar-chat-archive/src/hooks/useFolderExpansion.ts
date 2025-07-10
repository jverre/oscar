import { useState, useCallback, useEffect } from "react";
import { FolderNode } from "@/utils/folderUtils";

const STORAGE_KEY = 'folderExpansionState';

export function useFolderExpansion() {
  const [expansionState, setExpansionState] = useState<Record<string, boolean>>({});
  
  useEffect(() => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
      try {
        setExpansionState(JSON.parse(savedState));
      } catch (error) {
        console.error("Failed to parse expansion state:", error);
      }
    }
  }, []);
  
  const saveExpansionState = useCallback((state: Record<string, boolean>) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, []);
  
  const toggleFolder = useCallback((folderPath: string) => {
    setExpansionState(prev => {
      const newState = {
        ...prev,
        [folderPath]: !prev[folderPath]
      };
      saveExpansionState(newState);
      return newState;
    });
  }, [saveExpansionState]);
  
  const expandFolder = useCallback((folderPath: string) => {
    setExpansionState(prev => {
      const newState = {
        ...prev,
        [folderPath]: true
      };
      saveExpansionState(newState);
      return newState;
    });
  }, [saveExpansionState]);
  
  const collapseFolder = useCallback((folderPath: string) => {
    setExpansionState(prev => {
      const newState = {
        ...prev,
        [folderPath]: false
      };
      saveExpansionState(newState);
      return newState;
    });
  }, [saveExpansionState]);
  
  const expandAll = useCallback(() => {
    const collectAllPaths = (node: FolderNode, paths: string[] = []): string[] => {
      if (node.path) {
        paths.push(node.path);
      }
      node.children.forEach(child => collectAllPaths(child, paths));
      return paths;
    };
    
    return (rootNode: FolderNode) => {
      const allPaths = collectAllPaths(rootNode);
      const newState = allPaths.reduce((acc, path) => ({
        ...acc,
        [path]: true
      }), {});
      setExpansionState(newState);
      saveExpansionState(newState);
    };
  }, [saveExpansionState]);
  
  const collapseAll = useCallback(() => {
    setExpansionState({});
    saveExpansionState({});
  }, [saveExpansionState]);
  
  const isExpanded = useCallback((folderPath: string) => {
    return expansionState[folderPath] ?? false;
  }, [expansionState]);
  
  const applyExpansionState = useCallback((node: FolderNode): FolderNode => {
    const newChildren = new Map();
    node.children.forEach((child, key) => {
      const expandedChild = applyExpansionState(child);
      newChildren.set(key, expandedChild);
    });
    
    return {
      ...node,
      children: newChildren,
      isExpanded: expansionState[node.path] ?? node.isExpanded
    };
  }, [expansionState]);
  
  return {
    expansionState,
    toggleFolder,
    expandFolder,
    collapseFolder,
    expandAll,
    collapseAll,
    isExpanded,
    applyExpansionState,
  };
}