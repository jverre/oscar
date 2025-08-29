import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_404')({
  component: NotFoundPage,
})

export function NotFoundPage() {
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
              404 - Not Found
            </div>
          </div>
          <div className="p-6 font-mono text-sm">
            <div className="text-zinc-400 mb-2">
              <span className="text-green-400">~</span>
              <span className="text-zinc-500"> $ </span>
              <span>curl https://oscar.dev</span>
              <span className="text-zinc-400">{typeof window !== 'undefined' ? window.location.pathname : '/unknown-path'}</span>
            </div>
            <div className="text-red-400 mb-4">
              Error: 404 - Resource not found
            </div>
            <div className="border-t border-zinc-700 pt-4 mt-4">
              <a 
                href="/" 
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 text-sm"
              >
                # Navigate back to safety
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}