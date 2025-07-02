"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { api } from "../../../../../convex/_generated/api";
import { useRouter, useParams } from "next/navigation";
import { TerminalInput } from "@/components/chat/TerminalInput";
import { MessageList } from "@/components/chat/MessageList";
import { FileNotFound } from "@/components/chat/FileNotFound";
import { WelcomeScreen } from "@/components/chat/WelcomeScreen";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { useTabContext } from "@/contexts/TabContext";
import { useFileCreation } from "@/hooks/useFileCreation";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function OrgTeamFilePage() {
  const user = useQuery(api.users.current);
  const token = useAuthToken();
  const router = useRouter();
  const params = useParams();
  
  // Extract org, team, and file path from URL
  const orgName = decodeURIComponent(params.org as string);
  const teamName = decodeURIComponent(params.team as string);
  const filePath = params.filePath as string[];
  const fileName = filePath ? filePath.map(decodeURIComponent).join('/') : '';
  
  // Get tab context
  const { activeTabId, openTabs, addTab } = useTabContext();
  
  // Get org and team by name (use public queries for unauthenticated users)
  const organization = useQuery(
    user ? api.organizations.getByName : api.organizations.getByNamePublic,
    { name: orgName }
  );
  const team = useQuery(
    user ? api.teams.getByOrgAndName : api.teams.getByOrgAndNamePublic,
    organization ? { organizationId: organization._id, name: teamName } : "skip"
  );
  
  // Get file by org/team/filename
  const file = useQuery(
    api.files.getByOrgTeamAndName,
    organization && team && fileName ? {
      organizationId: organization._id,
      teamId: team._id,
      fileName: fileName
    } : "skip"
  );
  
  // Determine file type based on extension
  const isChatFile = fileName.endsWith('.chat');
  const isBlogFile = fileName.endsWith('.blog');
  // Only consider file as "not found" when query has completed and returned null
  const fileExists = file !== null;
  const fileLoading = file === undefined;
  
  // State for submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Hook for file creation
  const { createFile } = useFileCreation();
  
  // Mutations
  const createUserMessage = useMutation(api.messages.createUserMessage);
  
  // Only run messages query if we have a valid file and it's a chat file
  // Use public query for unauthenticated users, authenticated query for logged-in users
  const { results: messages, status, loadMore } = usePaginatedQuery(
    user ? api.messages.list : api.messages.listPublic,
    file && isChatFile ? { fileId: file._id } : "skip",
    { initialNumItems: 25 } // Load first 25 messages (will be scrollable)
  );

  // Auto-scroll refs and logic
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const bottomElementRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const prevFileIdRef = useRef<string | undefined>(undefined);

  // Optimized scroll to bottom function
  const scrollToBottom = useCallback((force = false) => {
    if (!shouldAutoScroll && !force) return;
    
    // Primary method: use bottom element ref
    if (bottomElementRef.current) {
      bottomElementRef.current.scrollIntoView({ behavior: 'instant', block: 'end' });
      return;
    }
    
    // Fallback: manual scroll
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [shouldAutoScroll]);

  // Load older messages when user scrolls near top
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || status !== "CanLoadMore") return;
    
    console.log('Loading older messages...', { 
      currentCount: messages?.length, 
      status 
    });
    
    // Store current scroll position to maintain it after loading
    const container = messagesContainerRef.current;
    const scrollHeightBefore = container?.scrollHeight || 0;
    
    setIsLoadingOlder(true);
    try {
      await loadMore(50); // Load 50 more messages
      
      // Maintain scroll position after new messages are added
      if (container) {
        requestAnimationFrame(() => {
          const scrollHeightAfter = container.scrollHeight;
          const heightDifference = scrollHeightAfter - scrollHeightBefore;
          container.scrollTop = container.scrollTop + heightDifference;
        });
      }
      
      console.log('✅ Successfully loaded older messages', {
        newCount: messages?.length,
        heightDiff: container ? container.scrollHeight - scrollHeightBefore : 0
      });
    } catch (error) {
      console.error('❌ Failed to load older messages:', error);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, status, loadMore, messages?.length]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isAtBottom = Math.abs((scrollTop + clientHeight) - scrollHeight) <= 2;
    const isNearTop = scrollTop < 300; // Within 300px of top
    
    setShouldAutoScroll(isAtBottom);
    
    // Debug scroll position
    if (isNearTop) {
      console.log('📍 Near top detected', {
        scrollTop,
        isNearTop,
        isLoadingOlder,
        status,
        canLoadMore: status === "CanLoadMore",
        messagesCount: messages?.length
      });
    }
    
    // Load older messages when scrolling near top
    if (isNearTop && !isLoadingOlder && status === "CanLoadMore") {
      console.log('🔄 Triggering load older messages...');
      loadOlderMessages();
    }
  }, [isLoadingOlder, status, loadOlderMessages, messages?.length]);

  // Handle new chat file - force scroll to bottom
  useEffect(() => {
    if (file?._id && file._id !== prevFileIdRef.current && isChatFile) {
      prevFileIdRef.current = file._id;
      setShouldAutoScroll(true);
      
      // Force scroll to bottom when switching to a new chat
      // Use multiple RAF to ensure DOM is fully updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            scrollToBottom(true); // Force scroll regardless of shouldAutoScroll
          });
        });
      });
    }
  }, [file?._id, isChatFile, scrollToBottom]);

  // Auto-scroll when messages change (for existing chat)
  useEffect(() => {
    if (file?._id === prevFileIdRef.current) {
      // Only auto-scroll if we're in the same chat (not switching chats)
      scrollToBottom();
    }
  }, [messages, scrollToBottom, file?._id]);

  const handleSubmit = async (content: string) => {
    if (!activeTabId || isSubmitting || !file) return;
    
    setIsSubmitting(true);
    setShouldAutoScroll(true);
    
    try {
      // Create user message (with optimistic update)
      await createUserMessage({
        fileId: file._id,
        content: [{ type: "text", text: content }],
      });
      
      // Prepare messages for API call (reverse to chronological order)
      const allMessages = [...(messages || [])].reverse();
      const chatMessages = [
        ...allMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant' | 'system',
          content: Array.isArray(msg.content) 
            ? msg.content
                .filter(part => part.type === 'text')
                .map(part => part.text)
                .join('')
            : msg.content,
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
          fileId: file._id,
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

  // Show loading state while fetching org/team/file data
  if (!organization || !team || fileLoading) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-col h-full px-6">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-muted-foreground">Loading...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show file not found if file doesn't exist (only after loading is complete)
  if (!fileExists) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-col h-full px-6">
          <div className="flex-1 flex items-center justify-center">
            <FileNotFound />
          </div>
        </div>
      </div>
    );
  }

  // Show blog editor for .blog files
  if (isBlogFile) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <BlogEditor fileId={file._id} />
      </div>
    );
  }

  // Show placeholder for other non-chat files
  if (!isChatFile) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex flex-col h-full px-6">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-xl font-medium text-foreground">{fileName}</div>
              <div className="text-muted-foreground">
                This file type is not supported yet.
              </div>
              <div className="text-sm text-muted-foreground">
                Only .chat and .blog files are supported.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show chat interface for .chat files
  return (
    <div className="flex flex-col h-full w-full">
      {/* Messages scrollable area - takes remaining space */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={messagesContainerRef}
          className="h-full overflow-y-auto px-6"
          data-scroll-container
          onScroll={handleScroll}
        >
          <div className="w-full max-w-4xl mx-auto py-2">
            {/* Loading indicator for older messages */}
            {isLoadingOlder && (
              <div className="flex justify-center py-2">
                <div className="text-xs text-muted-foreground">Loading more chats...</div>
              </div>
            )}
            <MessageList
              messages={[...(messages || [])].reverse()}
              isSubmitting={isSubmitting}
            />
            {/* Invisible element at bottom for scrolling */}
            <div ref={bottomElementRef} style={{ height: '1px' }} />
          </div>
        </div>
      </div>
      
      {/* Fixed input area at bottom - never scrolls */}
      <div className="flex-shrink-0 bg-background px-6 py-6">
        <div className="w-full max-w-4xl mx-auto">
          <TerminalInput 
            onSubmit={handleSubmit}
            placeholder={isSubmitting ? "Sending..." : "Type a message..."}
            disabled={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}