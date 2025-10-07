import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export const Route = createFileRoute('/github-callback')({
  component: GitHubCallbackPage,
})

function GitHubCallbackPage() {
  const navigate = useNavigate()
  const saveInstallation = useMutation(api.github.saveInstallation)

  useEffect(() => {
    const handleCallback = async () => {
      // Get installation_id from URL query params
      const params = new URLSearchParams(window.location.search)
      const installationId = params.get('installation_id')
      const setupAction = params.get('setup_action')

      if (installationId && setupAction === 'install') {
        try {
          await saveInstallation({ installationId })
          // Redirect to build page with success indicator
          navigate({ to: '/build', search: { github_connected: 'true' } })
        } catch (error) {
          console.error('Failed to save GitHub installation:', error)
          // Redirect to build page with error indicator
          navigate({ to: '/build', search: { github_error: 'true' } })
        }
      } else {
        // No valid installation ID, redirect to build
        navigate({ to: '/build' })
      }
    }

    handleCallback()
  }, [saveInstallation, navigate])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sage-green-600 mx-auto"></div>
        <p className="text-sm text-muted-foreground">Connecting GitHub...</p>
      </div>
    </div>
  )
}
