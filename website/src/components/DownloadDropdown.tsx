import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

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
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="group select-none text-sm tracking-tight rounded-sm flex gap-1.5 items-center justify-center text-nowrap border transition-colors duration-75 lg:active:translate-y-px lg:active:scale-[.99] disabled:opacity-50 disabled:cursor-not-allowed bg-sage-green-600 border-transparent text-white shadow-[0_-2px_0_0_hsl(162,30%,30%)_inset,_0_1px_3px_0_hsl(162,30%,95%)] hover:bg-sage-green-700 active:shadow-none hover:shadow-none disabled:bg-sage-green-600 disabled:shadow-none h-9 pl-2.5 pr-3 w-full sm:w-fit"
      >
        <svg className="lucide lucide-download" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path>
        </svg>
        Download now
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
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