import React, { useRef, useEffect } from 'react';

interface PluginMessage {
  type: 'PLUGIN_READY' | 'PLUGIN_EVENT' | 'PLUGIN_CLOSE';
  payload?: any;
}

interface HostMessage {
  type: 'INIT' | 'UPDATE' | 'COMMAND';
  payload?: any;
}

interface PluginHostProps {
  url: string;
  pluginId?: string;
  initialData?: any;
  onMessage?: (message: PluginMessage) => void;
  className?: string;
}

export function PluginHost({ 
  url, 
  pluginId, 
  initialData, 
  onMessage, 
  className = 'w-full h-full' 
}: PluginHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Basic origin validation - in production you might want stricter validation
      if (!event.data || typeof event.data !== 'object') return;

      const message = event.data as PluginMessage;

      switch (message.type) {
        case 'PLUGIN_READY':
          // Send initial data to the plugin
          if (iframeRef.current?.contentWindow) {
            const initMessage: HostMessage = {
              type: 'INIT',
              payload: {
                pluginId,
                ...initialData
              }
            };
            iframeRef.current.contentWindow.postMessage(initMessage, '*');
          }
          break;

        case 'PLUGIN_EVENT':
        case 'PLUGIN_CLOSE':
          onMessage?.(message);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pluginId, initialData, onMessage]);

  const sendMessage = (message: HostMessage) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  };

  // Expose sendMessage for parent components
  useEffect(() => {
    (iframeRef.current as any)?.sendMessage?.(sendMessage);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={url}
      className={className}
      sandbox="allow-scripts allow-same-origin allow-forms"
      title="Plugin"
      style={{ border: 'none' }}
    />
  );
}