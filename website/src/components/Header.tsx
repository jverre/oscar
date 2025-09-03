import { Button } from './ui/button'
import { OscarLogo } from './OscarLogo'

export function Header() {
  const handleInstallInCursor = () => {
    // Use the correct Cursor deeplink
    const deeplinkUrl = 'cursor://anysphere.cursor-deeplink/mcp/install?name=oscar&config=eyJjb21tYW5kIjoibnB4IEBqdmVycmUvb3NjYXIifQ%3D%3D'
    
    // Open the deeplink
    window.location.href = deeplinkUrl
  }

  return (
    <header className="bg-white">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <OscarLogo className="w-24 sm:w-32 md:w-40 sm:h-10 md:h-12" />
          
          <Button 
            onClick={handleInstallInCursor}
            className="font-mono text-sm sm:text-base border border-[var(--sage-green)] bg-[var(--light-tan)] text-[var(--dark-brown)] hover:bg-[var(--sage-green)] transition-all duration-200 rounded-none cursor-pointer"
          >
            <span className="hidden sm:inline">Install in Cursor</span>
            <span className="sm:hidden">Install</span>
          </Button>
        </div>
      </div>
    </header>
  )
}