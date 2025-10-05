import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebglAddon } from '@xterm/addon-webgl';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  sessionId: string;
  baseUrl: string;
  previewToken: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Terminal({ sessionId, baseUrl, previewToken, isCollapsed, onToggleCollapse }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "'Martian Mono', ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', Consolas, 'Courier New', monospace",
      allowTransparency: false,
      theme: {
        background: '#ffffff',
        foreground: '#3f5142',
        cursor: '#7a9b7e',
        cursorAccent: '#ffffff',
        selectionBackground: '#b8d8ba',
        selectionForeground: '#2f3d31',
        selectionInactiveBackground: 'rgba(184, 216, 186, 0.5)',
        black: '#2f3d31',
        red: '#d85555',
        green: '#7a9b7e',
        yellow: '#a7a275',
        blue: '#628066',
        magenta: '#95905e',
        cyan: '#9bc69f',
        white: '#d6d4c1',
        brightBlack: '#625e3e',
        brightRed: '#ef959d',
        brightGreen: '#b8d8ba',
        brightYellow: '#d9dbbc',
        brightBlue: '#7c774e',
        brightMagenta: '#b6b18e',
        brightCyan: '#d1ddd3',
        brightWhite: '#f4f4f0',
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(terminalRef.current);

    // Load WebGL addon for better rendering and selection support
    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => {
        webglAddon.dispose();
      });
      xterm.loadAddon(webglAddon);
    } catch (e) {
      console.warn('[Terminal] WebGL addon failed to load, using canvas renderer', e);
    }

    // Use setTimeout to ensure the terminal is fully mounted before fitting
    setTimeout(() => {
      fitAddon.fit();
    }, 0);

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Handle window resize
    const handleResize = () => {
      if (fitAddonRef.current && xtermRef.current) {
        fitAddonRef.current.fit();

        // Send new dimensions to backend
        const dims = {
          cols: xtermRef.current.cols,
          rows: xtermRef.current.rows
        };

        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'resize', ...dims }));
        }
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      console.log('[Terminal] Component unmounting - disposing xterm');
      window.removeEventListener('resize', handleResize);
      if (xtermRef.current) {
        xtermRef.current.dispose();
        xtermRef.current = null;
      }
      fitAddonRef.current = null;
    };
  }, []);

  // Separate effect for WebSocket connection
  useEffect(() => {
    if (!xtermRef.current) return;

    const xterm = xtermRef.current;

    // Create WebSocket connection
    const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const wsUrlWithParams = `${wsUrl}/ws?sessionId=${sessionId}&DAYTONA_SANDBOX_AUTH_KEY=${previewToken}`;

    console.log('[Terminal] Connecting to WebSocket:', wsUrlWithParams);
    const ws = new WebSocket(wsUrlWithParams);

    ws.onopen = () => {
      console.log('[Terminal] WebSocket connected for session:', sessionId);
      setIsConnected(true);
      xterm.writeln('Connected to terminal...\r\n');
    };

    ws.onmessage = (event) => {
      console.log('[Terminal] Received message:', event.data.substring(0, 50));
      xterm.write(event.data);

      // Auto-scroll to bottom when receiving new data (only if user is near bottom)
      const isNearBottom = xterm.buffer.active.baseY + xterm.rows >= xterm.buffer.active.length - 1;
      if (isNearBottom) {
        xterm.scrollToBottom();
      }
    };

    ws.onerror = (error) => {
      console.error('[Terminal] WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log('[Terminal] WebSocket closed:', event.code, event.reason);
      setIsConnected(false);
      xterm.writeln('\r\n\r\nConnection closed.');
    };

    wsRef.current = ws;

    // Send input from xterm to WebSocket
    const dataDisposable = xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    return () => {
      console.log('[Terminal] WebSocket cleanup for session:', sessionId);
      dataDisposable.dispose();

      // Close WebSocket if it's open or connecting
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        console.log('[Terminal] Closing WebSocket for session:', sessionId);
        ws.close();
      }
    };
  }, [sessionId, baseUrl, previewToken]);

  // Handle terminal resize when collapsed state changes
  useEffect(() => {
    if (!isCollapsed && fitAddonRef.current && xtermRef.current) {
      // Wait for DOM to update before fitting
      setTimeout(() => {
        fitAddonRef.current?.fit();

        // Send new dimensions to backend
        if (xtermRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
          const dims = {
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows
          };
          wsRef.current.send(JSON.stringify({ type: 'resize', ...dims }));
        }
      }, 100);
    }
  }, [isCollapsed]);

  return (
    <div className="flex flex-col h-full w-full bg-white border-t border-sage-green-200">
      <div className="flex items-center justify-between px-4 py-2 bg-cream-50 border-b border-sage-green-200 flex-shrink-0">
        <span className="text-xs font-medium text-sage-green-800">Terminal</span>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${isConnected ? 'text-sage-green-600' : 'text-muted-red-500'}`}>
            {isConnected ? '● Connected' : '○ Disconnected'}
          </span>
          <button
            onClick={onToggleCollapse}
            className="text-sage-green-600 hover:text-sage-green-800 transition-colors"
            aria-label={isCollapsed ? 'Expand terminal' : 'Collapse terminal'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              {isCollapsed ? (
                <>
                  <line x1="8" y1="4" x2="8" y2="12" />
                  <line x1="4" y1="8" x2="12" y2="8" />
                </>
              ) : (
                <line x1="4" y1="8" x2="12" y2="8" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div ref={terminalRef} className="flex-1 w-full overflow-hidden" />
      )}
    </div>
  );
}
