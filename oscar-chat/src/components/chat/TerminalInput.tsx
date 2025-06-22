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
    // Auto-resize using CSS field-sizing if supported, fallback to JS
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim() && onSubmit && !disabled) {
      onSubmit(value.trim());
      setValue('');
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
      <div className="flex items-start py-1.5">
        {/* Prompt */}
        <span className="text-muted-foreground font-mono select-none flex-shrink-0 text-xs leading-tight mx-1.5">
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
            "font-mono text-foreground text-xs",
            "placeholder:text-muted-foreground/50",
            "leading-tight mr-1.5",
            "focus:outline-none focus:ring-0",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{
            minHeight: '1rem',
            maxHeight: '160px',
            overflow: 'hidden'
          }}
          rows={1}
        />
      </div>
    </div>
  );
}