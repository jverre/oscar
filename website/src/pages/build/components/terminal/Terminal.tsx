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
  const [isConnected, setIsConnected] = useState(false);
  const fitAddonRef = useRef<FitAddon | null>(null);

  useEffect(() => {
    console.log('[Terminal] Effect running with:', { sessionId, baseUrl, previewToken: previewToken ? 'YES' : 'NO' });

    if (!terminalRef.current) {
      console.log('[Terminal] No terminal ref');
      return;
    }

    console.log('[Terminal] Creating terminal and WebSocket');

    // Create terminal
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

    try {
      const webglAddon = new WebglAddon();
      webglAddon.onContextLoss(() => webglAddon.dispose());
      xterm.loadAddon(webglAddon);
    } catch (e) {
      console.warn('[Terminal] WebGL addon failed to load', e);
    }

    fitAddonRef.current = fitAddon;

    // Only fit if terminal is visible
    if (!isCollapsed) {
      setTimeout(() => fitAddon.fit(), 0);
    }

    // Create WebSocket
    const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const wsUrlFull = `${wsUrl}/ws?sessionId=${sessionId}&DAYTONA_SANDBOX_AUTH_KEY=${previewToken}`;
    console.log('[Terminal] WebSocket URL:', wsUrlFull);

    const ws = new WebSocket(wsUrlFull);

    ws.onopen = () => {
      console.log('[Terminal] ✅ WebSocket CONNECTED');
      setIsConnected(true);
      xterm.writeln('Connected to terminal...\r\n');
    };

    ws.onmessage = (event) => {
      xterm.write(event.data);
    };

    ws.onerror = (error) => {
      console.error('[Terminal] ❌ WebSocket ERROR:', error);
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log('[Terminal] 🔌 WebSocket CLOSED - Code:', event.code, 'Reason:', event.reason);
      setIsConnected(false);
    };

    // Send input to WebSocket
    const dataDisposable = xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: xterm.cols, rows: xterm.rows }));
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      dataDisposable.dispose();
      ws.close();
      xterm.dispose();
    };
  }, [sessionId, baseUrl, previewToken]);

  // Handle fit when collapsed state changes
  useEffect(() => {
    if (!isCollapsed && fitAddonRef.current) {
      setTimeout(() => fitAddonRef.current?.fit(), 100);
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

      <div
        ref={terminalRef}
        className="flex-1 w-full overflow-hidden"
        style={{ display: isCollapsed ? 'none' : 'block' }}
      />
    </div>
  );
}
