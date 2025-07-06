"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Terminal, Loader2, AlertCircle, ExternalLink, RefreshCw } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface ClaudeCodeViewerProps {
  userId: Id<"users">;
}

// Helper function to create authenticated preview URL using proxy
function getAuthenticatedPreviewUrl(session: any, authToken: string | null): string {
  if (!session.previewUrl || !session._id || !authToken) return '';
  
  // Use our proxy endpoint with the session ID and auth token
  return `/api/daytona-proxy?sessionId=${session._id}&token=${encodeURIComponent(authToken)}`;
}

export function ClaudeCodeViewer({ userId }: ClaudeCodeViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get auth token for proxy authentication
  const authToken = useAuthToken();

  // Query for active Claude Code session
  const activeSession = useQuery(api.claudeSessions.getActiveSession, { userId });
  const allSessions = useQuery(api.claudeSessions.getUserSessions, { userId });

  // Mutations
  const startSession = useMutation(api.claudeSessions.startClaudeCodeSession);
  const stopSession = useMutation(api.claudeSessions.stopClaudeCodeSession);

  const handleStartSession = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await startSession({ userId });
      console.log('Session started:', result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopSession = async (sessionId: Id<"claudeSessions">) => {
    try {
      await stopSession({ sessionId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop session');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="bg-green-500">Running</Badge>;
      case 'starting':
        return <Badge variant="secondary">Starting</Badge>;
      case 'stopped':
        return <Badge variant="outline">Stopped</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Show loading state while queries are loading
  if (activeSession === undefined || allSessions === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Claude Code Sessions</h2>
        </div>
        
        {!activeSession && (
          <Button 
            onClick={handleStartSession}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Terminal className="h-4 w-4" />
            )}
            <span>Start Session</span>
          </Button>
        )}
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Session */}
      {activeSession && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <span>Active Session</span>
                  {getStatusBadge(activeSession.status)}
                </CardTitle>
                <CardDescription>
                  Created: {formatTimestamp(activeSession.createdAt)}
                </CardDescription>
              </div>
              <div className="flex space-x-2">
                {activeSession.previewUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(activeSession.previewUrl!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStopSession(activeSession._id)}
                >
                  Stop
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {activeSession.previewUrl && activeSession.status === 'running' && (
            <CardContent>
              <div className="w-full h-96 border rounded-lg overflow-hidden">
                <iframe
                  src={getAuthenticatedPreviewUrl(activeSession, authToken)}
                  className="w-full h-full"
                  title="Claude Code Web Terminal"
                  sandbox="allow-same-origin allow-scripts allow-forms"
                />
              </div>
            </CardContent>
          )}

          {activeSession.status === 'starting' && (
            <CardContent>
              <div className="flex items-center justify-center h-32 text-gray-500">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Starting Claude Code session...</span>
                </div>
              </div>
            </CardContent>
          )}

          {activeSession.status === 'error' && activeSession.metadata?.error && (
            <CardContent>
              <div className="flex items-center space-x-2 text-red-700 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{activeSession.metadata.error}</span>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Session History */}
      {allSessions && allSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>Previous Claude Code sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allSessions.slice(0, 5).map((session) => (
                <div
                  key={session._id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Terminal className="h-4 w-4 text-gray-500" />
                    <div>
                      <div className="text-sm font-medium">
                        Session {session.sessionId}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatTimestamp(session.createdAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(session.status)}
                    {session.previewUrl && session.status === 'running' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(session.previewUrl!, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!activeSession && (!allSessions || allSessions.length === 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Terminal className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Claude Code Sessions
              </h3>
              <p className="text-gray-500 mb-4">
                Start your first Claude Code session to access the web terminal interface.
              </p>
              <Button onClick={handleStartSession} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Terminal className="h-4 w-4 mr-2" />
                )}
                Start Claude Code Session
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}