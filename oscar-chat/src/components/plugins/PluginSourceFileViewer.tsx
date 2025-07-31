"use client";

import React, { useEffect, useState, useRef } from 'react';
import { AlertCircle, FileText, Loader2 } from 'lucide-react';
import { useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface PluginSourceFileViewerProps {
  pluginId: string;
  filePath: string;
  organizationId: Id<"organizations">;
}

export const PluginSourceFileViewer = ({ pluginId, filePath, organizationId }: PluginSourceFileViewerProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [metadata, setMetadata] = useState<any>(null);
  const fetchPluginFile = useAction(api.plugins.fetchPluginFile);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadFile = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const result = await fetchPluginFile({
          pluginId: pluginId as any,
          filePath,
          organizationId,
        });
        
        if (!result.success) {
          setError(result.error || "Failed to load file");
        } else {
          setContent(result.content || "");
          setMetadata(result.metadata || null);
        }
      } catch (err) {
        console.error("Failed to load plugin file:", err);
        setError("Failed to load plugin file");
      } finally {
        setIsLoading(false);
      }
    };

    loadFile();
  }, [pluginId, filePath, organizationId, fetchPluginFile]);

  // Sync vertical scrolling between line numbers and content
  const handleContentScroll = () => {
    if (contentScrollRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = contentScrollRef.current.scrollTop;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading file...</p>
          <p className="text-xs text-muted-foreground mt-1">{filePath}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-orange-500">
          <AlertCircle className="h-5 w-5" />
          <div className="text-center">
            <div className="font-medium">Error Loading File</div>
            <div className="text-sm text-muted-foreground mt-1">{error}</div>
            <div className="text-xs text-muted-foreground mt-1">{filePath}</div>
          </div>
        </div>
      </div>
    );
  }

  // Get file extension and language for syntax highlighting
  const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
  const getLanguage = (ext: string): string => {
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'json': 'json',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'html': 'html',
      'xml': 'xml',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'rs': 'rust',
      'go': 'go',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'sql': 'sql',
      'sh': 'bash',
      'bash': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
      'md': 'markdown',
      'dockerfile': 'docker'
    };
    return languageMap[ext] || 'text';
  };
  
  const language = getLanguage(fileExtension);
  const isCodeFile = language !== 'text';

  // Split content into lines for line numbering
  const lines = content.split('\n');
  const lineCountWidth = Math.max(3, String(lines.length).length);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* File content */}
      <div className="flex-1 flex bg-background overflow-hidden">
        {metadata?.isImage ? (
          <div className="p-4 text-center w-full overflow-auto">
            <p className="text-sm text-muted-foreground mb-2">Image file preview not available</p>
            <pre className="text-xs text-left max-w-2xl mx-auto font-mono">{content}</pre>
          </div>
        ) : (
          <>
            {/* Line numbers - only vertical scroll, synced */}
            <div 
              ref={lineNumbersRef}
              className="flex-shrink-0 text-right text-xs font-mono select-none pr-4 pl-2 overflow-hidden" 
              style={{ color: '#858585' }}
            >
              {lines.map((_, index) => (
                <div
                  key={index}
                  className="leading-5 h-5"
                  style={{ minWidth: `${lineCountWidth * 0.6 + 1}rem` }}
                >
                  {index + 1}
                </div>
              ))}
            </div>
            
            {/* Code content - both horizontal and vertical scroll */}
            <div 
              ref={contentScrollRef}
              className="flex-1 overflow-auto"
              onScroll={handleContentScroll}
            >
              {isCodeFile ? (
                <SyntaxHighlighter
                  language={language}
                  style={vscDarkPlus}
                  customStyle={{
                    margin: 0,
                    padding: 0,
                    background: 'transparent',
                    fontSize: '12px',
                    lineHeight: '20px',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                  }}
                  codeTagProps={{
                    style: {
                      fontSize: '12px',
                      lineHeight: '20px',
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                    }
                  }}
                  showLineNumbers={false}
                  wrapLines={false}
                >
                  {content}
                </SyntaxHighlighter>
              ) : (
                <div className="text-xs font-mono text-foreground leading-5">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="leading-5 h-5 whitespace-pre"
                    >
                      {line || ' '}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};