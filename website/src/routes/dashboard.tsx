import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useConvexAuth, useQuery } from "convex/react"
import { useAuthActions } from "@convex-dev/auth/react"
import { api } from "../../convex/_generated/api"
import { Button } from '../components/ui/button'
import { PageContainer } from '../components/PageContainer'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: () => {
    // For now, we'll check auth in the component since context isn't set up yet
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const navigate = useNavigate()
  const currentUser = useQuery(api.auth.currentUser)

  // Redirect if not authenticated
  if (!isLoading && !isAuthenticated) {
    navigate({ to: '/login' })
    return null
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div>Loading...</div>
      </div>
    )
  }

  const handleLogout = () => {
    void signOut().then(() => {
      navigate({ to: '/' })
    })
  }

  return (
    <PageContainer>
      <div className="min-h-screen">
        <div className="bg-background/90 backdrop-blur-sm shadow border-b border-sage-green-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <div className="flex items-center gap-4">
                {currentUser && (
                  <span className="text-sm text-muted-foreground">
                    Welcome, {currentUser.email || currentUser.name}
                  </span>
                )}
                <Button onClick={handleLogout} variant="outline">
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
            <p className="mt-4 text-muted-foreground">
              You are now logged in with GitHub!
            </p>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}