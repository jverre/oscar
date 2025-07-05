"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { api } from "../../../../../convex/_generated/api";
import { useParams } from "next/navigation";
import { TerminalInput } from "@/components/chat/TerminalInput";
import { MessageList } from "@/components/chat/MessageList";
import { FileNotFound } from "@/components/chat/FileNotFound";
import { BlogEditor } from "@/components/blog/BlogEditor";
import { ClaudeSessionViewer } from "@/components/chat/ClaudeSessionViewer";
import { useTabContext } from "@/contexts/TabContext";

export default function OrgTeamFilePage() {
  const user = useQuery(api.users.current);
  const token = useAuthToken();
  const params = useParams();
  
  // Extract org, team, and file path from URL
  const orgName = decodeURIComponent(params.org as string);
  const teamName = decodeURIComponent(params.team as string);
  const filePath = params.filePath as string[];
  const fileName = filePath ? filePath.map(decodeURIComponent).join('/') : '';
  
  // Get tab context
  const { activeTabId } = useTabContext();
  
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
  const isClaudeFile = fileName.endsWith('.claude');
  // Only consider file as "not found" when query has completed and returned null
  const fileExists = file !== null;
  const fileLoading = file === undefined;
  
  // State for submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  
  // Mutations
  const createUserMessage = useMutation(api.messages.createUserMessage);
  
  // Only run messages query if we have a valid file and it's a chat or claude file
  // Use public query for unauthenticated users, authenticated query for logged-in users
  const { results: messages, status, loadMore } = usePaginatedQuery(
    user ? api.messages.list : api.messages.listPublic,
    file && (isChatFile || isClaudeFile) ? { fileId: file._id } : "skip",
    { initialNumItems: 25 } // Load first 25 messages (will be scrollable)
  );

  // Refs for pagination
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const topObserverRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Auto-scroll state
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const isAutoScrollingRef = useRef(false);
  const isPaginationRestoringRef = useRef(false);
  const previousMessageCountRef = useRef(0);
  const scrollBeforeNewMessagesRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null);

  // Intersection observer for smooth pagination trigger
  useEffect(() => {
    if (!topObserverRef.current || status !== "CanLoadMore") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !isLoadingMore) {
          handleLoadMore();
        }
      },
      {
        root: messagesContainerRef.current,
        rootMargin: '20px', // Trigger 20px before reaching the top
        threshold: 0.1
      }
    );

    observer.observe(topObserverRef.current);

    return () => observer.disconnect();
  }, [status, isLoadingMore]);

  // Handle loading more messages with smooth scroll preservation
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || status !== "CanLoadMore") return;

    const container = messagesContainerRef.current;
    if (!container) return;

    setIsLoadingMore(true);

    try {
      await loadMore(25); // Load 25 more messages
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      // The scroll compensation will be handled by the useLayoutEffect
      setTimeout(() => setIsLoadingMore(false), 50);
    }
  }, [isLoadingMore, status, loadMore]);

  // Check if user is at bottom of scroll container
  const checkIfUserAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100; // Consider "at bottom" if within 100px
    return scrollHeight - (scrollTop + clientHeight) <= threshold;
  }, []);

  // Handle scroll events to track user position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isAutoScrollingRef.current) {
        // Don't update user position during auto-scroll
        return;
      }
      setIsUserAtBottom(checkIfUserAtBottom());
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [checkIfUserAtBottom]);

  // Auto-scroll to bottom when messages change and user is at bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !messages?.length) return;

    // Check if there's a streaming message
    const hasStreamingMessage = messages.some(msg => msg.isStreaming);
    
    if (hasStreamingMessage && isUserAtBottom) {
      isAutoScrollingRef.current = true;
      
      // Use requestAnimationFrame for smooth scrolling
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
        isAutoScrollingRef.current = false;
      });
    }
  }, [messages, isUserAtBottom]);

  // Track scroll position continuously to capture it before changes
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const updateScrollState = () => {
      if (!isLoadingMore && !isPaginationRestoringRef.current && !isAutoScrollingRef.current) {
        scrollBeforeNewMessagesRef.current = {
          scrollTop: container.scrollTop,
          scrollHeight: container.scrollHeight
        };
      }
    };
    
    // Update on scroll and periodically to catch state before changes
    container.addEventListener('scroll', updateScrollState);
    const interval = setInterval(updateScrollState, 100);
    
    return () => {
      container.removeEventListener('scroll', updateScrollState);
      clearInterval(interval);
    };
  }, [isLoadingMore]);

  // Auto-scroll to bottom when new messages are added
  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || !messages?.length) return;

    const currentMessageCount = messages.length;
    const previousMessageCount = previousMessageCountRef.current;
    
    console.log('Message count change:', { previousMessageCount, currentMessageCount, isLoadingMore, scrollBeforeState: scrollBeforeNewMessagesRef.current });
    
    // If this is the initial load, just update the count
    if (previousMessageCount === 0) {
      previousMessageCountRef.current = currentMessageCount;
      return;
    }
    
    // Check if new messages were added (count increased)
    const messagesAdded = currentMessageCount > previousMessageCount;
    
    if (messagesAdded) {
      const isPaginating = isLoadingMore || isPaginationRestoringRef.current;
      console.log('Messages added!', { 
        isPaginating, 
        isUserAtBottom, 
        hasScrollState: !!scrollBeforeNewMessagesRef.current,
        count: currentMessageCount - previousMessageCount
      });
      
      if (scrollBeforeNewMessagesRef.current) {
        const { scrollTop: prevScrollTop, scrollHeight: prevScrollHeight } = scrollBeforeNewMessagesRef.current;
        const currentScrollHeight = container.scrollHeight;
        const addedHeight = currentScrollHeight - prevScrollHeight;
        
        if (isPaginating) {
          // For pagination, ALWAYS maintain scroll position
          console.log('Pagination scroll compensation:', {
            prevScrollTop,
            prevScrollHeight,
            currentScrollHeight,
            addedHeight,
            willSetScrollTop: prevScrollTop + addedHeight
          });
          
          container.scrollTop = prevScrollTop + addedHeight;
        } else {
          // For new messages (not pagination)
          if (isUserAtBottom) {
            // User is at bottom, auto-scroll to show new messages
            isAutoScrollingRef.current = true;
            container.scrollTop = container.scrollHeight;
            isAutoScrollingRef.current = false;
          } else {
            // User is not at bottom, maintain their position
            console.log('New message scroll compensation:', {
              prevScrollTop,
              prevScrollHeight,
              currentScrollHeight,
              addedHeight,
              willSetScrollTop: prevScrollTop + addedHeight
            });
            
            container.scrollTop = prevScrollTop + addedHeight;
          }
        }
      } else {
        console.log('WARNING: No scroll state captured before messages were added!');
      }
    }
    
    // Update the ref for next time
    previousMessageCountRef.current = currentMessageCount;
  }, [messages?.length, isUserAtBottom, isLoadingMore]);



  const handleSubmit = async (content: string) => {
    if (!activeTabId || isSubmitting || !file) return;
    
    setIsSubmitting(true);
    
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

  // Show Claude session viewer for .claude files
  if (isClaudeFile) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <ClaudeSessionViewer messages={[...(messages || [])].reverse()} />
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
                Only .chat, .claude, and .blog files are supported.
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
      {/* Messages scrollable area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 relative"
      >
        <div className="w-full max-w-4xl mx-auto py-2">
          {/* Intersection observer trigger for pagination */}
          {status === "CanLoadMore" && (
            <div ref={topObserverRef} className="h-1 w-full" />
          )}
          
          {/* Loading indicator */}
          {isLoadingMore && (
            <div className="flex justify-center py-2">
              <div className="flex items-center gap-1.5 text-xs text-foreground bg-background px-2 py-1 rounded border shadow-sm">
                <div className="w-2.5 h-2.5 border border-current border-t-transparent rounded animate-spin" />
                <span>Loading older messages...</span>
              </div>
            </div>
          )}
          
          <MessageList
            messages={[...(messages || [])].reverse()}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
      
      {/* Input area */}
      <div className="flex-shrink-0 bg-background px-4 md:px-6 py-3 md:py-6">
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