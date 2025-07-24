"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Tab {
  id: string;
  type: 'file' | 'plugin' | 'plugin-file';
  title: string;
  pluginId?: string;
  filePath?: string; // For plugin files
  organizationId?: string; // For plugin and plugin-file tabs
}

interface FileContextType {
  activeFile: string | undefined;
  setActiveFile: (filePath: string | undefined) => void;
  openFile: (filePath: string) => void;
  openPlugin: (pluginId: string, pluginName: string) => void;
  openPluginFile: (pluginId: string, fileName: string, filePath: string, organizationId: string) => void;
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

  const openFile = (filePath: string) => {
    setActiveFile(filePath);
    // Add to tabs if not already open
    if (!openTabs.includes(filePath)) {
      setOpenTabs(prev => [...prev, filePath]);
      // Add to tabs array
      const fileName = filePath.split('/').pop() || filePath;
      setTabs(prev => [...prev, {
        id: filePath,
        type: 'file',
        title: fileName
      }]);
    }
    console.log('Opening file:', filePath);
  };

  const openPlugin = (pluginId: string, pluginName: string) => {
    console.log('openPlugin called with:', { pluginId, pluginName });
    const tabId = `plugin:${pluginId}`;
    console.log('Setting active file to:', tabId);
    setActiveFile(tabId);
    
    // Add to tabs if not already open
    if (!openTabs.includes(tabId)) {
      console.log('Adding new tab:', tabId);
      setOpenTabs(prev => {
        const newTabs = [...prev, tabId];
        console.log('New openTabs:', newTabs);
        return newTabs;
      });
             setTabs(prev => {
         const newTab: Tab = {
           id: tabId,
           type: 'plugin',
           title: pluginName,
           pluginId: pluginId
         };
         const newTabs = [...prev, newTab];
         console.log('New tabs:', newTabs);
         return newTabs;
       });
    } else {
      console.log('Tab already exists:', tabId);
    }
    console.log('Opening plugin:', pluginName, pluginId);
  };

  const openPluginFile = (pluginId: string, fileName: string, filePath: string, organizationId: string) => {
    console.log('[OPEN_PLUGIN_FILE] Called with:', { pluginId, fileName, filePath, organizationId });
    const tabId = `plugin-file:${pluginId}:${filePath}`;
    console.log('[OPEN_PLUGIN_FILE] Setting active file to:', tabId);
    setActiveFile(tabId);
    
    // Add to tabs if not already open
    if (!openTabs.includes(tabId)) {
      console.log('[OPEN_PLUGIN_FILE] Adding new plugin file tab:', tabId);
      setOpenTabs(prev => {
        const newTabs = [...prev, tabId];
        console.log('[OPEN_PLUGIN_FILE] New openTabs:', newTabs);
        return newTabs;
      });
      setTabs(prev => {
        const newTab: Tab = {
          id: tabId,
          type: 'plugin-file',
          title: fileName,
          pluginId: pluginId,
          filePath: filePath,
          organizationId: organizationId
        };
        const newTabs = [...prev, newTab];
        console.log('[OPEN_PLUGIN_FILE] New tabs:', newTabs);
        return newTabs;
      });
    } else {
      console.log('[OPEN_PLUGIN_FILE] Tab already exists:', tabId);
    }
    console.log('[OPEN_PLUGIN_FILE] Opening plugin file:', fileName, 'at', filePath, 'in plugin', pluginId);
  };

  const closeTab = (filePath: string) => {
    setOpenTabs(prev => prev.filter(tab => tab !== filePath));
    setTabs(prev => prev.filter(tab => tab.id !== filePath));
    // If closing active tab, switch to the last remaining tab
    if (activeFile === filePath) {
      const remainingTabs = openTabs.filter(tab => tab !== filePath);
      setActiveFile(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : undefined);
    }
  };

  const getActiveTab = () => {
    return tabs.find(tab => tab.id === activeFile);
  };

  const value: FileContextType = {
    activeFile,
    setActiveFile,
    openFile,
    openPlugin,
    openPluginFile,
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