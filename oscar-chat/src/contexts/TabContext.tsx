"use client";

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Id } from '../../convex/_generated/dataModel';

export interface Tab {
  id: string;
  conversationId?: Id<"conversations">;
  title: string;
  pendingMessage?: string;
}

interface TabContextType {
  openTabs: Tab[];
  activeTabId: string | null;
  addTab: (tab: Tab) => void;
  closeTab: (tabId: string) => void;
  switchToTab: (tabId: string) => void;
  updateTabTitle: (tabId: string, title: string) => void;
  updateTabId: (tabId: string, conversationId: Id<"conversations">) => void;
  isTabOpenByConversation: (conversationId: Id<"conversations">) => boolean;
  getTabByConversation: (conversationId: Id<"conversations">) => Tab | undefined;
  setActiveTabFromUrl: (conversationId: Id<"conversations"> | null) => void;
  addTabWithMessage: (message: string) => string;
  clearTabPendingMessage: (tabId: string) => string | undefined;
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
  | { type: 'UPDATE_CONVERSATION_ID'; payload: { tabId: string; conversationId: Id<"conversations"> } }
  | { type: 'CLEAR_PENDING_MESSAGE'; payload: string };

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

    case 'UPDATE_CONVERSATION_ID': {
      const updatedTabs = state.openTabs.map(tab =>
        tab.id === action.payload.tabId
          ? { ...tab, conversationId: action.payload.conversationId }
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

    default:
      return state;
  }
}

export function TabProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  
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
  const setActiveTabFromUrl = useCallback((conversationId: Id<"conversations"> | null) => {
    if (!conversationId) {
      // If no conversation ID, look for a tab without a conversation ID (like from /chat)
      const tabWithoutConversation = state.openTabs.find(tab => !tab.conversationId);
      dispatch({ type: 'SET_ACTIVE_TAB', payload: tabWithoutConversation?.id || null });
    } else {
      // Find tab with matching conversation ID
      const tab = state.openTabs.find(tab => tab.conversationId === conversationId);
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
        
        // Navigate based on whether the next tab has a conversation ID
        if (nextTab.conversationId) {
          router.push(`/chat?conversation=${nextTab.conversationId}`);
        } else {
          router.push('/chat');
        }
      } else {
        router.push('/');
      }
    }
  }, [state.activeTabId, state.openTabs, router]);

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

    // Navigate based on whether the tab has a conversation ID
    if (tab.conversationId) {
      router.push(`/chat?conversation=${tab.conversationId}`);
    } else {
      router.push('/chat');
    }
  }, [router, state.openTabs]);

  const updateTabTitle = useCallback((tabId: string, title: string) => {
    if (!tabId || !title) {
      console.error('updateTabTitle: Invalid parameters', { tabId, title });
      return;
    }
    dispatch({ 
      type: 'UPDATE_TITLE', 
      payload: { tabId, title } 
    });
  }, []);

  const updateTabId = useCallback((tabId: string, conversationId: Id<"conversations">) => {
    if (!tabId || !conversationId) {
      console.error('updateTabId: Invalid parameters', { tabId, conversationId });
      return;
    }
    dispatch({ 
      type: 'UPDATE_CONVERSATION_ID', 
      payload: { tabId, conversationId } 
    });
  }, []);

  const isTabOpenByConversation = useCallback((conversationId: Id<"conversations">) => {
    if (!conversationId) return false;
    return state.openTabs.some(tab => tab.conversationId === conversationId);
  }, [state.openTabs]);

  const getTabByConversation = useCallback((conversationId: Id<"conversations">) => {
    if (!conversationId) return undefined;
    return state.openTabs.find(tab => tab.conversationId === conversationId);
  }, [state.openTabs]);

  const addTabWithMessage = useCallback((message: string) => {
    const tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    addTab({
      id: tabId,
      title: "New Chat",
      pendingMessage: message,
    });
    router.push('/chat');
    return tabId;
  }, [addTab, router]);

  const clearTabPendingMessage = useCallback((tabId: string) => {
    const tab = state.openTabs.find(t => t.id === tabId);
    const pendingMessage = tab?.pendingMessage;
    if (pendingMessage) {
      dispatch({ type: 'CLEAR_PENDING_MESSAGE', payload: tabId });
    }
    return pendingMessage;
  }, [state.openTabs]);

  const value: TabContextType = {
    openTabs: state.openTabs,
    activeTabId: state.activeTabId,
    addTab,
    closeTab,
    switchToTab,
    updateTabTitle,
    updateTabId,
    isTabOpenByConversation,
    getTabByConversation,
    setActiveTabFromUrl,
    addTabWithMessage,
    clearTabPendingMessage,
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