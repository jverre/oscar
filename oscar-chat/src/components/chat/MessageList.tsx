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
  metadata?: {
    tokenCount?: number;
    latency?: number;
    error?: string;
    toolCalls?: Array<{
      id: string;
      name: string;
      input: any;
    }>;
    toolResults?: Array<{
      toolCallId: string;
      toolName: string;
      result: any;
      isError?: boolean;
    }>;
    hasStructuredContent?: boolean;
    structuredContent?: any[];
  };
}

interface MessageListProps {
  messages: Message[];
  isSubmitting?: boolean;
  className?: string;
}

// Helper function to extract tool call ID from content
function extractToolCallId(content: string): string | null {
  const match = content.match(/:::tool-call\{[^}]*id=\\?"([^"\\]+)\\?"/);
  return match ? match[1] : null;
}

// Helper function to extract tool result ID from content
function extractToolResultId(content: string): string | null {
  const match = content.match(/:::tool-result\{id=\\?"([^"\\]+)\\?"/);
  return match ? match[1] : null;
}

// Group messages by combining tool calls with their results
function groupMessages(messages: Message[]): Array<Message | { type: 'grouped', messages: Message[] }> {
  // First pass: collect all tool calls and results with their indices
  const toolCalls = new Map<string, { message: Message; index: number }>();
  const toolResults = new Map<string, { message: Message; index: number }>();
  const processedIndices = new Set<number>();
  
  messages.forEach((message, index) => {
    const toolCallId = extractToolCallId(message.content);
    if (toolCallId && message.role === 'assistant') {
      toolCalls.set(toolCallId, { message, index });
    }
    
    const toolResultId = extractToolResultId(message.content);
    if (toolResultId) {
      toolResults.set(toolResultId, { message, index });
    }
  });
  
  // Second pass: build the grouped message list
  const grouped: Array<Message | { type: 'grouped', messages: Message[] }> = [];
  
  messages.forEach((message, index) => {
    // Skip if already processed as part of a group
    if (processedIndices.has(index)) {
      return;
    }
    
    const toolCallId = extractToolCallId(message.content);
    if (toolCallId && message.role === 'assistant' && toolResults.has(toolCallId)) {
      // This is a tool call with a matching result
      const result = toolResults.get(toolCallId)!;
      grouped.push({
        type: 'grouped',
        messages: [message, result.message]
      });
      processedIndices.add(index);
      processedIndices.add(result.index);
    } else {
      // Regular message or unmatched tool call/result
      const toolResultId = extractToolResultId(message.content);
      if (!toolResultId || !toolCalls.has(toolResultId)) {
        // Only add if it's not a tool result that has a matching call
        grouped.push(message);
        processedIndices.add(index);
      }
    }
  });
  
  return grouped;
}

export function MessageList({ messages, isSubmitting, className }: MessageListProps) {
  console.log('MessageList received messages:', messages);
  
  const groupedMessages = groupMessages(messages);
  
  return (
    <div className={cn("flex flex-col space-y-2 w-full max-w-4xl mx-auto", className)}>
      {groupedMessages.map((item, index) => {
        if ('type' in item && item.type === 'grouped') {
          // Render grouped tool call and result as a single assistant message
          const toolCall = item.messages[0];
          const toolResult = item.messages[1];
          const combinedContent = `${toolCall.content}\n\n${toolResult.content}`;
          
          return (
            <React.Fragment key={`grouped-${index}`}>
              <AssistantMessage 
                content={combinedContent}
                isStreaming={toolCall.isStreaming}
                metadata={toolCall.metadata}
              />
            </React.Fragment>
          );
        } else {
          // Regular message
          const message = item as Message;
          return (
            <React.Fragment key={message._id}>
              {message.role === 'user' ? (
                <UserMessage 
                  content={message.content}
                />
              ) : (
                <AssistantMessage 
                  content={message.content}
                  isStreaming={message.isStreaming}
                  metadata={message.metadata}
                />
              )}
            </React.Fragment>
          );
        }
      })}
    </div>
  );
}