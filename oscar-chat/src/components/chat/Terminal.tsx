'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  websocketUrl?: string;
  authToken?: string;
  className?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export function Terminal({ 
  websocketUrl, 
  authToken,
  className = '', 
  onConnect,
  onDisconnect,
  onError 
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    // Create terminal instance
    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#ffffff20',
        black: '#000000',
        red: '#ff6b6b',
        green: '#51cf66',
        yellow: '#ffd43b',
        blue: '#339af0',
        magenta: '#f06595',
        cyan: '#22b8cf',
        white: '#ffffff',
        brightBlack: '#495057',
        brightRed: '#ff8787',
        brightGreen: '#69db7c',
        brightYellow: '#ffe066',
        brightBlue: '#4dabf7',
        brightMagenta: '#f783ac',
        brightCyan: '#3bc9db',
        brightWhite: '#f8f9fa'
      },
      allowTransparency: true,
      convertEol: true,
      scrollback: 1000,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    
    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    // Open terminal
    terminal.open(terminalRef.current);
    
    // Wait for next tick to ensure DOM is ready, then fit
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (error) {
        console.warn('Failed to fit terminal on initialization:', error);
        // Retry after a short delay
        setTimeout(() => {
          try {
            fitAddon.fit();
          } catch (retryError) {
            console.error('Failed to fit terminal after retry:', retryError);
          }
        }, 100);
      }
    }, 0);

    // Store references
    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle terminal input
    terminal.onData((data) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      }
    });

    // Handle terminal resize
    terminal.onResize((size) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'resize',
          cols: size.cols,
          rows: size.rows
        }));
      }
    });

    // Handle window resize
    const handleResize = () => {
      try {
        if (fitAddonRef.current && xtermRef.current) {
          fitAddonRef.current.fit();
        }
      } catch (error) {
        console.warn('Failed to fit terminal on resize:', error);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      terminal.dispose();
    };
  }, []);

  // Connect to WebSocket
  const connect = React.useCallback(() => {
    if (!websocketUrl || !xtermRef.current) return;

    setConnectionStatus('connecting');

    try {
      // Add auth token to WebSocket URL if provided
      let wsUrl = websocketUrl;
      if (authToken) {
        const url = new URL(websocketUrl);
        url.searchParams.set('DAYTONA_SANDBOX_AUTH_KEY', authToken);
        wsUrl = url.toString();
      }
      
      console.log('Attempting WebSocket connection to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        onConnect?.();

        // Send initial terminal size
        if (xtermRef.current) {
          ws.send(JSON.stringify({
            type: 'resize',
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'output' && xtermRef.current) {
            xtermRef.current.write(message.data);
          } else if (message.type === 'exit' && xtermRef.current) {
            xtermRef.current.write('\r\n\r\n[Process exited]');
            setConnectionStatus('disconnected');
            onDisconnect?.();
          } else if (message.type === 'connected') {
            // Connection confirmed
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        onDisconnect?.();
        attemptReconnect();
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        const wsError = new Error('WebSocket connection failed');
        onError?.(wsError);
        setConnectionStatus('disconnected');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      const connectionError = error instanceof Error ? error : new Error('Connection failed');
      onError?.(connectionError);
      setConnectionStatus('disconnected');
    }
  }, [websocketUrl, authToken, onConnect, onDisconnect, onError]);

  // Attempt reconnection
  const attemptReconnect = React.useCallback(() => {
    if (reconnectAttempts < maxReconnectAttempts) {
      const newAttempts = reconnectAttempts + 1;
      setReconnectAttempts(newAttempts);
      
      setTimeout(() => {
        connect();
      }, 1000 * newAttempts); // Exponential backoff
    } else {
      if (xtermRef.current) {
        xtermRef.current.write('\r\n\r\n[Connection failed. Please refresh to retry.]');
      }
    }
  }, [reconnectAttempts, connect]);

  // Connect when websocketUrl changes
  useEffect(() => {
    if (websocketUrl) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [websocketUrl, authToken, connect]);

  // Connection status indicator
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'disconnected': return 'Disconnected';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Connection status indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2 px-2 py-1 bg-black/50 rounded text-xs text-white">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        {getStatusText()}
        {reconnectAttempts > 0 && (
          <span className="text-yellow-400">
            (Attempt {reconnectAttempts}/{maxReconnectAttempts})
          </span>
        )}
      </div>

      {/* Terminal container */}
      <div 
        ref={terminalRef} 
        className="w-full h-full"
        style={{
          background: '#1a1a1a'
        }}
      />
    </div>
  );
}