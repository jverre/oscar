"use client";

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

interface UseConvexChatOptions {
  pluginId?: string;
  organizationId?: Id<"organizations"> | null;
  enabled?: boolean;
}

export function useConvexChat({ pluginId, organizationId, enabled = true }: UseConvexChatOptions) {
  const [status, setStatus] = useState<'idle' | 'submitted' | 'streaming' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  
  // Add mutation for stopping streaming
  const stopStreamingMutation = useMutation(api.chats.stopStreaming);

  // Load messages from database (this will reactively update)
  const messages = useQuery(
    api.chats.loadMessagesWithStreaming,
    pluginId && organizationId && enabled ? { 
      pluginId,
      organizationId: organizationId as Id<"organizations">,
    } : "skip"
  );

  // Check if any message is currently processing
  const hasProcessingMessage = messages?.some(msg => msg.status === 'pending' || msg.status === 'streaming') ?? false;
  
  // Update status based on message states
  useEffect(() => {
    if (hasProcessingMessage && status !== 'streaming' && status !== 'submitted') {
      setStatus('streaming');
    } else if (!hasProcessingMessage && (status === 'streaming' || status === 'submitted')) {
      setStatus('idle');
    }
  }, [hasProcessingMessage, status]);
  
  // Send message function - just triggers backend processing
  const sendMessage = useCallback(async ({ text }: { text: string }) => {
    if (!pluginId || !organizationId) {
      setError(new Error('Plugin ID and organization ID are required'));
      return;
    }

    setStatus('submitted');
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...(messages || []), {
            id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            role: 'user',
            content: text,
            parts: [{ type: 'text', text }],
          }],
          pluginId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      await response.json(); // Verify response is valid
      
      // Status will update automatically via reactive queries when AI starts responding
    } catch (err) {
      console.error('Chat error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setStatus('error');
    }
  }, [pluginId, organizationId, messages]);

  // Stop streaming function
  const stop = useCallback(async () => {
    if (!pluginId || !organizationId) return;
    
    try {
      await stopStreamingMutation({ 
        pluginId, 
        organizationId: organizationId as Id<"organizations"> 
      });
      setStatus('idle');
    } catch (err) {
      console.error('Error stopping stream:', err);
    }
  }, [pluginId, organizationId, stopStreamingMutation]);

  return {
    messages: messages || [],
    sendMessage,
    stop,
    status,
    error,
    isLoading: messages === undefined && enabled && !!pluginId && !!organizationId,
  };
}