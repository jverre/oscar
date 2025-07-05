"use client";

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { MessageList } from './MessageList';

interface Message {
  _id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: Array<{
    type: string;
    text?: string;
    toolCallId?: string;
    toolName?: string;
    args?: any;
    result?: any;
    isError?: boolean;
  }>;
  createdAt: number;
  provider?: string;
  isStreaming?: boolean;
  metadata?: {
    tokenCount?: number;
    latency?: number;
    error?: string;
    finishReason?: string;
  };
}

interface ClaudeSessionViewerProps {
  messages: Message[];
  className?: string;
}

export function ClaudeSessionViewer({ messages, className }: ClaudeSessionViewerProps) {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const topObserverRef = useRef<HTMLDivElement>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const isAutoScrollingRef = useRef(false);

  // Check if user is at bottom of scroll container
  const checkIfUserAtBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100;
    return scrollHeight - (scrollTop + clientHeight) <= threshold;
  }, []);

  // Handle scroll events to track user position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isAutoScrollingRef.current) {
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

    if (isUserAtBottom) {
      isAutoScrollingRef.current = true;
      
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
        isAutoScrollingRef.current = false;
      });
    }
  }, [messages, isUserAtBottom]);

  return (
    <div className="flex flex-col h-full w-full">
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-6 relative"
      >
        <div className="w-full max-w-4xl mx-auto py-2">
          <MessageList messages={messages} />
        </div>
      </div>
    </div>
  );
}