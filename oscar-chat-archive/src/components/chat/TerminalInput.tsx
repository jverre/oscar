"use client";

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TerminalInputProps {
  onSubmit?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function TerminalInput({ onSubmit, placeholder = "Type a message...", className, disabled = false }: TerminalInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    resizeTextarea();
  };

  // Resize function
  const resizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
      });
    }
  };

  // Focus on mount and handle resize
  useEffect(() => {
    textareaRef.current?.focus();
    resizeTextarea();
  }, []);

  // Handle resize on value changes (for cases like clearing input)
  useEffect(() => {
    resizeTextarea();
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && onSubmit && !disabled) {
      onSubmit(value.trim());
      setValue('');
      // Resize after clearing to ensure proper height
      requestAnimationFrame(() => resizeTextarea());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn(
      "w-full bg-background rounded",
      className
    )}
    style={{ border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-start py-1 md:py-1.5">
        {/* Prompt */}
        <span className="text-muted-foreground font-mono select-none flex-shrink-0 text-base md:text-xs leading-tight mx-1 md:mx-1.5 scale-[0.875] origin-left md:scale-100">
          &gt;
        </span>
        
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "flex-1 bg-transparent outline-none resize-none",
            "font-mono text-foreground text-base md:text-xs",
            "scale-[0.875] origin-left md:scale-100",
            "w-[114.3%] md:w-full",
            "placeholder:text-muted-foreground/50",
            "leading-tight mr-1 md:mr-1.5 py-0 md:py-0",
            "focus:outline-none focus:ring-0",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{
            minHeight: '1.25rem',
            maxHeight: '160px',
            overflow: 'hidden'
          }}
          rows={1}
        />
      </div>
    </div>
  );
}