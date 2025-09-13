import { CircleDot } from 'lucide-react'
import { GridCircles } from './GridCircles'
import { Button } from './ui/button'

export function Header() {
  return (
    <div className='sticky top-0 z-50 bg-cream-50/60 backdrop-blur-sm border-b border-sage-green-200'>
      <div className="nav-background grid-border-color relative mx-3 flex border-x md:mx-8 lg:mx-12">
        {/* Grid line decorative circles */}
        <GridCircles />
        
        <nav
          aria-label="Site's main navigation"
          data-orientation="horizontal"
          dir="ltr"
          className="relative z-2 w-full px-6 py-3 flex justify-between items-center gap-4"
        >
          {/* Logo section */}
          <div className="flex flex-none items-center gap-3">
            <a
              aria-label="Go back to oscar chat homepage"
              className="fv-style size-[26px] rounded-sm transition-transform hover:scale-105"
              href="/"
            >
              <CircleDot className="w-6 h-6 text-sage-green-600" />
            </a>
            <span className="hidden md:block text-foreground">Oscar</span>
          </div>

          {/* Sign-up button */}
          <Button
            variant="primary"
            onClick={() => console.log('Sign-up clicked')}
          >
            Sign up
          </Button>
        </nav>
      </div>
    </div>
  )
}
