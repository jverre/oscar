import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/Header'
import { DemoAnimation } from '@/components/DemoAnimation'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {/* <Header /> */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 -mt-24">
            <h1 className="text-5xl font-bold text-gray-900">Oscar</h1>
            <div className="space-y-8">
              <p className="text-xl text-gray-600">Turn your AI conversations into shareable links</p>
              <div className="flex justify-start">
                <a 
                  href="cursor://anysphere.cursor-deeplink/mcp/install?name=oscar&config=eyJjb21tYW5kIjoibnB4IEBqdmVycmUvb3NjYXIifQ%3D%3D" 
                  className="inline-flex items-center px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors font-medium"
                >
                  Download for Cursor →
                </a>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <DemoAnimation />
          </div>
        </div>
      </div>
    </div>
  )
}
