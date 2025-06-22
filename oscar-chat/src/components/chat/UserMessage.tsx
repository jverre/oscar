import React from 'react';

interface UserMessageProps {
  content: string;
  showStatus?: boolean;
  status?: 'pending' | 'streaming' | 'done' | 'error' | 'timeout';
}

export function UserMessage({ content, showStatus, status }: UserMessageProps) {
  return (
    <div className="w-full">
      <div className="flex w-full justify-start">
        <div
          className="font-mono w-full px-2 py-2 rounded-lg inline select-text break-words text-sm"
          style={{
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-secondary)',
            color: 'var(--text-primary)',
            cursor: 'text',
            fontFamily: '-apple-system, "system-ui", sans-serif',
            fontSize: '12px',
            height: 'auto',
            lineHeight: '18px',
            overflowWrap: 'break-word',
            whiteSpace: 'preserve',
            width: '100%',
            wordBreak: 'break-word'
          }}
        >
          <div className="whitespace-pre-wrap break-words">
            {content}
          </div>
        </div>
      </div>
      {showStatus && (
        <div className="flex items-center text-xs font-mono mt-1 mb-1" style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
          <div className="animate-pulse mr-2">●</div>
          {status === 'pending' && "Connecting..."}
          {status === 'streaming' && "Streaming response..."}
          {status === 'error' && "Error occurred"}
        </div>
      )}
    </div>
  );
}