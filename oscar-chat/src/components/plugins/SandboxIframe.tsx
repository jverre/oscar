import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useSandbox } from '@/hooks/useSandbox';
import { PluginHost } from './PluginHost';

interface SandboxIframeProps {
  pluginId: string | undefined;
  className?: string;
}

export function SandboxIframe({ pluginId, className = '' }: SandboxIframeProps) {
  const { status, url, error } = useSandbox(pluginId);

  const handlePluginMessage = (message: any) => {
    console.log('Plugin message:', message);
    // Handle plugin events here if needed
  };

  if (status === 'creating') {
    return (
      <div className={`h-full w-full bg-background border border-border rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Creating sandbox...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className={`h-full w-full bg-background border border-border rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            {error || 'Failed to create sandbox'}
          </p>
          <Button
            onClick={() => window.location.reload()}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'active' && url) {
    return (
      <div className={`h-full w-full bg-background border border-border rounded-lg overflow-hidden ${className}`}>
        <PluginHost 
          url={url}
          pluginId={pluginId}
          onMessage={handlePluginMessage}
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className={`h-full w-full bg-background border border-border rounded-lg flex items-center justify-center ${className}`}>
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Loading sandbox...</p>
      </div>
    </div>
  );
} 