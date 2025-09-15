import { useState } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function DownloadDropdown() {
  const [isOpen, setIsOpen] = useState(false)

  const handleChromeExtension = () => {
    // Add Chrome Web Store URL when available
    console.log('Chrome Extension clicked')
    setIsOpen(false)
  }

  const handleCursorMCP = () => {
    const deeplinkUrl = 'cursor://anysphere.cursor-deeplink/mcp/install?name=oscar&config=eyJjb21tYW5kIjoibnB4IEBqdmVycmUvb3NjYXIifQ%3D%3D'
    window.location.href = deeplinkUrl
    setIsOpen(false)
  }

  return (
    <div className="relative w-full sm:w-fit">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="primary"
        className="w-full sm:w-fit"
      >
        <Download className="w-4 h-4" />
        Download now
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </Button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          ></div>
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-full sm:w-64 bg-cream-50 border border-sage-green-200 rounded-sm shadow-[0_4px_12px_0_rgba(0,0,0,0.1)] z-20">
            <div className="py-1">
              <button
                onClick={handleChromeExtension}
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-sage-green-50 transition-colors duration-75"
              >
                <div>
                  <div className="font-medium">Chrome Extension</div>
                  <div className="text-xs text-foreground/60">For web browsers</div>
                </div>
              </button>
              
              <button
                onClick={handleCursorMCP}
                className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-sage-green-50 transition-colors duration-75"
              >
                <div>
                  <div className="font-medium">Cursor MCP Server</div>
                  <div className="text-xs text-foreground/60">For Cursor IDE</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}