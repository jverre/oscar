"use client";

import React, { useState } from "react";
import { MessageSquare, ArrowUp, CheckCircle, CircleStop } from "lucide-react";
import { useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '../../../convex/_generated/api';
import { useTenant } from '@/components/providers/TenantProvider';
import { Button } from "@/components/ui/button";
import { UserMessage } from "@/components/chat/UserMessage";
import { AssistantMessage } from "@/components/chat/AssistantMessage";
import { LoadingSpinner } from "@/components/ui/loading";
import { useConvexChat } from '@/hooks/useConvexChat';

export function ChatSidebar({ pluginId }: { pluginId?: string }) {
  const { data: session } = useSession();
  const { organizationId } = useTenant();
  
  // Check if this is a marketplace plugin (chat should be disabled)
  const isMarketplacePlugin = pluginId?.startsWith("marketplace_");
  
  // Use the new Convex chat hook
  const { messages, sendMessage, stop, status, error, isLoading } = useConvexChat({
    pluginId,
    organizationId,
    enabled: !isMarketplacePlugin,
  });
  
  // Mutation to clear messages
  const clearMessages = useMutation(api.chats.clearMessagesByPlugin);
  
  // Input state management
  const [input, setInput] = useState('');

  const isStreamingOrSubmitted = status === 'streaming' || status === 'submitted';

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreamingOrSubmitted || isMarketplacePlugin || isLoading) return;
    
    sendMessage({ text: input });
    setInput('');
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  // Handle clear chat
  const handleClearChat = async () => {
    if (!pluginId || !organizationId || isMarketplacePlugin) return;
    
    try {
      // Clear messages from backend
      await clearMessages({
        pluginId: pluginId,
        organizationId: organizationId
      });
    } catch (error) {
      console.error('Failed to clear chat:', error);
    }
  };

  // Show setup message if no auth or organization
  if (!session) {
    return (
      <div className="h-full bg-card border-l border-border flex flex-col items-center justify-center p-4 text-center">
        <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-2">Please sign in to use AI chat</p>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="h-full bg-card border-l border-border flex flex-col items-center justify-center p-4 text-center">
        <MessageSquare className="w-8 h-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-2">Organization access required</p>
        <p className="text-xs text-muted-foreground">Please join an organization to use AI chat</p>
      </div>
    );
  }

  return (
    <div className="h-full bg-card border-l border-border flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <span className="text-xs text-muted-foreground font-medium">AI Chat</span>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            disabled={isStreamingOrSubmitted || isMarketplacePlugin || isLoading}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            clear
          </button>
        )}
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="space-y-3">
          {messages.map((message) => (
            <div key={message.id} className="space-y-2">
              {message.role === 'user' && (
                <div>
                  {message.parts?.map((part: { type: string; text?: string }, partIndex: number) => 
                    part.type === 'text' && part.text ? (
                      <UserMessage key={partIndex} content={part.text} />
                    ) : null
                  ) || (
                    // Fallback for messages without parts structure
                    <UserMessage content={message.content} />
                  )}
                </div>
              )}

              {message.role === 'assistant' && (
                <div className="space-y-2">
                  {/* Show loading state only for pending messages or streaming without content and parts */}
                  {((message.status === 'pending') || (message.status === 'streaming' && !message.content && (!message.parts || message.parts.length === 0))) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <LoadingSpinner size="sm" />
                      <span>Generating response...</span>
                    </div>
                  )}
                  
                  {/* Show error state */}
                  {message.status === 'error' && (
                    <div className="text-xs text-red-500 rounded-lg p-2">
                      Generation failed. Please try again.
                    </div>
                  )}
                  
                  {/* Render parts in sequential order */}
                  {message.parts && message.parts.length > 0 ? (
                    message.parts.map((part: { 
                      type: string; 
                      text?: string; 
                      state?: string; 
                      input?: unknown; 
                      output?: unknown;
                      errorText?: string;
                    }, partIndex: number) => {
                      // Render text parts
                      if (part.type === 'text' && part.text) {
                        return (
                          <AssistantMessage 
                            key={`${message.id}-text-${partIndex}`}
                            content={part.text} 
                          />
                        );
                      }
                      
                      // Render tool calls
                      if (part.type.startsWith('tool-')) {
                        // Extract tool name from type (format: tool-{toolName})
                        const toolName = part.type.slice(5); // Remove 'tool-' prefix
                        
                        return (
                          <div key={`${message.id}-tool-${partIndex}`} className="space-y-1">
                            {/* Show streaming/input states */}
                            {(part.state === 'input-streaming' || part.state === 'input-available') && part.input !== undefined && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground flex items-center gap-2">
                                  <LoadingSpinner size="sm" />
                                  <span>Running {toolName}...</span>
                                </summary>
                                <div className="mt-1">
                                  <div className="text-muted-foreground mb-1">Arguments:</div>
                                  <pre className="bg-muted/30 p-2 rounded overflow-auto">
                                    {JSON.stringify(part.input, null, 2)}
                                  </pre>
                                </div>
                              </details>
                            )}
                            
                            {/* Show completed state */}
                            {part.state === 'output-available' && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground flex items-center gap-2">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Completed: {toolName}</span>
                                </summary>
                                <div className="space-y-2 mt-1">
                                  {part.input !== undefined && (
                                    <div>
                                      <div className="text-muted-foreground mb-1">Arguments:</div>
                                      <pre className="bg-muted/30 p-2 rounded overflow-auto">
                                        {JSON.stringify(part.input, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {part.output !== undefined && (
                                    <div>
                                      <div className="text-muted-foreground mb-1">Result:</div>
                                      <pre className="bg-muted/30 p-2 rounded max-h-32 overflow-auto">
                                        {JSON.stringify(part.output, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}
                            
                            {/* Show error state */}
                            {part.state === 'output-error' && (
                              <details className="text-xs">
                                <summary className="cursor-pointer text-muted-foreground flex items-center gap-2 text-red-500">
                                  <span>Error: {toolName}</span>
                                </summary>
                                <div className="space-y-2 mt-1">
                                  {part.input !== undefined && (
                                    <div>
                                      <div className="text-muted-foreground mb-1">Arguments:</div>
                                      <pre className="bg-muted/30 p-2 rounded overflow-auto">
                                        {JSON.stringify(part.input, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  {part.errorText !== undefined && (
                                    <div>
                                      <div className="text-red-500 mb-1">Error:</div>
                                      <pre className="bg-red-50 p-2 rounded text-red-600 text-xs">
                                        {part.errorText}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        );
                      }
                      
                      return null;
                    })
                  ) : (
                    /* Fallback: Show content if no parts but content exists */
                    message.content && (
                      <AssistantMessage 
                        content={message.content}
                      />
                    )
                  )}
                </div>
              )}
            </div>
          ))}
          
          {error && (
            <div className="text-xs text-red-500 rounded-lg p-2">
              Error: {error.message}
            </div>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="p-3">
        <form onSubmit={handleSubmit}>
          <div 
            className="flex flex-col border border-border rounded-lg p-2 gap-1.5 backdrop-blur-sm"
            style={{
              background: 'color-mix(in srgb, var(--color-input) 90%, transparent)',
              transition: 'box-shadow 0.1s ease-in-out, border-color 0.1s ease-in-out, backdrop-filter 0.2s ease-in-out'
            }}
          >
            {/* Input Area */}
            <div className="min-h-[18px]">
              <textarea
                placeholder={
                  isMarketplacePlugin 
                    ? "Chat is disabled for marketplace plugins"
                    : isLoading 
                      ? "Loading chat history..."
                      : "Ask about your plugin..."
                }
                value={input}
                onChange={handleInputChange}
                disabled={isStreamingOrSubmitted || isMarketplacePlugin || isLoading}
                className="w-full min-h-[18px] max-h-[120px] bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground resize-none overflow-hidden disabled:opacity-50"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
                rows={1}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !e.shiftKey && input.trim() && !isStreamingOrSubmitted && !isMarketplacePlugin && !isLoading) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
            </div>

            {/* Bottom Section */}
            <div className="flex items-center justify-between gap-2 flex-shrink-0">
              <div className="flex-1"></div>
              <div className="flex items-center gap-2">
                {status === 'streaming' ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={stop}
                    className="h-6 w-6 p-0 rounded-md bg-transparent border-none text-muted-foreground hover:text-foreground hover:bg-muted/20 hover:shadow-sm flex items-center justify-center transition-all duration-200 ease-in-out"
                  >
                    <CircleStop className="h-3 w-3" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!input.trim() || isStreamingOrSubmitted || isMarketplacePlugin || isLoading}
                    className="h-6 w-6 p-0 rounded-md bg-transparent border-none text-muted-foreground hover:text-foreground hover:bg-muted/20 hover:shadow-sm flex items-center justify-center transition-all duration-200 ease-in-out disabled:opacity-50"
                  >
                    {status === 'submitted' || isLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <ArrowUp className="h-3 w-3" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}