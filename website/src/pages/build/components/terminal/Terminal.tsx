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

    // Create xterm instance
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#000000',
        foreground: '#ffffff',
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
    <div className="flex flex-col h-full bg-black">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <span className="text-xs text-gray-300">Terminal</span>
        <span className={`text-xs ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
          {isConnected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>

      <div ref={terminalRef} className="flex-1 p-2" />
    </div>
  );
}
