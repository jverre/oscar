"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { ToolCall } from '../ui/tool-call';
import { normalizeContent, type StructuredContent } from '@/utils/contentUtils';

interface MarkdownRendererProps {
  content: StructuredContent;
  className?: string;
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

function parseStructuredContent(content: Array<{type: string, text?: string, toolCallId?: string, toolName?: string, args?: any, result?: any, isError?: boolean}>): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let keyCounter = 0;
  
  // Only render text content - tool calls are handled by ToolInteractionGroup
  content.forEach(part => {
    if (part.type === 'text' && part.text) {
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
          {part.text}
        </ReactMarkdown>
      );
    }
    // Tool calls and results are handled by ToolInteractionGroup component
  });
  
  return parts;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const normalizedContent = normalizeContent(content);
  const renderedParts = parseStructuredContent(normalizedContent);
  
  return (
    <div className={`markdown-content ${className}`}>
      {renderedParts}
    </div>
  );
}