import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { CursorAnimation } from '@/components/CursorAnimation'
import { ClaudeCodeAnimation } from '@/components/ClaudeCodeAnimation'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [selectedPlatform, setSelectedPlatform] = useState<'cursor' | 'claude-code'>('cursor')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isAutoCycling, setIsAutoCycling] = useState(true)

  const platforms = {
    cursor: {
      name: 'Cursor',
      url: 'cursor://anysphere.cursor-deeplink/mcp/install?name=oscar&config=eyJjb21tYW5kIjoibnB4IEBqdmVycmUvb3NjYXIifQ%3D%3D',
      buttonText: 'Download for Cursor →'
    },
    'claude-code': {
      name: 'Claude Code',
      url: '#',
      buttonText: '$ claude mcp add oscar -- npx -y @jverre/oscar'
    }
  }

  // Auto-cycle between platforms every 8 seconds
  useEffect(() => {
    if (!isAutoCycling) return

    const cycleInterval = setInterval(() => {
      setSelectedPlatform(current => current === 'cursor' ? 'claude-code' : 'cursor')
    }, 8000)

    return () => clearInterval(cycleInterval)
  }, [isAutoCycling])

  // Handle manual platform selection
  const handlePlatformSelect = (platform: 'cursor' | 'claude-code') => {
    setSelectedPlatform(platform)
    setIsAutoCycling(false) // Stop auto-cycling when user makes manual selection
    setIsDropdownOpen(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      {/* <Header /> */}
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 -mt-24">
            <h1 className="text-5xl font-bold text-gray-900">Oscar</h1>
            <div className="space-y-8">
              <p className="text-xl text-gray-600">
                Public links for your{' '}
                <span className="relative inline-block">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="text-gray-900 border-b border-gray-300 hover:border-gray-500 transition-colors focus:outline-none focus:border-gray-500"
                  >
                    {platforms[selectedPlatform].name}
                    <span className="ml-1 text-sm inline-block transform rotate-90">&gt;</span>
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 shadow-lg rounded-sm z-10 min-w-max whitespace-nowrap">
                      {Object.entries(platforms).map(([key, platform]) => (
                        <button
                          key={key}
                          onClick={() => handlePlatformSelect(key as 'cursor' | 'claude-code')}
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                        >
                          {platform.name}
                        </button>
                      ))}
                    </div>
                  )}
                </span>
                {' '}conversations
              </p>
              <div className="flex justify-start">
                {selectedPlatform === 'cursor' ? (
                  <a 
                    href={platforms[selectedPlatform].url}
                    className="inline-flex items-center px-6 py-3 border border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-colors font-medium"
                  >
                    {platforms[selectedPlatform].buttonText}
                  </a>
                ) : (
                  <div className="inline-flex items-center px-6 py-3 border border-gray-900 text-gray-900 bg-gray-50 font-mono text-sm">
                    {platforms[selectedPlatform].buttonText}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            {selectedPlatform === 'cursor' ? <CursorAnimation /> : <ClaudeCodeAnimation />}
          </div>
        </div>
      </div>
    </div>
  )
}
