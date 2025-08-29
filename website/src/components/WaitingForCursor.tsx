import { useEffect, useState } from 'react'

interface WaitingForCursorProps {
  conversationId: string
}

export function WaitingForCursor({ conversationId }: WaitingForCursorProps) {
  const [dots, setDots] = useState('')
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    
    return () => clearInterval(interval)
  }, [])
  
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-zinc-900 rounded-lg shadow-2xl overflow-hidden border border-zinc-800">
          <div className="bg-zinc-800 px-4 py-2 flex items-center space-x-2">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1 text-center text-sm text-zinc-400 font-mono">
              Waiting for Cursor
            </div>
          </div>
          <div className="p-8 font-mono text-sm">
            <pre className="text-green-400 text-center mb-6">
{`     ___                            
    / _ \\   ___   ___   __ _  _ __ 
   | | | | / __| / __| / _\` || '__|
   | |_| | \\__ \\| (__ | (_| || |   
    \\___/  |___/ \\___| \\__,_||_|   `}
            </pre>
            
            <div className="text-center space-y-4">
              <div className="text-zinc-400">
                <span className="text-green-400">~</span>
                <span className="text-zinc-500"> $ </span>
                <span>Waiting for Cursor to upload conversation{dots}</span>
              </div>
              
              <div className="text-zinc-500 text-xs">
                Chat ID: <span className="text-cyan-400">{conversationId}</span>
              </div>
              
              <div className="mt-8">
                <div className="inline-flex items-center space-x-2 text-zinc-600">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="text-sm">Processing conversation data</span>
                </div>
              </div>
              
              <div className="mt-8 pt-4 border-t border-zinc-700">
                <p className="text-zinc-500 text-xs">
                  This page will automatically update when the conversation is ready.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}