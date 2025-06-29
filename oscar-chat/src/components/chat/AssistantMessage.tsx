import React, { useState, useRef, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';

interface AssistantMessageProps {
  content: string;
  isStreaming?: boolean;
  error?: boolean;
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

// Helper function to detect if content contains tool calls
function hasToolCalls(content: string): boolean {
  return /:::tool-call\{/.test(content) || /:::tool-result\{/.test(content);
}

export function AssistantMessage({ content, isStreaming, error, metadata }: AssistantMessageProps) {
  const [showRaw, setShowRaw] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const containsToolCalls = hasToolCalls(content);

  const toggleView = () => {
    // Find the scrollable container (messages container)
    const scrollContainer = document.querySelector('[data-scroll-container]') || 
                           document.querySelector('.overflow-y-auto') ||
                           document.documentElement;
    
    if (scrollContainer && messageRef.current) {
      // Get current scroll position and message position
      const currentScrollTop = scrollContainer.scrollTop;
      const messageRect = messageRef.current.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const relativePosition = messageRect.top - containerRect.top;
      
      // Toggle the view
      setShowRaw(!showRaw);
      
      // Wait for render to complete, then adjust scroll position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (messageRef.current) {
            const newMessageRect = messageRef.current.getBoundingClientRect();
            const newContainerRect = scrollContainer.getBoundingClientRect();
            const newRelativePosition = newMessageRect.top - newContainerRect.top;
            const positionDiff = newRelativePosition - relativePosition;
            
            scrollContainer.scrollTop = currentScrollTop + positionDiff;
          }
        });
      });
    } else {
      setShowRaw(!showRaw);
    }
  };

  return (
    <div ref={messageRef} className="flex w-full justify-start mt-0 mb-5">
      <div className="text-sm text-foreground w-full" style={{ lineHeight: '1.6' }}>
        <div>
          {showRaw ? (
            <div className="whitespace-pre-wrap break-words font-mono text-xs text-muted-foreground">
              {content}
            </div>
          ) : (
            <MarkdownRenderer content={content} metadata={metadata} />
          )}
          {isStreaming && (
            <span 
              className="inline-block w-2 h-4 ml-1 animate-pulse align-text-bottom" 
              style={{ backgroundColor: 'var(--text-primary)' }}
            />
          )}
        </div>
        
        {/* Toggle button - only show when not streaming, has content, and no tool calls */}
        {!isStreaming && content && !containsToolCalls && (
          <div className="flex justify-end mt-2">
            <button
              onClick={toggleView}
              className="text-xs hover:underline"
              style={{ 
                color: 'var(--text-secondary)',
                fontSize: '10px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {showRaw ? "View markdown" : "View raw"}
            </button>
          </div>
        )}
        
        {error && (
          <div className="text-xs mt-2" style={{ color: 'var(--status-error)' }}>
            Error occurred while streaming
          </div>
        )}
      </div>
    </div>
  );
}