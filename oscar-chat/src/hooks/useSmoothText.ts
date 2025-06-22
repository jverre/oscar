"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

// Improved regex that handles both spaces and newlines
const WORD_REGEX = /[\s\n]+/;
const CHARACTER_REGEX = /(?<=.)/;

interface SmoothTextOptions {
  text: string;
  delayMs?: number;
  chunking?: 'word' | 'character' | RegExp;
  onComplete?: () => void;
}

interface SmoothTextState {
  displayText: string;
  isSmoothing: boolean;
  progress: number; // 0 to 1
}

export function useSmoothText({
  text,
  delayMs = 15,
  chunking = 'word',
  onComplete
}: SmoothTextOptions): SmoothTextState {
  const [displayText, setDisplayText] = useState('');
  const [isSmoothing, setIsSmoothing] = useState(false);
  
  // Refs to track processing state
  const processedLengthRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fullTextRef = useRef('');
  const completedRef = useRef(false);
  
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
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
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
      timeoutRef.current = setTimeout(processTextChunks, delayMs);
    } else {
      setIsSmoothing(false);
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete?.();
      }
    }
  }, [delayMs, getChunkingRegex, onComplete]);
  
  // Track previous text to detect changes
  const prevTextRef = useRef('');
  
  // Effect to handle new text
  useEffect(() => {
    // Only process if text actually changed
    if (text === prevTextRef.current) {
      return;
    }
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Update references
    prevTextRef.current = text;
    fullTextRef.current = text;
    completedRef.current = false;
    
    // If text is empty, reset everything
    if (!text) {
      setDisplayText('');
      processedLengthRef.current = 0;
      setIsSmoothing(false);
      return;
    }
    
    // If new text doesn't start with current display text, reset
    const currentDisplay = displayText;
    if (currentDisplay && !text.startsWith(currentDisplay)) {
      setDisplayText('');
      processedLengthRef.current = 0;
    }
    
    // Start smoothing if we have text to process
    const currentProgress = processedLengthRef.current;
    if (currentProgress < text.length) {
      setIsSmoothing(true);
      processTextChunks();
    }
  }, [text, processTextChunks]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const progress = fullTextRef.current.length > 0 
    ? processedLengthRef.current / fullTextRef.current.length 
    : 0;
  
  return {
    displayText,
    isSmoothing,
    progress,
  };
}