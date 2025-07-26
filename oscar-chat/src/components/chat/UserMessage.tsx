interface UserMessageProps {
  content: string;
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div 
      className="text-xs text-foreground border border-border rounded-lg p-2 break-words overflow-hidden"
      style={{
        background: 'color-mix(in srgb, var(--color-input) 90%, transparent)',
        wordBreak: 'break-word',
        overflowWrap: 'break-word'
      }}
    >
      {content}
    </div>
  );
}