"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';

interface Message {
  _id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  provider?: string;
  isStreaming?: boolean;
}

interface MessageListProps {
  messages: Message[];
  isSubmitting?: boolean;
  className?: string;
}

export function MessageList({ messages, isSubmitting, className }: MessageListProps) {
  return (
    <div className={cn("flex flex-col space-y-2 w-full max-w-4xl mx-auto", className)}>
      {messages.map((message) => (
        <React.Fragment key={message._id}>
          {message.role === 'user' ? (
            <UserMessage 
              content={message.content}
            />
          ) : (
            <AssistantMessage 
              content={message.content}
              isStreaming={message.isStreaming}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}