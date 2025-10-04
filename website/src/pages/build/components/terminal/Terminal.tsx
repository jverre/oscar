import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  sessionId: string;
  baseUrl: string;
  previewToken: string;
}

export function Terminal({ sessionId, baseUrl, previewToken }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Create xterm instance with light theme matching the app
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: "'Martian Mono', ui-monospace, 'SF Mono', Monaco, 'Cascadia Code', Consolas, 'Courier New', monospace",
      theme: {
        background: '#ffffff',
        foreground: '#3f5142',
        cursor: '#7a9b7e',
        cursorAccent: '#ffffff',
        selection: 'rgba(184, 216, 186, 0.3)',
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
      rows: 30,
      cols: 80,
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    // Create WebSocket connection
    const wsUrl = baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(
      `${wsUrl}/ws?sessionId=${sessionId}&DAYTONA_SANDBOX_AUTH_KEY=${previewToken}`
    );

    ws.onopen = () => {
      setIsConnected(true);
      xterm.writeln('Connected to terminal...\r\n');
    };

    ws.onmessage = (event) => {
      xterm.write(event.data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      xterm.writeln('\r\n\r\nConnection closed.');
    };

    wsRef.current = ws;

    // Send input from xterm to WebSocket
    xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      xterm.dispose();
    };
  }, [sessionId, baseUrl, previewToken]);

  return (
    <div className="flex flex-col h-full bg-white border-t border-sage-green-200">
      <div className="flex items-center justify-between px-4 py-2 bg-cream-50 border-b border-sage-green-200">
        <span className="text-xs font-medium text-sage-green-800">Terminal</span>
        <span className={`text-xs ${isConnected ? 'text-sage-green-600' : 'text-muted-red-500'}`}>
          {isConnected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>

      <div ref={terminalRef} className="flex-1 p-2 bg-white" />
    </div>
  );
}
