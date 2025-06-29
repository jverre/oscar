"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { TerminalInput } from "@/components/chat/TerminalInput";
import { MessageList } from "@/components/chat/MessageList";
import { FileNotFound } from "@/components/chat/FileNotFound";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { useTabContext } from "@/contexts/TabContext";
import { useFileCreation } from "@/hooks/useFileCreation";
import type { Id } from "../../../convex/_generated/dataModel";

export default function ChatPage() {
  const user = useQuery(api.users.current);
  const token = useAuthToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get tab context
  const { activeTabId, openTabs, addTab } = useTabContext();
  
  // Get file ID from URL or active tab
  const urlFileId = searchParams.get("file");
  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const fileId = urlFileId || activeTab?.fileId || null;
  
  // Create a new tab if none exist and we're not showing the welcome screen
  // useEffect(() => {
  //   if (openTabs.length === 0 && fileId) {
  //     const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  //     addTab({
  //       id: newTabId,
  //       title: "New Chat",
  //       fileId: fileId as Id<"files">,
  //     });
  //   }
  // }, [openTabs.length, addTab, fileId]);
  
  // Validate file ID format and check if file exists
  const isValidFileId = fileId && typeof fileId === 'string' && fileId.length > 10;
  const file = useQuery(
    api.files.get,
    isValidFileId ? { fileId: fileId as Id<"files"> } : "skip"
  );
  
  // State for submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hook for file creation
  const { createFile } = useFileCreation();
  
  // Mutations
  const createUserMessage = useMutation(api.messages.createUserMessage);
  
  // const createAssistantMessage = useMutation(api.messages.createAssistantMessage);
  
  // Only run queries if we have a valid file ID - use paginated query
  const { results: messages, status } = usePaginatedQuery(
    api.messages.list,
    isValidFileId ? { fileId } : "skip",
    { initialNumItems: 50 }
  );

  // Auto-scroll refs and logic
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Optimized scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesContainerRef.current && shouldAutoScroll) {
      const container = messagesContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [shouldAutoScroll]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = Math.abs((scrollTop + clientHeight) - scrollHeight) <= 2;
    setShouldAutoScroll(isAtBottom);
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = async (content: string) => {
    if (!activeTabId || isSubmitting) return;
    
    setIsSubmitting(true);
    setShouldAutoScroll(true);
    
    try {
      let currentFileId = fileId;
      
      // Create new file if needed
      if (!currentFileId) {
        const newFileId = await createFile({
          initialMessage: content,
          navigate: false // We handle navigation ourselves in this context
        });
        
        if (!newFileId) {
          throw new Error("Failed to create file");
        }
        
        currentFileId = newFileId;
        
        // Navigate to the new file URL
        // Keep old format for now since this is the legacy route
        router.push(`/chat?file=${newFileId}`);
      }
      
      // Create user message (with optimistic update)
      await createUserMessage({
        fileId: currentFileId,
        content,
      });
      
      // Prepare messages for API call
      const allMessages = messages || [];
      const chatMessages = [
        ...allMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content,
        }
      ];
      
      // Start HTTP streaming
      const response = await fetch(`https://accomplished-koala-846.convex.site/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileId: currentFileId,
          messages: chatMessages,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          decoder.decode(value, { stream: true });
          
          // The HTTP endpoint updates the message in the database
          // so we don't need to do anything here - the UI will update automatically
        }
      } finally {
        reader.releaseLock();
      }
      
      setIsSubmitting(false);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsSubmitting(false);
    }
  };

  // Determine what to show
  const showWelcome = !fileId;
  // Only show "not found" when we have definitive evidence the file doesn't exist
  // Don't show it during loading transitions when queries are still pending
  const showNotFound = fileId && (!isValidFileId || (file === null && file !== undefined));
  const showLoading = fileId && isValidFileId && (file === undefined || messages === undefined);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex flex-col h-full px-6">
        <div 
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto"
          data-scroll-container
          onScroll={handleScroll}
        >
          <div className="w-full max-w-4xl mx-auto py-2">
            {showWelcome ? (
              <WelcomeScreen />
            ) : showNotFound ? (
              <FileNotFound />
            ) : showLoading ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center space-y-2">
                  <div className="text-muted-foreground">Loading file...</div>
                </div>
              </div>
            ) : (
              <MessageList
                messages={messages || []}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </div>
        
        {!showNotFound && !showWelcome && (
          <div className="flex-shrink-0 border-border/40 py-6 bg-background">
            <div className="w-full max-w-4xl mx-auto my-4">
              <TerminalInput 
                onSubmit={handleSubmit}
                placeholder={isSubmitting ? "Sending..." : "Type a message..."}
                disabled={isSubmitting || showLoading}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}