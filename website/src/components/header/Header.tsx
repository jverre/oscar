import { CircleDot } from 'lucide-react'
import { GridCircles } from '../GridCircles'
import { Button } from '../ui/button'
import { useConvexAuth, useQuery } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "../../../convex/_generated/api"
import { Link } from '@tanstack/react-router'
import { AccountDropdown } from './AccountDropdown'

export function Header() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const currentUser = useQuery(api.auth.currentUser)

  const handleLogout = () => {
    void signOut()
  }

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
                    currentUser={currentUser}
                    onSignOut={handleLogout}
                  />
                ) : (
                  <Link to="/login">
                    <Button variant="secondary">Sign in</Button>
                  </Link>
                )}
              </>
            )}
          </div>
        </nav>
      </div>
    </div>
  )
}