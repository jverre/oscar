import React, { useRef, useEffect } from 'react';

interface PluginMessage {
  type: 'PLUGIN_READY' | 'PLUGIN_EVENT' | 'PLUGIN_CLOSE' | 'SAVE_MESSAGE' | 'UPDATE_MESSAGE';
  payload?: any;
}

interface HostMessage {
  type: 'INIT' | 'UPDATE' | 'COMMAND' | 'FILE_MESSAGES' | 'MESSAGE_SAVED' | 'MESSAGE_ERROR';
  payload?: any;
}

// Helper functions for message serialization
function serializeMessage(message: any): ArrayBuffer {
  const encoder = new TextEncoder();
  const uint8Array = encoder.encode(JSON.stringify(message));
  return uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength) as ArrayBuffer;
}

function deserializeMessage(bytes: ArrayBuffer): any {
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(new Uint8Array(bytes)));
}

interface PluginHostProps {
  url: string;
  pluginId?: string;
  fileId?: string;
  initialData?: any;
  fileMessages?: ArrayBuffer[];
  onMessage?: (message: PluginMessage) => void;
  onSaveMessage?: (message: any) => Promise<void>;
  onUpdateMessage?: (messageId: string, message: any) => Promise<void>;
  className?: string;
}

export function PluginHost({ 
  url, 
  pluginId, 
  fileId,
  initialData, 
  fileMessages = [],
  onMessage, 
  onSaveMessage,
  onUpdateMessage,
  className = 'w-full h-full' 
}: PluginHostProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Basic origin validation - in production you might want stricter validation
      if (!event.data || typeof event.data !== 'object') return;

      const message = event.data as PluginMessage;

      switch (message.type) {
        case 'PLUGIN_READY':
          // Send initial data and file messages to the plugin
          if (iframeRef.current?.contentWindow) {
            const initMessage: HostMessage = {
              type: 'INIT',
              payload: {
                pluginId,
                fileId,
                ...initialData
              }
            };
            iframeRef.current.contentWindow.postMessage(initMessage, '*');
            
            // Send file message if available
            if (fileMessages.length > 0) {
              const latestMessage = deserializeMessage(fileMessages[0]);
              const fileMessagesMessage: HostMessage = {
                type: 'FILE_MESSAGES',
                payload: {
                  fileId,
                  latestMessage: latestMessage
                }
              };
              iframeRef.current.contentWindow.postMessage(fileMessagesMessage, '*');
            }
          }
          break;

        case 'SAVE_MESSAGE':
          if (onSaveMessage && message.payload) {
            try {
              await onSaveMessage(message.payload);
              // Send success confirmation
              if (iframeRef.current?.contentWindow) {
                const successMessage: HostMessage = {
                  type: 'MESSAGE_SAVED',
                  payload: { success: true }
                };
                iframeRef.current.contentWindow.postMessage(successMessage, '*');
              }
            } catch (error) {
              // Send error message
              if (iframeRef.current?.contentWindow) {
                const errorMessage: HostMessage = {
                  type: 'MESSAGE_ERROR',
                  payload: { error: error instanceof Error ? error.message : 'Unknown error' }
                };
                iframeRef.current.contentWindow.postMessage(errorMessage, '*');
              }
            }
          }
          break;

        case 'UPDATE_MESSAGE':
          if (onUpdateMessage && message.payload) {
            try {
              await onUpdateMessage(message.payload.messageId, message.payload.message);
              // Send success confirmation
              if (iframeRef.current?.contentWindow) {
                const successMessage: HostMessage = {
                  type: 'MESSAGE_SAVED',
                  payload: { success: true }
                };
                iframeRef.current.contentWindow.postMessage(successMessage, '*');
              }
            } catch (error) {
              // Send error message
              if (iframeRef.current?.contentWindow) {
                const errorMessage: HostMessage = {
                  type: 'MESSAGE_ERROR',
                  payload: { error: error instanceof Error ? error.message : 'Unknown error' }
                };
                iframeRef.current.contentWindow.postMessage(errorMessage, '*');
              }
            }
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
  }, [pluginId, fileId, initialData, fileMessages, onMessage, onSaveMessage, onUpdateMessage]);

  const sendMessage = (message: HostMessage) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  };

  const sendFileMessages = (messages: ArrayBuffer[]) => {
    if (iframeRef.current?.contentWindow && messages.length > 0) {
      const latestMessage = deserializeMessage(messages[0]);
      const fileMessagesMessage: HostMessage = {
        type: 'FILE_MESSAGES',
        payload: {
          fileId,
          latestMessage: latestMessage
        }
      };
      iframeRef.current.contentWindow.postMessage(fileMessagesMessage, '*');
    }
  };

  // Expose methods for parent components
  useEffect(() => {
    if (iframeRef.current) {
      (iframeRef.current as any).sendMessage = sendMessage;
      (iframeRef.current as any).sendFileMessages = sendFileMessages;
    }
  }, [fileId]);

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