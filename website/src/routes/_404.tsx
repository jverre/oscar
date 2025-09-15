import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_404')({
  component: NotFoundPage,
})

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-gray-900">404</h1>
            <p className="text-2xl text-gray-600">Humm, nothing to see here</p>
          </div>
          
          <div className="space-y-4">
            <a 
              href="/" 
              className="inline-flex items-center px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors font-medium"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}