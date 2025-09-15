import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { useAuth } from '../auth'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ context, location }) => {
    // This runs on the server/initial load before the component renders
    // Since we need to check auth state from React context, we handle it in the component
    // For server-side auth, you'd check cookies or session here
  },
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    throw redirect({
      to: '/login',
      search: {
        redirect: location.pathname,
      },
    })
  }

  // Render child routes if authenticated
  return <Outlet />
}