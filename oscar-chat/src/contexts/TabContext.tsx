"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';

export interface Tab {
  id: string;
  fileId?: Id<"files">;
  title: string;
  pendingMessage?: string;
}

interface TabContextType {
  openTabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  switchToTab: (tabId: string) => void;
  isTabOpenByFile: (fileId: Id<"files">) => boolean;
  getTabByFile: (fileId: Id<"files">) => Tab | undefined;
  setActiveTabFromUrl: (fileId: Id<"files"> | null) => void;
  clearAllTabs: () => void;
  reorderTabs: (sourceIndex: number, destinationIndex: number) => void;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

const STORAGE_KEY = 'oscar-chat-tabs';

interface TabState {
  openTabs: Tab[];
  activeTabId: string | null;
}

type TabAction =
  | { type: 'LOAD_STATE'; payload: { openTabs: Tab[]; activeTabId: string | null } }
  | { type: 'ADD_TAB'; payload: Tab }
  | { type: 'CLOSE_TAB'; payload: string }
  | { type: 'SET_ACTIVE_TAB'; payload: string | null }
  | { type: 'UPDATE_TITLE'; payload: { tabId: string; title: string } }
  | { type: 'UPDATE_FILE_ID'; payload: { tabId: string; fileId: Id<"files"> } }
  | { type: 'CLEAR_PENDING_MESSAGE'; payload: string }
  | { type: 'CLEAR_ALL_TABS' }
  | { type: 'REORDER_TABS'; payload: { sourceIndex: number; destinationIndex: number } };

function tabReducer(state: TabState, action: TabAction): TabState {
  switch (action.type) {
    case 'LOAD_STATE':
      return {
        ...state,
        openTabs: action.payload.openTabs,
        activeTabId: action.payload.activeTabId,
      };

    case 'ADD_TAB': {
      const existingIndex = state.openTabs.findIndex(t => t.id === action.payload.id);
      
      if (existingIndex >= 0) {
        // Tab exists, update title if different and set as active
        const updatedTabs = [...state.openTabs];
        if (updatedTabs[existingIndex].title !== action.payload.title) {
          updatedTabs[existingIndex] = { ...updatedTabs[existingIndex], title: action.payload.title };
        }
        return {
          ...state,
          openTabs: updatedTabs,
          activeTabId: action.payload.id,
        };
      }
      
      // Add new tab
      return {
        ...state,
        openTabs: [...state.openTabs, action.payload],
        activeTabId: action.payload.id,
      };
    }

    case 'CLOSE_TAB': {
      // Check if tab actually exists before trying to close it
      const tabExists = state.openTabs.some(tab => tab.id === action.payload);
      if (!tabExists) {
        return state;
      }
      
      const filtered = state.openTabs.filter(tab => tab.id !== action.payload);
      
      if (state.activeTabId === action.payload) {
        // Closing active tab - need to find next tab
        if (filtered.length > 0) {
          const currentIndex = state.openTabs.findIndex(tab => tab.id === action.payload);
          const nextIndex = Math.min(currentIndex, filtered.length - 1);
          const nextTab = filtered[nextIndex];
          
          return {
            ...state,
            openTabs: filtered,
            activeTabId: nextTab?.id || null,
          };
        } else {
          // No tabs left
          return {
            ...state,
            openTabs: filtered,
            activeTabId: null,
          };
        }
      }
      
      // Not closing active tab
      return {
        ...state,
        openTabs: filtered,
      };
    }

    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTabId: action.payload,
      };

    case 'UPDATE_TITLE':
      return {
        ...state,
        openTabs: state.openTabs.map(tab =>
          tab.id === action.payload.tabId
            ? { ...tab, title: action.payload.title }
            : tab
        ),
      };

    case 'UPDATE_FILE_ID': {
      const updatedTabs = state.openTabs.map(tab =>
        tab.id === action.payload.tabId
          ? { ...tab, fileId: action.payload.fileId }
          : tab
      );
      
      return {
        ...state,
        openTabs: updatedTabs,
      };
    }

    case 'CLEAR_PENDING_MESSAGE': {
      const updatedTabs = state.openTabs.map(tab =>
        tab.id === action.payload
          ? { ...tab, pendingMessage: undefined }
          : tab
      );
      
      return {
        ...state,
        openTabs: updatedTabs,
      };
    }

    case 'CLEAR_ALL_TABS': {
      return {
        ...state,
        openTabs: [],
        activeTabId: null,
      };
    }

    case 'REORDER_TABS': {
      const { sourceIndex, destinationIndex } = action.payload;
      
      if (sourceIndex === destinationIndex || 
          sourceIndex < 0 || 
          destinationIndex < 0 || 
          sourceIndex >= state.openTabs.length || 
          destinationIndex >= state.openTabs.length) {
        return state;
      }
      
      const newTabs = [...state.openTabs];
      const [movedTab] = newTabs.splice(sourceIndex, 1);
      newTabs.splice(destinationIndex, 0, movedTab);
      
      return {
        ...state,
        openTabs: newTabs,
      };
    }

    default:
      return state;
  }
}

export function TabProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
  // Get user's organization and team for URL generation
  const userOrg = useQuery(api.organizations.getCurrentUserOrg);
  const userTeam = useQuery(api.teams.getCurrentUserTeam);
  const files = useQuery(api.files.list);
  
  const [state, dispatch] = useReducer(tabReducer, {
    openTabs: [],
    activeTabId: null,
  });

  // Load tabs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const savedState = JSON.parse(stored);
        dispatch({
          type: 'LOAD_STATE',
          payload: {
            openTabs: savedState.openTabs || [],
            activeTabId: savedState.activeTabId || null,
          },
        });
      }
    } catch (error) {
      console.error('Failed to load tab state from localStorage:', error);
    }
  }, []);

  // Save tabs to localStorage whenever state changes
  useEffect(() => {
    try {
      const stateToSave = { 
        openTabs: state.openTabs, 
        activeTabId: state.activeTabId 
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('Failed to save tab state to localStorage:', error);
    }
  }, [state.openTabs, state.activeTabId]);

  // Set active tab based on current URL
  const setActiveTabFromUrl = useCallback((fileId: Id<"files"> | null) => {
    if (!fileId) {
      // If no file ID, look for a tab without a file ID (like from team root)
      const tabWithoutFile = state.openTabs.find(tab => !tab.fileId);
      dispatch({ type: 'SET_ACTIVE_TAB', payload: tabWithoutFile?.id || null });
    } else {
      // Find tab with matching file ID
      const tab = state.openTabs.find(tab => tab.fileId === fileId);
      dispatch({ type: 'SET_ACTIVE_TAB', payload: tab?.id || null });
    }
  }, [state.openTabs]);

  const addTab = useCallback((tab: Tab) => {
    if (!tab?.id) {
      console.error('addTab: Invalid tab data', tab);
      return;
    }
    dispatch({ type: 'ADD_TAB', payload: tab });
  }, []);

  const closeTab = useCallback((tabId: string) => {
    if (!tabId) {
      console.error('closeTab: Invalid tabId', tabId);
      return;
    }
    
    // Get the tab being closed (for future use if needed)
    const isClosingActiveTab = state.activeTabId === tabId;
    const currentIndex = state.openTabs.findIndex(tab => tab.id === tabId);
    const remainingTabs = state.openTabs.filter(tab => tab.id !== tabId);
    
    dispatch({ type: 'CLOSE_TAB', payload: tabId });
    
    // Navigate immediately if closing active tab
    if (isClosingActiveTab) {
      if (remainingTabs.length > 0) {
        const nextIndex = Math.min(currentIndex, remainingTabs.length - 1);
        const nextTab = remainingTabs[nextIndex];
        
        // Navigate based on whether the next tab has a file ID
        if (nextTab.fileId && userOrg && userTeam && files) {
          const file = files.find(f => f._id === nextTab.fileId);
          if (file) {
            router.push(`/${encodeURIComponent(userOrg.name)}/${encodeURIComponent(userTeam.name)}/${encodeURIComponent(file.name)}`);
          } else {
            router.push(`/chat?file=${nextTab.fileId}`);
          }
        } else if (nextTab.fileId) {
          router.push(`/chat?file=${nextTab.fileId}`);
        } else if (userOrg && userTeam) {
          router.push(`/${encodeURIComponent(userOrg.name)}/${encodeURIComponent(userTeam.name)}/`);
        } else {
          router.push('/chat');
        }
      } else if (userOrg && userTeam) {
        router.push(`/${encodeURIComponent(userOrg.name)}/${encodeURIComponent(userTeam.name)}/`);
      } else {
        router.push('/chat');
      }
    }
  }, [state.activeTabId, state.openTabs, router, userOrg, userTeam, files]);

  const switchToTab = useCallback((tabId: string) => {
    console.log("switching to tab", tabId);
    if (!tabId) {
      console.error('switchToTab: Invalid tabId', tabId);
      return;
    }
    
    const tab = state.openTabs.find(t => t.id === tabId);
    if (!tab) {
      console.error('switchToTab: Tab not found', tabId);
      return;
    }

    // Set the tab as active in the state
    dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId });

    // Navigate based on whether the tab has a file ID
    if (tab.fileId && userOrg && userTeam && files) {
      const file = files.find(f => f._id === tab.fileId);
      if (file) {
        router.push(`/${encodeURIComponent(userOrg.name)}/${encodeURIComponent(userTeam.name)}/${encodeURIComponent(file.name)}`);
      } else {
        router.push(`/chat?file=${tab.fileId}`);
      }
    } else if (tab.fileId) {
      router.push(`/chat?file=${tab.fileId}`);
    } else if (userOrg && userTeam) {
      router.push(`/${encodeURIComponent(userOrg.name)}/${encodeURIComponent(userTeam.name)}/`);
    } else {
      // Navigate to chat root for tabs without file IDs
      router.push('/chat');
    }
  }, [router, state.openTabs, userOrg, userTeam, files]);

  const isTabOpenByFile = useCallback((fileId: Id<"files">) => {
    if (!fileId) return false;
    return state.openTabs.some(tab => tab.fileId === fileId);
  }, [state.openTabs]);

  const getTabByFile = useCallback((fileId: Id<"files">) => {
    if (!fileId) return undefined;
    return state.openTabs.find(tab => tab.fileId === fileId);
  }, [state.openTabs]);

  const clearAllTabs = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_TABS' });
  }, []);

  const reorderTabs = useCallback((sourceIndex: number, destinationIndex: number) => {
    dispatch({ type: 'REORDER_TABS', payload: { sourceIndex, destinationIndex } });
  }, []);

  
  const value: TabContextType = {
    openTabs: state.openTabs,
    activeTabId: state.activeTabId,
    addTab,
    closeTab,
    switchToTab,
    isTabOpenByFile,
    getTabByFile,
    setActiveTabFromUrl,
    clearAllTabs,
    reorderTabs,
  };

  return (
    <TabContext.Provider value={value}>
      {children}
    </TabContext.Provider>
  );
}

export function useTabContext() {
  const context = useContext(TabContext);
  if (context === undefined) {
    throw new Error('useTabContext must be used within a TabProvider');
  }
  return context;
}