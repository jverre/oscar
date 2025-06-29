"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { ToolCall } from '../ui/tool-call';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  metadata?: {
    toolCalls?: Array<{
      id: string;
      name: string;
      input: any;
    }>;
    toolResults?: Array<{
      toolCallId: string;
      toolName: string;
      result: any;
      isError?: boolean;
    }>;
    hasStructuredContent?: boolean;
    structuredContent?: any[];
  };
}

function parseWithMetadata(content: string, metadata: NonNullable<MarkdownRendererProps['metadata']>): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let keyCounter = 0;

  // Group tool calls with their results using metadata IDs
  const toolGroups = metadata.toolCalls!.map(toolCall => {
    const result = metadata.toolResults?.find(r => r.toolCallId === toolCall.id);
    return {
      toolCall,
      result,
      id: toolCall.id
    };
  });

  // For metadata-based parsing, we'll render the content normally but replace tool sections
  let processedContent = content;
  
  // Remove tool call/result blocks from content since we'll render them separately
  processedContent = processedContent.replace(/\*\*🔧 Tool Call: [^*]+\*\*\s*\n```json\s*\n[\s\S]*?\n```/g, '');
  processedContent = processedContent.replace(/\*\*🔧 Tool Result\*\*\s*\n[\s\S]*?(?=\n\*\*🔧|\n\n[A-Z]|$)/g, '');
  
  // Split content by paragraphs to intersperse tool calls
  const contentParts = processedContent.split(/\n\n+/).filter(part => part.trim());
  
  // Add regular content
  if (contentParts.length > 0) {
    parts.push(
      <ReactMarkdown
        key={`text-${keyCounter++}`}
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
          rehypeRaw
        ]}
        components={getMarkdownComponents()}
      >
        {contentParts.join('\n\n')}
      </ReactMarkdown>
    );
  }

  // Add tool groups at the end
  toolGroups.forEach(({ toolCall, result }) => {
    parts.push(
      <ToolCall 
        key={`tool-${keyCounter++}`} 
        name={toolCall.name} 
        id={toolCall.id} 
        result={result ? JSON.stringify(result.result) : undefined}
      >
        {JSON.stringify(toolCall.input, null, 2)}
      </ToolCall>
    );
  });

  return parts;
}

function parseToolBlocks(content: string, metadata?: MarkdownRendererProps['metadata']): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let keyCounter = 0;

  // If we have structured metadata, use that for perfect tool call matching
  if (metadata?.toolCalls && metadata.toolCalls.length > 0) {
    return parseWithMetadata(content, metadata);
  }

  // First try the new format (:::tool-call style)
  // Handle both escaped quotes (from JSON storage) and regular quotes
  const newToolCallRegex = /:::tool-call\{name=\\?"([^"\\]+)\\?"\s+id=\\?"([^"\\]+)\\?"\}\n([\s\S]*?)\n:::/g;
  const newToolResultRegex = /:::tool-result\{id=\\?"([^"\\]+)\\?"\}\n([\s\S]*?)\n:::/g;

  // Also handle existing markdown format (**🔧 Tool Call:** style)
  const markdownToolCallRegex = /\*\*🔧 Tool Call: ([^*]+)\*\*\s*\n```json\s*\n([\s\S]*?)\n```/g;
  const markdownToolResultRegex = /\*\*🔧 Tool Result\*\*\s*\n([\s\S]*?)(?=\n\*\*🔧|\n\n[A-Z]|$)/g;

  const toolCalls: Array<{
    name: string;
    id: string;
    args: string;
    index: number;
    match: RegExpExecArray;
  }> = [];
  
  const toolResults: Array<{
    id: string;
    result: string;
    index: number;
    match: RegExpExecArray;
  }> = [];

  // Check for new format first
  let match;
  while ((match = newToolCallRegex.exec(content)) !== null) {
    const [, name, id, args] = match;
    toolCalls.push({ name, id, args, index: match.index, match });
  }

  newToolCallRegex.lastIndex = 0;

  while ((match = newToolResultRegex.exec(content)) !== null) {
    const [, id, result] = match;
    toolResults.push({ id, result, index: match.index, match });
  }

  // If no new format found, try markdown format
  if (toolCalls.length === 0) {
    let toolCallIndex = 0;
    while ((match = markdownToolCallRegex.exec(content)) !== null) {
      const [, name, args] = match;
      const id = `tool-${toolCallIndex++}`;
      toolCalls.push({ name, id, args, index: match.index, match });
    }

    markdownToolCallRegex.lastIndex = 0;

    let toolResultIndex = 0;
    while ((match = markdownToolResultRegex.exec(content)) !== null) {
      const [, result] = match;
      const id = `tool-${toolResultIndex++}`;
      toolResults.push({ id, result, index: match.index, match });
    }
  }

  // Group tool calls with their results
  const toolGroups: Array<{
    call: typeof toolCalls[0];
    result?: typeof toolResults[0];
    startIndex: number;
    endIndex: number;
  }> = [];

  // Create a combined list of all tool items with their types
  const allToolItems = [
    ...toolCalls.map(call => ({ type: 'call' as const, item: call, index: call.index })),
    ...toolResults.map(result => ({ type: 'result' as const, item: result, index: result.index }))
  ].sort((a, b) => a.index - b.index);

  // Group consecutive call-result pairs
  for (let i = 0; i < allToolItems.length; i++) {
    const current = allToolItems[i];
    if (current.type === 'call') {
      const next = allToolItems[i + 1];
      const call = current.item as typeof toolCalls[0];
      const result = (next && next.type === 'result') ? next.item as typeof toolResults[0] : undefined;
      
      const startIndex = call.index;
      const endIndex = result ? 
        result.index + result.match[0].length : 
        call.index + call.match[0].length;
      
      toolGroups.push({ call, result, startIndex, endIndex });
      
      // Skip the result item since we've processed it
      if (result) i++;
    }
  }

  // Sort by start index
  toolGroups.sort((a, b) => a.startIndex - b.startIndex);

  toolGroups.forEach(({ call, result, startIndex, endIndex }) => {
    // Add any content before this tool group
    if (startIndex > currentIndex) {
      const beforeContent = content.slice(currentIndex, startIndex);
      if (beforeContent.trim()) {
        parts.push(
          <ReactMarkdown
            key={`text-${keyCounter++}`}
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[
              [rehypeHighlight, { detect: true, ignoreMissing: true }],
              rehypeRaw
            ]}
            components={getMarkdownComponents()}
          >
            {beforeContent}
          </ReactMarkdown>
        );
      }
    }

    // Add the grouped tool call and result
    parts.push(
      <ToolCall key={`tool-group-${keyCounter++}`} name={call.name} id={call.id} result={result?.result}>
        {call.args}
      </ToolCall>
    );

    currentIndex = endIndex;
  });

  // Add any remaining content
  if (currentIndex < content.length) {
    const remainingContent = content.slice(currentIndex);
    if (remainingContent.trim()) {
      parts.push(
        <ReactMarkdown
          key={`text-${keyCounter++}`}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            [rehypeHighlight, { detect: true, ignoreMissing: true }],
            rehypeRaw
          ]}
          components={getMarkdownComponents()}
        >
          {remainingContent}
        </ReactMarkdown>
      );
    }
  }

  // If no tool blocks found, return normal markdown
  if (parts.length === 0) {
    parts.push(
      <ReactMarkdown
        key="full-content"
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
          rehypeRaw
        ]}
        components={getMarkdownComponents()}
      >
        {content}
      </ReactMarkdown>
    );
  }

  return parts;
}

function getMarkdownComponents() {
  return {
    // Code blocks and inline code
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match;
      
      if (isInline) {
        return (
          <code 
            style={{ 
              display: 'inline !important', 
              verticalAlign: 'baseline',
              whiteSpace: 'nowrap',
              margin: '0',
              padding: '2px 4px',
              backgroundColor: 'var(--surface-secondary)',
              color: 'var(--text-primary)',
              borderRadius: '2px',
              fontSize: '11px',
              fontFamily: 'monospace'
            }}
            {...props}
          >
            {children}
          </code>
        );
      }
      
      return (
        <code 
          style={{ 
            fontSize: '11px',
            fontFamily: 'monospace',
            color: 'var(--text-primary)'
          }}
          {...props}
        >
          {children}
        </code>
      );
    },
    pre({ children, ...props }: any) {
      return (
        <pre 
          style={{
            backgroundColor: 'var(--surface-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '4px',
            padding: '8px',
            margin: '8px 0',
            overflowX: 'auto',
            fontSize: '11px',
            lineHeight: '14px'
          }}
          {...props}
        >
          {children}
        </pre>
      );
    },
    
    // Headers
    h1: ({ children }: any) => (
      <h1 style={{
        fontSize: '16px',
        fontWeight: '500',
        marginBottom: '8px',
        marginTop: '16px',
        color: 'var(--text-primary)',
        lineHeight: '1.4',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '4px'
      }}>
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 style={{
        fontSize: '14px',
        fontWeight: '500',
        marginBottom: '6px',
        marginTop: '12px',
        color: 'var(--text-primary)',
        lineHeight: '1.4'
      }}>
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 style={{
        fontSize: '13px',
        fontWeight: '500',
        marginBottom: '4px',
        marginTop: '8px',
        color: 'var(--text-primary)',
        lineHeight: '1.4'
      }}>
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 style={{
        fontSize: '12px',
        fontWeight: '500',
        marginBottom: '4px',
        marginTop: '8px',
        color: 'var(--text-primary)',
        lineHeight: '1.4'
      }}>
        {children}
      </h4>
    ),
    
    // Paragraphs
    p: ({ children }: any) => (
      <p style={{
        marginBottom: '8px',
        lineHeight: '18px',
        color: 'var(--text-primary)',
        fontSize: '12px',
        fontFamily: '-apple-system, "system-ui", sans-serif'
      }}>
        {children}
      </p>
    ),
    
    // Lists
    ul: ({ children }: any) => (
      <ul style={{
        marginBottom: '8px',
        paddingLeft: '20px',
        color: 'var(--text-primary)',
        fontSize: '12px',
        lineHeight: '18px',
        fontFamily: '-apple-system, "system-ui", sans-serif'
      }}>
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol style={{
        marginBottom: '8px',
        paddingLeft: '20px',
        color: 'var(--text-primary)',
        fontSize: '12px',
        lineHeight: '18px',
        fontFamily: '-apple-system, "system-ui", sans-serif'
      }}>
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li style={{
        marginBottom: '2px',
        lineHeight: '18px',
        fontSize: '12px'
      }}>
        {children}
      </li>
    ),
    
    // Links
    a: ({ href, children }: any) => (
      <a
        href={href}
        style={{
          color: 'var(--text-accent)',
          textDecoration: 'underline',
          fontSize: '12px'
        }}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    
    // Emphasis
    strong: ({ children }: any) => (
      <strong style={{
        fontWeight: '500',
        color: 'var(--text-primary)',
        fontSize: '12px'
      }}>
        {children}
      </strong>
    ),
    em: ({ children }: any) => (
      <em style={{
        fontStyle: 'italic',
        color: 'var(--text-primary)',
        fontSize: '12px'
      }}>
        {children}
      </em>
    ),
    
    // Blockquotes
    blockquote: ({ children }: any) => (
      <blockquote style={{
        borderLeft: '2px solid var(--border-subtle)',
        paddingLeft: '12px',
        margin: '8px 0',
        fontStyle: 'italic',
        color: 'var(--text-secondary)',
        fontSize: '12px',
        lineHeight: '18px'
      }}>
        {children}
      </blockquote>
    ),
    
    // Tables
    table: ({ children }: any) => (
      <div style={{ overflowX: 'auto', margin: '8px 0' }}>
        <table style={{
          minWidth: '100%',
          border: '1px solid var(--border-subtle)',
          fontSize: '12px'
        }}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead style={{ backgroundColor: 'var(--surface-secondary)' }}>
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => (
      <tbody style={{ backgroundColor: 'var(--surface-primary)' }}>
        {children}
      </tbody>
    ),
    tr: ({ children }: any) => (
      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {children}
      </tr>
    ),
    th: ({ children }: any) => (
      <th style={{
        padding: '4px 8px',
        textAlign: 'left',
        fontWeight: '500',
        color: 'var(--text-primary)',
        fontSize: '12px'
      }}>
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td style={{
        padding: '4px 8px',
        color: 'var(--text-primary)',
        fontSize: '12px'
      }}>
        {children}
      </td>
    ),
    
    // Horizontal rule
    hr: () => (
      <hr style={{
        border: 'none',
        borderTop: '1px solid var(--border-subtle)',
        margin: '12px 0'
      }} />
    ),
  };
}

export function MarkdownRenderer({ content, className = '', metadata }: MarkdownRendererProps) {
  const renderedParts = parseToolBlocks(content, metadata);
  
  return (
    <div className={`markdown-content ${className}`}>
      {renderedParts}
    </div>
  );
}