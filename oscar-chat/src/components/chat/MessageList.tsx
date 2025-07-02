"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { UserMessage } from './UserMessage';
import { AssistantMessage } from './AssistantMessage';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { normalizeContent, hasToolCalls as utilHasToolCalls } from '@/utils/contentUtils';
import { ToolInteractionGroup, extractToolInteractions } from './ToolInteractionGroup';

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

interface MessageListProps {
  messages: Message[];
  isSubmitting?: boolean;
  className?: string;
}

// New simple grouping approach - no complex grouping needed since tool interactions
// are now handled within individual assistant messages
function processMessages(messages: Message[]): Message[] {
  return messages.map(message => ({
    ...message,
    content: normalizeContent(message.content)
  }));
}


export function MessageList({ messages, isSubmitting, className }: MessageListProps) {
  // Process messages to normalize content and extract tool interactions across all messages
  const processedMessages = processMessages(messages);
  
  // Extract all tool interactions from the entire message list for proper matching
  const allToolInteractions = extractToolInteractions(
    processedMessages.map(msg => ({ content: msg.content, role: msg.role }))
  );
  
  // Create a set of tool message IDs that should be hidden (they'll be shown within assistant messages)
  const hiddenToolMessageIds = new Set<string>();
  
  // Find tool messages AND user messages with tool results that have corresponding assistant messages with tool calls
  processedMessages.forEach(message => {
    if (message.role === 'tool' || message.role === 'user') {
      const toolCallIds = message.content
        .filter(part => part.type === 'tool-result')
        .map(part => part.toolCallId)
        .filter(Boolean);
      
      // If any tool call IDs match existing interactions, hide this message
      if (toolCallIds.some(id => allToolInteractions.some(interaction => interaction.toolCallId === id))) {
        hiddenToolMessageIds.add(message._id);
      }
    }
  });
  
  return (
    <div className={cn("flex flex-col w-full max-w-4xl mx-auto", className)}>
      {processedMessages.map((message, index) => {
        // Skip tool messages that are grouped with assistant messages
        if (hiddenToolMessageIds.has(message._id)) {
          return null;
        }
        
        // Check if this is a user message to add extra spacing before it
        const isUserMessage = message.role === 'user';
        const prevVisibleMessage = index > 0 ? processedMessages
          .slice(0, index)
          .reverse()
          .find(m => !hiddenToolMessageIds.has(m._id)) : null;
        const needsExtraSpacing = isUserMessage && prevVisibleMessage?.role === 'assistant';
        
        return (
          <React.Fragment key={message._id}>
            <div className={needsExtraSpacing ? 'mt-4' : 'mt-1'}>
              {message.role === 'user' ? (
                <div className="mb-3">
                  <UserMessage content={message.content} />
                </div>
              ) : message.role === 'assistant' ? (
                <AssistantMessageWithTools 
                  message={message}
                  allToolInteractions={allToolInteractions}
                />
              ) : (
                // Handle other message types (system, standalone tool messages, etc.)
                <div className="text-xs text-gray-500 italic">
                  {message.role}: {JSON.stringify(message.content)}
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Helper component to render assistant messages with global tool interaction context
interface AssistantMessageWithToolsProps {
  message: Message & { content: any[] };
  allToolInteractions: ReturnType<typeof extractToolInteractions>;
}

function AssistantMessageWithTools({ message, allToolInteractions }: AssistantMessageWithToolsProps) {
  // Filter tool interactions that are present in this specific message
  const messageToolCallIds = message.content
    .filter(part => part.type === 'tool-call')
    .map(part => part.toolCallId)
    .filter(Boolean);
  
  const relevantInteractions = allToolInteractions.filter(interaction =>
    messageToolCallIds.includes(interaction.toolCallId)
  );
  
  // Get only text content for the message renderer
  const textContent = message.content.filter(part => part.type === 'text');
  
  // If this message has no text content and only tool calls, use compact spacing
  const isToolOnlyMessage = textContent.length === 0 && relevantInteractions.length > 0;
  
  return (
    <div className="flex w-full justify-start">
      <div className="text-sm text-foreground w-full" style={{ lineHeight: '1.6' }}>
        {/* Render text content */}
        {textContent.length > 0 && (
          <MarkdownRenderer content={textContent} />
        )}
        
        {/* Render tool interactions - for tool-only messages, show them more compactly */}
        {relevantInteractions.length > 0 && (
          <ToolInteractionGroup 
            interactions={relevantInteractions} 
            className={textContent.length > 0 ? "mt-1" : ""} 
          />
        )}
        
        {/* Streaming indicator */}
        {message.isStreaming && (
          <span 
            className="inline-block w-2 h-4 ml-1 animate-pulse align-text-bottom" 
            style={{ backgroundColor: 'var(--text-primary)' }}
          />
        )}
        
        {/* Show metadata if available */}
        {message.metadata?.error && (
          <div className="text-xs mt-2" style={{ color: 'var(--status-error)' }}>
            Error: {message.metadata.error}
          </div>
        )}
      </div>
    </div>
  );
}