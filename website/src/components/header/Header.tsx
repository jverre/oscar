import { CircleDot } from 'lucide-react'
import { GridCircles } from '../../pages/home/GridCircles'
import { Button } from '../ui/button'
import { Link } from '@tanstack/react-router'
import { AccountDropdown } from './AccountDropdown'
import { useAuth } from '../../auth'

export function Header() {
  const { isAuthenticated, isLoading, user, logout } = useAuth()

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
            <Link
              to="/"
              aria-label="Go back to oscar chat homepage"
              className="fv-style size-[26px] rounded-sm transition-transform hover:scale-105"
            >
              <CircleDot className="w-6 h-6 text-sage-green-600" />
            </Link>
            <span className="hidden md:block text-foreground">Oscar</span>
          </div>

          {/* Auth buttons */}
          <div className="flex items-center gap-3 min-h-[40px]">
            {isLoading ? (
              <div className="w-20 h-9 bg-muted/30 rounded animate-pulse"></div>
            ) : (
              <>
                {isAuthenticated ? (
                  <AccountDropdown
                    currentUser={user ? { userId: '', email: user, name: user } : null}
                    onSignOut={logout}
                  />
                ) : (
                  <Link to="/login">
                    <Button variant="secondary">Sign in</Button>
                  </Link>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              asChild
            >
              <a
                target="_blank"
                href="https://github.com/jverre/oscar"
              >
                <svg className="lucide lucide-github" xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"></path>
                  <path d="M9 18c-4.51 2-5-2-7-2"></path>
                </svg>
                <span className="ml-1.5">GitHub</span>
              </a>
            </Button>
          </div>
        </nav>
      </div>
    </div>
  )
}