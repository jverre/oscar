"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useStream } from './useStream';

interface UseSmoothedStreamOptions {
  streamId: string | null;
  onComplete?: (text: string) => void;
  onError?: (error: string) => void;
  delayMs?: number;
  chunking?: 'word' | 'character' | RegExp;
}

interface SmoothedStreamState {
  displayText: string;
  status: 'pending' | 'streaming' | 'done' | 'error' | 'timeout';
  isLoading: boolean;
  error: string | null;
  messageId?: string;
}

// Improved regex that handles both spaces and newlines
const WORD_REGEX = /[\s\n]+/;
const CHARACTER_REGEX = /(?<=.)/;

export function useSmoothedStream({
  streamId,
  onComplete,
  onError,
  delayMs = 15,
  chunking = 'word'
}: UseSmoothedStreamOptions): SmoothedStreamState {
  // Get the raw stream data
  const streamState = useStream({ streamId, onComplete, onError });
  
  // State for smoothed display
  const [displayText, setDisplayText] = useState('');
  const [isSmoothing, setIsSmoothing] = useState(false);
  
  // Refs to track processing state
  const processedLengthRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fullTextRef = useRef('');
  
  // Get the regex for chunking
  const getChunkingRegex = useCallback(() => {
    if (chunking === 'word') return WORD_REGEX;
    if (chunking === 'character') return CHARACTER_REGEX;
    return chunking;
  }, [chunking]);
  
  // Process text chunks with smooth reveal
  const processTextChunks = useCallback(() => {
    const fullText = fullTextRef.current;
    const processedLength = processedLengthRef.current;
    
    if (processedLength >= fullText.length) {
      setIsSmoothing(false);
      return;
    }
    
    // Get unprocessed text
    const unprocessedText = fullText.slice(processedLength);
    
    // Find next chunk boundary
    const regex = getChunkingRegex();
    const match = unprocessedText.match(regex);
    
    let nextChunkEnd: number;
    if (match && match.index !== undefined) {
      // For word chunking, include the word and the space
      nextChunkEnd = processedLength + match.index + match[0].length;
    } else {
      // No more boundaries, take the rest
      nextChunkEnd = fullText.length;
    }
    
    // Update displayed text
    setDisplayText(fullText.slice(0, nextChunkEnd));
    processedLengthRef.current = nextChunkEnd;
    
    // Schedule next chunk if there's more
    if (nextChunkEnd < fullText.length) {
      // Use consistent delay for smooth streaming
      timeoutRef.current = setTimeout(processTextChunks, delayMs);
    } else {
      setIsSmoothing(false);
    }
  }, [delayMs, getChunkingRegex]);
  
  // Effect to handle new text
  useEffect(() => {
    const newText = streamState.text;
    
    // Update full text reference
    fullTextRef.current = newText;
    
    // If we have new text beyond what's displayed, start smoothing
    if (newText.length > processedLengthRef.current && !isSmoothing) {
      setIsSmoothing(true);
      processTextChunks();
    }
  }, [streamState.text, processTextChunks, isSmoothing]);
  
  // Effect to handle stream completion
  useEffect(() => {
    if (streamState.status === 'done' || streamState.status === 'error') {
      // Clear any pending timeouts
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      // Immediately show all remaining text when done
      setDisplayText(streamState.text);
      processedLengthRef.current = streamState.text.length;
      setIsSmoothing(false);
    }
  }, [streamState.status, streamState.text]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Reset when stream changes
  useEffect(() => {
    if (streamId) {
      setDisplayText('');
      processedLengthRef.current = 0;
      fullTextRef.current = '';
      setIsSmoothing(false);
    }
  }, [streamId]);
  
  return {
    displayText,
    status: streamState.status,
    isLoading: streamState.isLoading || isSmoothing,
    error: streamState.error,
    messageId: streamState.messageId,
  };
}