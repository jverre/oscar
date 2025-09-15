import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Button } from '../components/ui/button'
import { PageContainer } from '../components/PageContainer'
import { useAuth } from '../auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate({ to: '/build' })
    }
  }, [isAuthenticated, navigate])

  const handleGitHubLogin = () => {
    login()
  }

  return (
    <PageContainer>
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-sage-green-50/30 via-cream-50 to-sage-green-100/20">
        {/* Grid pattern background */}
        <svg aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 size-full fill-sage-green-500/30 stroke-sage-green-500/30 [mask-image:radial-gradient(ellipse_at_center,_white,_transparent_70%)] opacity-20">
          <defs>
            <pattern id="login-grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse" x="0" y="0">
              <path d="M.5 20V.5H20" fill="none" strokeDasharray="0"></path>
            </pattern>
          </defs>
          <rect width="100%" height="100%" strokeWidth="0" fill="url(#login-grid-pattern)"></rect>
        </svg>

        {/* Modal Card */}
        <div className="relative w-full max-w-md">
          <div
            className="relative overflow-hidden rounded-sm bg-cream-50/95 dark:bg-[hsl(218,_13%,_6%,_.95)] border border-sage-green-200/80 dark:border-gray-600/60 backdrop-blur-sm"
            style={{ boxShadow: '8px 8px 0 #6b7a6b1a, -8px -8px 0 #6b7a6b1a' }}
          >
            {/* Noise texture overlay */}
            <div
              style={{ backgroundImage: 'url(/_next/static/media/noise.0e24d0e5.png)' }}
              className="pointer-events-none absolute inset-0 bg-[size:180px] bg-repeat opacity-[0.03] dark:opacity-[0.015]"
            />

            <div className="relative px-8 py-12 space-y-8">
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-semibold text-sage-green-800 dark:text-sage-green-100">
                  Welcome to Oscar
                </h1>
                <p className="text-sm text-foreground/70">
                  Sign in to access your AI conversation dashboard
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={handleGitHubLogin}
                  variant="primary"
                  size="lg"
                  className="w-full flex justify-center items-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  Continue with GitHub
                </Button>

                <p className="text-xs text-center text-foreground/60">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>
            </div>

            {/* Corner decorations */}
            <div
              className="absolute z-10 size-2 rounded-full border border-sage-green-200 bg-cream-50"
              style={{ top: '-4.5px', left: '-4.5px' }}
            />
            <div
              className="absolute z-10 size-2 rounded-full border border-sage-green-200 bg-cream-50"
              style={{ top: '-4.5px', right: '-4.5px' }}
            />
            <div
              className="absolute z-10 size-2 rounded-full border border-sage-green-200 bg-cream-50"
              style={{ bottom: '-4.5px', left: '-4.5px' }}
            />
            <div
              className="absolute z-10 size-2 rounded-full border border-sage-green-200 bg-cream-50"
              style={{ bottom: '-4.5px', right: '-4.5px' }}
            />
          </div>
        </div>
      </div>
    </PageContainer>
  )
}