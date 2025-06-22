import React, { useState, useRef, useEffect } from 'react';
import { MarkdownRenderer } from '@/components/markdown/MarkdownRenderer';

interface AssistantMessageProps {
  content: string;
  isStreaming?: boolean;
  error?: boolean;
}

export function AssistantMessage({ content, isStreaming, error }: AssistantMessageProps) {
  const [showRaw, setShowRaw] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

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
            <MarkdownRenderer content={content} />
          )}
          {isStreaming && (
            <span 
              className="inline-block w-2 h-4 ml-1 animate-pulse align-text-bottom" 
              style={{ backgroundColor: 'var(--text-primary)' }}
            />
          )}
        </div>
        
        {/* Toggle button - only show when not streaming and has content */}
        {!isStreaming && content && (
          <div className="flex justify-end mt-2">
            <button
              onClick={toggleView}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
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