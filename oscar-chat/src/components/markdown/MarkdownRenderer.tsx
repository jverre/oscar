"use client";

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeHighlight, { detect: true, ignoreMissing: true }],
          rehypeRaw
        ]}
        components={{
          // Code blocks and inline code
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !match;
            
            if (isInline) {
              return (
                <code 
                  className="bg-gray-700/40 text-gray-300 px-1 py-0.5 rounded text-xs font-mono"
                  style={{ 
                    display: 'inline !important', 
                    verticalAlign: 'baseline',
                    whiteSpace: 'nowrap',
                    margin: '0',
                    padding: '2px 4px'
                  }}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre({ children, ...props }) {
            return (
              <pre className="bg-gray-800/40 rounded-sm overflow-x-auto my-3 p-3" {...props}>
                {children}
              </pre>
            );
          },
          
          // Headers
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 text-white border-b border-gray-700 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-2 mt-4 text-white">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mb-2 mt-3 text-white">
              {children}
            </h4>
          ),
          
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-4 leading-relaxed text-gray-200">
              {children}
            </p>
          ),
          
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-1 text-gray-200">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-200">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="ml-2">
              {children}
            </li>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-400 hover:text-blue-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          
          // Emphasis
          strong: ({ children }) => (
            <strong className="font-bold text-white">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="italic text-gray-200">
              {children}
            </em>
          ),
          
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-gray-600 pl-4 my-4 italic text-gray-300 bg-gray-800/50 py-2">
              {children}
            </blockquote>
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-gray-700">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-gray-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="bg-gray-900">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="border-b border-gray-700">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left font-semibold text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-gray-200">
              {children}
            </td>
          ),
          
          // Horizontal rule
          hr: () => (
            <hr className="border-gray-600 my-6" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}