import { useEffect, useState } from 'react'
import { Header } from './header/Header'

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
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-4xl mx-auto p-4">
        <div className="mb-8 border-b border-border pb-4">
          <h1 className="text-2xl font-mono font-semibold text-foreground">
            <span className="text-muted-foreground">$</span> {conversationId}
          </h1>
        </div>
        
        <div className="relative">
          <div className="w-px bg-border absolute top-0 left-2" style={{height: '100%'}} />
          <div className="pl-6">
            <div className="inline-flex items-center space-x-2 text-muted-foreground">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-mono">Syncing conversation{dots}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}