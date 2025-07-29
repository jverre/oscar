"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface ContentTab {
  path: string;
  title: string;
}

interface UserTabState {
  activeFile?: string;
  tabs: ContentTab[];
}

interface FileContextType {
  activeFile: string | undefined;
  openContent: (filePath: string, title: string) => void;
  updateTabTitle: (filePath: string, newTitle: string) => void;
  openTabs: string[];
  tabs: ContentTab[];
  closeTab: (filePath: string) => void;
  getActiveTab: () => ContentTab | undefined;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export const useFileContext = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
};

interface FileProviderProps {
  children: ReactNode;
}

export const FileProvider = ({ children }: FileProviderProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  
  const [tabState, setTabState] = useState<UserTabState>({ tabs: [] });
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Generate storage key based on user ID
  const getStorageKey = useCallback(() => {
    return session?.user?.id ? `fileProvider_${session.user.id}` : 'fileProvider_anonymous';
  }, [session?.user?.id]);

  // Load tab state from session storage and handle initial URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const storageKey = getStorageKey();
      const saved = sessionStorage.getItem(storageKey);
      let initialState: UserTabState = { tabs: [] };
      
      if (saved) {
        initialState = JSON.parse(saved) as UserTabState;
      }
      
      // Handle direct navigation to a file URL
      const urlFile = searchParams.get('file');
      if (urlFile && !initialState.activeFile) {
        // Only set URL file as active if we don't have existing state
        initialState.activeFile = urlFile;
      }
      
      setTabState(initialState);
    } catch (error) {
      console.warn('Failed to load tab state from session storage:', error);
    }
    setIsInitialized(true);
  }, [getStorageKey, searchParams]);

  // Save tab state to session storage whenever it changes
  useEffect(() => {
    if (!isInitialized || typeof window === 'undefined') return;
    
    try {
      const storageKey = getStorageKey();
      sessionStorage.setItem(storageKey, JSON.stringify(tabState));
    } catch (error) {
      console.warn('Failed to save tab state to session storage:', error);
    }
  }, [tabState, isInitialized, getStorageKey]);

  // Sync URL with active file (one-way: session storage -> URL)
  useEffect(() => {
    if (!isInitialized) return;
    
    const urlFile = searchParams.get('file');
    if (tabState.activeFile !== urlFile) {
      const params = new URLSearchParams(searchParams.toString());
      if (tabState.activeFile) {
        params.set('file', tabState.activeFile);
      } else {
        params.delete('file');
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [tabState.activeFile, pathname, searchParams, router, isInitialized]);

  const openContent = (filePath: string, title: string) => {
    setTabState(prev => {
      // If this file is already active, don't update state
      if (prev.activeFile === filePath) {
        return prev;
      }
      
      const existingTab = prev.tabs.find(tab => tab.path === filePath);
      const newTabs = existingTab 
        ? prev.tabs 
        : [...prev.tabs, { path: filePath, title }];
      
      return {
        activeFile: filePath,
        tabs: newTabs
      };
    });
    console.log('Opening content:', filePath);
  };

  const closeTab = (filePath: string) => {
    setTabState(prev => {
      const newTabs = prev.tabs.filter(tab => tab.path !== filePath);
      
      // If closing active tab, switch to the last remaining tab
      const newActiveFile = prev.activeFile === filePath 
        ? (newTabs.length > 0 ? newTabs[newTabs.length - 1].path : undefined)
        : prev.activeFile;
      
      return {
        activeFile: newActiveFile,
        tabs: newTabs
      };
    });
  };

  const updateTabTitle = (filePath: string, newTitle: string) => {
    setTabState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => 
        tab.path === filePath ? { ...tab, title: newTitle } : tab
      )
    }));
  };

  const getActiveTab = () => {
    return tabState.tabs.find(tab => tab.path === tabState.activeFile);
  };

  const value: FileContextType = {
    activeFile: tabState.activeFile,
    openContent,
    updateTabTitle,
    openTabs: tabState.tabs.map(tab => tab.path),
    tabs: tabState.tabs,
    closeTab,
    getActiveTab,
  };

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
}; 