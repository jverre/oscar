import React from 'react';
import { cn } from '@/lib/utils';

interface TerminalProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export function Terminal({ children, className, title = 'terminal' }: TerminalProps) {
  return (
    <div className={cn('terminal-window', className)}>
      <div className="terminal-header">
        <div className="flex gap-2">
          <div className="terminal-button close"></div>
          <div className="terminal-button minimize"></div>
          <div className="terminal-button maximize"></div>
        </div>
        <div className="flex-1 text-center">
          <span className="text-xs terminal-text" style={{ color: 'var(--text-muted)' }}>
            {title}
          </span>
        </div>
      </div>
      <div className="terminal-content">
        {children}
      </div>
    </div>
  );
}

interface TerminalLineProps {
  children: React.ReactNode;
  prompt?: string;
  showCursor?: boolean;
  className?: string;
}

export function TerminalLine({ 
  children, 
  prompt = '$', 
  showCursor = false, 
  className 
}: TerminalLineProps) {
  return (
    <div className={cn('terminal-text', className)}>
      <span style={{ color: 'var(--terminal-dim)' }}>{prompt}</span>{' '}
      {children}
      {showCursor && <span className="cursor"></span>}
    </div>
  );
}