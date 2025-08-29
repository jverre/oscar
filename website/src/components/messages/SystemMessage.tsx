import { Terminal } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

const markdownComponents = {
  a: ({ href, children, ...props }: any) => (
    <a
      href={href}
      className="text-primary underline-offset-2 hover:underline transition-colors"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
  code: ({ node, inline, children, ...props }: any) => {
    const isInline = inline || !node?.parent || node.parent.tagName !== 'pre'
    
    if (isInline) {
      return (
        <code
          className="bg-secondary px-1.5 py-0.5 rounded-sm text-sm font-mono border border-border/50"
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className="block bg-secondary/50 p-2 rounded text-sm font-mono overflow-x-auto whitespace-pre"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }: any) => (
    <pre className="bg-secondary/50 p-2 rounded my-2 overflow-x-auto" {...props}>
      {children}
    </pre>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote
      className="border-l-2 border-primary/30 pl-4 py-3 my-4 text-muted-foreground italic"
      {...props}
    >
      {children}
    </blockquote>
  ),
  h1: ({ children, ...props }: any) => (
    <h1 className="text-lg font-semibold mt-6 mb-3 text-foreground border-b border-border/50 pb-2" {...props}>
      {children}
    </h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-base font-semibold mt-5 mb-2 text-foreground" {...props}>
      {children}
    </h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-sm font-semibold mt-4 mb-1.5 text-foreground" {...props}>
      {children}
    </h3>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc ml-4 space-y-1 my-3" {...props}>
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal ml-4 space-y-1 my-3" {...props}>
      {children}
    </ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="text-foreground pl-1" {...props}>
      {children}
    </li>
  ),
  p: ({ children, ...props }: any) => (
    <p className="mb-3 leading-relaxed text-foreground" {...props}>
      {children}
    </p>
  ),
  strong: ({ children, ...props }: any) => (
    <strong className="font-medium text-foreground" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }: any) => (
    <em className="italic text-foreground" {...props}>
      {children}
    </em>
  ),
}

interface SystemMessageProps {
  content: string
  timestamp?: number
  messageOrder?: number
}

export function SystemMessage({ content, timestamp, messageOrder }: SystemMessageProps) {
  return (
    <div className="relative rounded-lg border-l-4 p-6 border-muted-foreground bg-muted">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-md bg-background border border-border">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <span className="font-mono text-sm font-semibold">
              System
            </span>
            {timestamp && (
              <p className="text-xs text-muted-foreground font-mono">
                {new Date(timestamp).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        {messageOrder !== undefined && (
          <span className="text-xs text-muted-foreground font-mono">
            #{messageOrder}
          </span>
        )}
      </div>
      
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  )
}