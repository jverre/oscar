import React, { useState, useRef, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';
import { normalizeContent, hasToolCalls as utilHasToolCalls } from '@/utils/contentUtils';
import { ToolInteractionGroup, extractToolInteractions } from './ToolInteractionGroup';

interface AssistantMessageProps {
  content: Array<{
    type: string;
    text?: string;
    toolCallId?: string;
    toolName?: string;
    args?: any;
    result?: any;
    isError?: boolean;
  }> | any; // Allow any during transition
  isStreaming?: boolean;
  error?: boolean;
  metadata?: {
    tokenCount?: number;
    latency?: number;
    error?: string;
    finishReason?: string;
  };
}

// Helper function to detect if content contains tool calls
function hasToolCalls(content: any): boolean {
  return utilHasToolCalls(content);
}

export function AssistantMessage({ content, isStreaming, error, metadata }: AssistantMessageProps) {
  const [showRaw, setShowRaw] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const normalizedContent = normalizeContent(content);
  const containsToolCalls = hasToolCalls(content);
  
  // Extract tool interactions for the group component
  const toolInteractions = extractToolInteractions([{ content: normalizedContent, role: 'assistant' }]);

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
              {JSON.stringify(content, null, 2)}
            </div>
          ) : (
            <>
              {/* Render text content */}
              <MarkdownRenderer content={normalizedContent.filter(part => part.type === 'text')} />
              
              {/* Render tool interactions */}
              {toolInteractions.length > 0 && (
                <ToolInteractionGroup interactions={toolInteractions} className="mt-3" />
              )}
            </>
          )}
          {isStreaming && (
            <span 
              className="inline-block w-2 h-4 ml-1 animate-pulse align-text-bottom" 
              style={{ backgroundColor: 'var(--text-primary)' }}
            />
          )}
        </div>
        
        {/* Toggle button - only show when not streaming, has content, and no tool calls */}
        {!isStreaming && normalizedContent.length > 0 && !containsToolCalls && (
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