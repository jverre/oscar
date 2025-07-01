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
  
  // Get org and team by name
  const organization = useQuery(api.organizations.getByName, { name: orgName });
  const team = useQuery(
    api.teams.getByOrgAndName,
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
  const { results: messages } = usePaginatedQuery(
    api.messages.list,
    file && isChatFile ? { fileId: file._id } : "skip",
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
    if (!activeTabId || isSubmitting || !file) return;
    
    setIsSubmitting(true);
    setShouldAutoScroll(true);
    
    try {
      // Create user message (with optimistic update)
      await createUserMessage({
        fileId: file._id,
        content: [{ type: "text", text: content }],
      });
      
      // Prepare messages for API call
      const allMessages = messages || [];
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
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 flex flex-col h-full px-6">
        <div 
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto"
          data-scroll-container
          onScroll={handleScroll}
        >
          <div className="w-full max-w-4xl mx-auto py-2">
            <MessageList
              messages={messages || []}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
        
        <div className="flex-shrink-0 border-border/40 py-6 bg-background">
          <div className="w-full max-w-4xl mx-auto my-4">
            <TerminalInput 
              onSubmit={handleSubmit}
              placeholder={isSubmitting ? "Sending..." : "Type a message..."}
              disabled={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
}