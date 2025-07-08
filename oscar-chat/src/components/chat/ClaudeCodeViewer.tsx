'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Loader2, Terminal, AlertCircle } from 'lucide-react';

interface ClaudeCodeViewerProps {
  userId: string;
  fileId: Id<"files">;
}

export function ClaudeCodeViewer({ userId, fileId }: ClaudeCodeViewerProps) {
  const fileData = useQuery(api.files.get, { fileId });
  const [terminalLoaded, setTerminalLoaded] = useState(false);

  const metadata = fileData?.metadata as { 
    state?: "pending" | "ready" | "error"; 
    terminalUrl?: string; 
    error?: string;
  } | undefined;

  const handleIframeLoad = () => {
    setTerminalLoaded(true);
  };

  if (!fileData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  if (metadata?.state === "error") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto" />
          <div className="text-xl font-medium text-foreground">Session Creation Failed</div>
          <div className="text-muted-foreground">
            Failed to create the terminal sandbox. Please try creating a new session.
          </div>
          {metadata.error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded border">
              Error: {metadata.error}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (metadata?.state === "pending") {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <Terminal className="h-16 w-16 text-blue-500 mx-auto" />
            <Loader2 className="h-6 w-6 text-blue-500 animate-spin absolute -top-1 -right-1" />
          </div>
          <div className="text-xl font-medium text-foreground">Creating Terminal Session</div>
          <div className="text-muted-foreground">
            Setting up your sandbox environment...
          </div>
          <div className="text-sm text-muted-foreground">
            This usually takes about 10 seconds
          </div>
        </div>
      </div>
    );
  }

  if (metadata?.state === "ready" && metadata.terminalUrl) {
    return (
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 relative">
          {!terminalLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-background">
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading terminal...</span>
              </div>
            </div>
          )}
          <iframe
            src={metadata.terminalUrl}
            className="w-full h-full border-0"
            onLoad={handleIframeLoad}
            title="Claude Code Terminal"
            allow="fullscreen"
            style={{ 
              opacity: terminalLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out'
            }}
          />
        </div>
      </div>
    );
  }

  // Fallback for unknown state
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Terminal className="h-16 w-16 text-muted-foreground mx-auto" />
        <div className="text-xl font-medium text-foreground">Claude Code Session</div>
        <div className="text-muted-foreground">
          Session state unknown. Please refresh the page.
        </div>
      </div>
    </div>
  );
}