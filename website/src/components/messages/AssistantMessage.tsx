import { Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { AssistantContent, TextPart } from '../../../convex/schema'

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
          className="bg-muted px-1.5 py-0.5 rounded-sm text-sm font-mono border border-border/50"
          {...props}
        >
          {children}
        </code>
      )
    }
    return (
      <code
        className="block bg-muted/50 p-2 rounded text-sm font-mono overflow-x-auto whitespace-pre"
        {...props}
      >
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }: any) => (
    <pre className="bg-muted/50 p-2 rounded my-2 overflow-x-auto" {...props}>
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

interface AssistantMessageProps {
  content: AssistantContent
  timestamp?: number
  messageOrder?: number
}

export function AssistantMessage({ content, timestamp, messageOrder }: AssistantMessageProps) {
  const renderContent = () => {
    if (typeof content === 'string') {
      return <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    }

    // Filter to only show text parts (tool calls handled separately)
    const textParts = content.filter(part => part.type === 'text')
    
    if (textParts.length === 0) {
      return null
    }

    return (
      <div className="space-y-1">
        {textParts.map((part, index) => (
          <ReactMarkdown key={index} components={markdownComponents}>
            {part.text}
          </ReactMarkdown>
        ))}
      </div>
    )
  }

  const hasTextContent = () => {
    if (typeof content === 'string') {
      return content.trim().length > 0
    }
    const textParts = content.filter(part => part.type === 'text')
    return textParts.some(part => part.text.trim().length > 0)
  }

  // Hide the entire assistant block if there's no text content (only tool calls)
  if (!hasTextContent()) {
    return null
  }

  return (
    <div className="flex">
      <div className="w-4 flex justify-center pt-1">
        <div className="w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center relative z-10">
          <Bot className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      </div>
      
      <div className="flex-1 min-w-0 pl-3 pb-6">
        <div className="flex items-center gap-2 mb-1 pt-1">
          <span className="text-xs font-medium text-muted-foreground font-mono">
            Assistant
          </span>
          {timestamp && (
            <span className="text-xs text-muted-foreground font-mono opacity-50">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="text-sm text-foreground leading-relaxed">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}