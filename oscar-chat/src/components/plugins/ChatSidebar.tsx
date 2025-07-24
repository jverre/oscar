"use client";

import { useState } from "react";
import { MessageSquare, ArrowUp, Loader2 } from "lucide-react";
import { useQuery } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '../../../convex/_generated/api';
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { ToolInvocationComponent } from "@/components/chat/ToolInvocation";
import { groupMessages } from "@/components/chat/messageUtils";

export function ChatSidebar({ pluginId }: { pluginId?: string }) {
  const { data: session } = useSession();
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Get current user and organization information
  const currentUser = useQuery(
    api.users.currentUser, 
    session?.user?.id ? { userId: session.user.id } : "skip"
  );

  // Load existing messages for this plugin
  const existingMessages = useQuery(
    api.chats.loadMessagesByPlugin,
    pluginId ? { pluginId: pluginId as any } : "skip"
  );

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    const userMessage = input.trim();
    setInput(''); // Clear input immediately
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              id: `user-${Date.now()}`,
              role: 'user',
              content: userMessage,
              createdAt: Date.now(),
            }
          ],
          pluginId: pluginId,
        }),
      });

      if (response.ok) {
        // Streaming response - just consume it but don't process
        // Messages will be automatically updated via the existingMessages query
        const reader = response.body?.getReader();
        if (reader) {
          try {
            while (true) {
              const { done } = await reader.read();
              if (done) break;
            }
          } finally {
            reader.releaseLock();
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSubmitting(false);
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

  if (!currentUser?.organization) {
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
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="space-y-3">
          {groupMessages(existingMessages || []).map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-2">
              {group.userMessage && (
                <div 
                  className="text-xs text-foreground border border-border rounded-lg p-2 break-words overflow-hidden"
                  style={{
                    background: 'color-mix(in srgb, var(--color-input) 90%, transparent)',
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word'
                  }}
                >
                  {typeof group.userMessage.content === 'string' 
                    ? group.userMessage.content 
                    : JSON.stringify(group.userMessage.content)
                  }
                </div>
              )}

              {group.toolCalls.size > 0 && (
                <div className="space-y-1">
                  {Array.from(group.toolCalls.entries()).map(([toolCallId, { call, result }]) => {
                    const isCompleted = !!result;
                    const toolName = call?.toolName || result?.toolName || 'Unknown Tool';
                    const args = call?.args || {};
                    const resultData = result?.result;

                    return (
                      <ToolInvocationComponent 
                        key={toolCallId} 
                        toolInvocation={{
                          toolCallId,
                          toolName,
                          args,
                          state: isCompleted ? 'result' : 'call',
                          result: resultData,
                          timestamp: Date.now(),
                        }} 
                      />
                    );
                  })}
                </div>
              )}

              {group.assistantText && (
                <MarkdownRenderer content={group.assistantText} />
              )}
            </div>
          ))}
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
                placeholder="Ask about your plugin..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground resize-none overflow-hidden"
                style={{ fontSize: '12px', lineHeight: '1.5' }}
                rows={1}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
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
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim() || isSubmitting}
                  className="h-6 w-6 p-0 rounded-md bg-transparent border-none text-muted-foreground hover:text-foreground hover:bg-muted/20 hover:shadow-sm flex items-center justify-center transition-all duration-200 ease-in-out disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ArrowUp className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}