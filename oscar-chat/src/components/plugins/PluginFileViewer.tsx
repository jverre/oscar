"use client";

import React, { useEffect, useState } from 'react';
import { useAction } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '../../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { Loader2, FileText, AlertCircle } from 'lucide-react';
import { useFileContext } from '@/components/providers/FileProvider';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface PluginFileViewerProps {
  pluginId: string;
  filePath: string;
  fileName: string;
  organizationId: string;
}

export const PluginFileViewer = ({ pluginId, filePath, fileName, organizationId }: PluginFileViewerProps) => {
  const { data: session } = useSession();
  const { getActiveTab } = useFileContext();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const getPluginFileContent = useAction(api.plugins.getPluginFileContent);

  useEffect(() => {
    const fetchFileContent = async () => {
      if (!session?.user?.id || !organizationId) {
        console.log("[PLUGIN_FILE_VIEWER] No user session or organization");
        setError("Authentication required");
        setLoading(false);
        return;
      }

      console.log("[PLUGIN_FILE_VIEWER] Fetching content for:", { pluginId, filePath, fileName });
      setLoading(true);
      setError(null);

      try {
        const result = await getPluginFileContent({
          pluginId: pluginId as Id<"plugins">,
          organizationId: organizationId as Id<"organizations">,
          userId: session.user.id as Id<"users">,
          filePath,
        });

        console.log("[PLUGIN_FILE_VIEWER] Result:", result);

        if (result.success && result.content !== undefined) {
          setContent(result.content);
          console.log("[PLUGIN_FILE_VIEWER] Content loaded, length:", result.content.length);
        } else {
          setError(result.error || "Failed to load file content");
          console.error("[PLUGIN_FILE_VIEWER] Error:", result.error);
        }
      } catch (err) {
        console.error("[PLUGIN_FILE_VIEWER] Exception:", err);
        setError("Failed to load plugin file content");
      } finally {
        setLoading(false);
      }
    };

    fetchFileContent();
  }, [pluginId, filePath, organizationId, session?.user?.id, getPluginFileContent]);

  // Get file extension for syntax highlighting
  const getFileExtension = (filename: string): string => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  // Map file extensions to language identifiers
  const getLanguage = (extension: string): string => {
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cc': 'cpp',
      'cxx': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'cs': 'csharp',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'fish': 'bash',
      'ps1': 'powershell',
      'sql': 'sql',
      'html': 'html',
      'htm': 'html',
      'xml': 'xml',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'ini': 'ini',
      'cfg': 'ini',
      'conf': 'ini',
      'md': 'markdown',
      'markdown': 'markdown',
      'tex': 'latex',
      'r': 'r',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'clj': 'clojure',
      'hs': 'haskell',
      'elm': 'elm',
      'dart': 'dart',
      'vue': 'vue',
      'svelte': 'svelte',
      'dockerfile': 'dockerfile',
      'makefile': 'makefile',
      'cmake': 'cmake',
      'gradle': 'gradle',
      'properties': 'properties',
      'env': 'bash',
      'gitignore': 'gitignore',
      'log': 'log',
    };
    
    return languageMap[extension] || 'text';
  };

  const fileExtension = getFileExtension(fileName);
  const language = getLanguage(fileExtension);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading {fileName}...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="h-5 w-5" />
          <div className="text-center">
            <div className="font-medium">Failed to load file</div>
            <div className="text-sm text-muted-foreground mt-1">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Custom style that matches the app's dark theme
  const customStyle = {
    ...vscDarkPlus,
    'pre[class*="language-"]': {
      ...vscDarkPlus['pre[class*="language-"]'],
      background: 'hsl(0 0% 10.2%)', // Using the app's card background
      color: 'hsl(216 13% 87%)', // Using the app's foreground color
      fontFamily: 'Geist Mono, ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: '13px',
      lineHeight: '1.5',
      margin: 0,
      padding: '1rem',
    },
    'code[class*="language-"]': {
      ...vscDarkPlus['code[class*="language-"]'],
      background: 'transparent',
      color: 'hsl(216 13% 87%)',
      fontFamily: 'Geist Mono, ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
      fontSize: '13px',
    },
  };

  return (
    <div className="h-full overflow-auto">
      {content ? (
        <SyntaxHighlighter
          language={language}
          style={customStyle}
          showLineNumbers={true}
          lineNumberStyle={{
            color: 'hsl(0 0% 50%)', // Muted color for line numbers
            paddingRight: '1rem',
            textAlign: 'right',
            userSelect: 'none',
            fontSize: '12px',
          }}
          customStyle={{
            margin: 0,
            background: 'hsl(0 0% 10.2%)',
            fontFamily: 'Geist Mono, ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
          }}
          codeTagProps={{
            style: {
              fontFamily: 'Geist Mono, ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            }
          }}
        >
          {content}
        </SyntaxHighlighter>
      ) : (
        <div className="p-4 text-sm text-muted-foreground font-mono">
          (empty file)
        </div>
      )}
    </div>
  );
};