"use client";

import { useState, useEffect } from 'react';
import { useSmoothText } from './useSmoothText';

interface Message {
  _id: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
}

interface SmoothedMessageOptions {
  message: Message | null;
  shouldSmooth?: boolean;
  delayMs?: number;
}

interface SmoothedMessageState {
  displayText: string;
  isSmoothing: boolean;
  messageId: string | null;
}

export function useSmoothedMessage({
  message,
  shouldSmooth = true,
  delayMs = 15
}: SmoothedMessageOptions): SmoothedMessageState {
  const [currentMessageId, setCurrentMessageId] = useState<string | null>(null);
  const [textToSmooth, setTextToSmooth] = useState<string>('');
  
  // Use our smooth text hook for the actual smoothing
  const smoothText = useSmoothText({
    text: textToSmooth,
    delayMs,
    chunking: 'word', // Same fine-grained chunking as real-time streaming
    onComplete: () => {
      // Smoothing completed
    }
  });
  
  // Effect to handle new messages
  useEffect(() => {
    if (!message) {
      setCurrentMessageId(null);
      setTextToSmooth('');
      return;
    }
    
    // If this is a new message, decide whether to smooth it
    if (message._id !== currentMessageId) {
      setCurrentMessageId(message._id);
      
      if (shouldSmooth && message.role === 'assistant') {
        // Start smoothing this assistant message
        setTextToSmooth(message.content);
      } else {
        // Show user messages immediately (no smoothing)
        setTextToSmooth('');
      }
    }
  }, [message, currentMessageId, shouldSmooth]);
  
  // Return appropriate display text
  const displayText = (shouldSmooth && message?.role === 'assistant' && textToSmooth)
    ? smoothText.displayText
    : message?.content || '';
  
  const isSmoothing = (shouldSmooth && message?.role === 'assistant' && textToSmooth) 
    ? smoothText.isSmoothing 
    : false;
  
  return {
    displayText,
    isSmoothing,
    messageId: message?._id || null,
  };
}