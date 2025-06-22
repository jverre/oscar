"use client";

import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

interface UseStreamOptions {
  streamId: string | null;
  onComplete?: (text: string) => void;
  onError?: (error: string) => void;
}

interface StreamState {
  text: string;
  status: 'pending' | 'streaming' | 'done' | 'error' | 'timeout';
  isLoading: boolean;
  error: string | null;
  messageId?: string;
}

export function useStream({ streamId, onComplete, onError }: UseStreamOptions): StreamState {
  // Get persistent stream data from database
  const streamData = useQuery(
    api.messages.getStreamText,
    streamId ? { streamId } : "skip"
  );

  // Effect to handle stream completion
  useEffect(() => {
    if (streamData?.status === 'done' && streamData.text) {
      onComplete?.(streamData.text);
    } else if (streamData?.status === 'error') {
      const errorMsg = 'Stream failed to complete';
      onError?.(errorMsg);
    }
  }, [streamData?.status, streamData?.text, onComplete, onError]);

  // Determine loading state
  const isLoading = streamData?.status === 'pending' || streamData?.status === 'streaming';

  return {
    text: streamData?.text || '',
    status: streamData?.status || 'pending',
    isLoading,
    error: streamData?.status === 'error' ? 'Stream failed' : null,
    messageId: streamData?.messageId,
  };
}