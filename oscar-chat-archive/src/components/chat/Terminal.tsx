'use client';

import React from 'react';

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
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Placeholder for Modal sandbox terminal */}
      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
          <div className="text-2xl mb-4">🚧</div>
          <div className="text-lg mb-2">Terminal Implementation</div>
          <div className="text-sm">Modal sandbox integration coming soon...</div>
        </div>
      </div>
    </div>
  );
}