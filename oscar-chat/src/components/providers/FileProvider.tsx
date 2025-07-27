"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Tab {
  id: string;
  type: 'user' | 'plugin';
  title: string;
}

interface FileContextType {
  activeFile: string | undefined;
  setActiveFile: (fileId: string | undefined) => void;
  openFile: (fileId: string, title: string, type: 'user' | 'plugin') => void;
  updateTabTitle: (fileId: string, newTitle: string) => void;
  openTabs: string[];
  tabs: Tab[];
  closeTab: (filePath: string) => void;
  getActiveTab: () => Tab | undefined;
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
  const [activeFile, setActiveFile] = useState<string | undefined>();
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);

  const openFile = (fileId: string, title: string, type: 'user' | 'plugin') => {
    setActiveFile(fileId);
    // Add to tabs if not already open
    if (!openTabs.includes(fileId)) {
      setOpenTabs(prev => [...prev, fileId]);
      // Add to tabs array
      setTabs(prev => [...prev, {
        id: fileId,
        type: type,
        title: title
      }]);
    }
    console.log('Opening file:', fileId);
  };

  const closeTab = (fileId: string) => {
    setOpenTabs(prev => prev.filter(tab => tab !== fileId));
    setTabs(prev => prev.filter(tab => tab.id !== fileId));
    // If closing active tab, switch to the last remaining tab
    if (activeFile === fileId) {
      const remainingTabs = openTabs.filter(tab => tab !== fileId);
      setActiveFile(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : undefined);
    }
  };

  const updateTabTitle = (fileId: string, newTitle: string) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === fileId) {
        return { ...tab, title: newTitle };
      }
      return tab;
    }));
  };

  const getActiveTab = () => {
    return tabs.find(tab => tab.id === activeFile);
  };

  const value: FileContextType = {
    activeFile,
    setActiveFile,
    openFile,
    updateTabTitle,
    openTabs,
    tabs,
    closeTab,
    getActiveTab,
  };

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
}; 