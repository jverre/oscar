"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { useRouter, useSearchParams } from "next/navigation";
import { TerminalInput } from "@/components/chat/TerminalInput";
import { MessageList } from "@/components/chat/MessageList";
import { ConversationNotFound } from "@/components/chat/ConversationNotFound";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { useTabContext } from "@/contexts/TabContext";
import { useChatCreation } from "@/hooks/useChatCreation";
import type { Id } from "../../../convex/_generated/dataModel";

export default function ChatPage() {
  const user = useQuery(api.users.current);
  const token = useAuthToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get tab context
  const { activeTabId, openTabs, addTab } = useTabContext();
  
  // Get conversation ID from URL or active tab
  const urlConversationId = searchParams.get("conversation");
  const activeTab = openTabs.find(tab => tab.id === activeTabId);
  const conversationId = urlConversationId || activeTab?.conversationId || null;
  
  // Create a new tab if none exist and we're not showing the welcome screen
  useEffect(() => {
    if (openTabs.length === 0 && conversationId) {
      const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      addTab({
        id: newTabId,
        title: "New Chat",
      });
    }
  }, [openTabs.length, addTab, conversationId]);
  
  // Validate conversation ID format and check if conversation exists
  const isValidConversationId = conversationId && conversationId.startsWith("j") && conversationId.length > 10;
  const conversation = useQuery(
    api.conversations.get,
    isValidConversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
  );
  
  // State for submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hook for chat creation
  const { createChat } = useChatCreation();
  
  // Mutations
  const createUserMessage = useMutation(api.messages.createUserMessage).withOptimisticUpdate(
    (localStore, args) => {
      const { conversationId, content } = args;
      const existingMessages = localStore.getQuery(api.messages.list, { conversationId });
      
      if (existingMessages !== undefined) {
        const now = Date.now();
        const newMessage = {
          _id: crypto.randomUUID() as Id<"messages">,
          _creationTime: now,
          conversationId,
          userId: user?._id || "temp" as Id<"users">,
          role: "user" as const,
          content,
          createdAt: now,
        };
        
        localStore.setQuery(api.messages.list, { conversationId }, [
          ...existingMessages,
          newMessage,
        ]);
      }
    }
  );
  
  // const createAssistantMessage = useMutation(api.messages.createAssistantMessage);
  
  // Only run queries if we have a valid conversation ID
  const messages = useQuery(
    api.messages.list,
    isValidConversationId ? { conversationId } : "skip"
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
      let currentConversationId = conversationId;
      
      // Create new conversation if needed
      if (!currentConversationId) {
        const newConversationId = await createChat({
          initialMessage: content,
          navigate: false // We handle navigation ourselves in this context
        });
        
        if (!newConversationId) {
          throw new Error("Failed to create conversation");
        }
        
        currentConversationId = newConversationId;
        
        // Navigate to the new conversation URL
        router.push(`/chat?conversation=${newConversationId}`);
      }
      
      // Create user message (with optimistic update)
      await createUserMessage({
        conversationId: currentConversationId,
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
          conversationId: currentConversationId,
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
  const showWelcome = !conversationId;
  const showNotFound = conversationId && (!isValidConversationId || conversation === null || messages === null);
  const showLoading = conversationId && isValidConversationId && conversation === undefined && messages === undefined;

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
              <ConversationNotFound />
            ) : showLoading ? (
              <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center space-y-2">
                  <div className="text-muted-foreground">Loading conversation...</div>
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