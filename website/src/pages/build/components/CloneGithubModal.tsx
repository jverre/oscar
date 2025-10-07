import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useMutation, useAction } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Lock, Globe } from 'lucide-react'

interface CloneGithubModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onInstallRequired?: () => void
}

interface Repository {
  id: number
  name: string
  fullName: string
  description: string | null
  private: boolean
  cloneUrl: string
  htmlUrl: string
}

export function CloneGithubModal({ open, onOpenChange, onInstallRequired }: CloneGithubModalProps) {
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null)

  const listRepositories = useAction(api.github.listRepositories)
  const createRepository = useMutation(api.repositories.create)

  // Fetch repositories when modal opens
  useEffect(() => {
    if (open) {
      fetchRepositories()
    }
  }, [open])

  const fetchRepositories = async () => {
    setLoading(true)
    setError(null)

    try {
      const repos = await listRepositories()
      setRepositories(repos)
    } catch (err) {
      console.error('Failed to fetch repositories:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repositories'

      // If installation not found, show install dialog instead
      if (errorMessage.includes('installation not found')) {
        onOpenChange(false)
        onInstallRequired?.()
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClone = async () => {
    if (!selectedRepo) return

    try {
      await createRepository({
        name: selectedRepo.name,
        repositoryUrl: selectedRepo.cloneUrl,
        cloneSource: 'github',
      })

      // Close modal and reset state
      onOpenChange(false)
      setSelectedRepo(null)
    } catch (err) {
      console.error('Failed to clone repository:', err)
      setError(err instanceof Error ? err.message : 'Failed to clone repository')
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setSelectedRepo(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Clone from GitHub</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sage-green-600"></div>
              <span className="ml-3 text-sm text-muted-foreground">Loading repositories...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRepositories}
                className="mt-2"
              >
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && repositories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No repositories found.</p>
              <p className="text-sm mt-2">Make sure you've granted access to repositories when installing the GitHub App.</p>
            </div>
          )}

          {!loading && !error && repositories.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {repositories.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => setSelectedRepo(repo)}
                  className={`w-full text-left p-4 rounded-md border transition-colors ${
                    selectedRepo?.id === repo.id
                      ? 'border-sage-green-600 bg-sage-green-50 dark:bg-sage-green-950/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-sage-green-400 hover:bg-sage-green-50/50 dark:hover:bg-sage-green-950/10'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {repo.fullName}
                        </span>
                        {repo.private ? (
                          <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      {repo.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {repo.description}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-end">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleClone}
            disabled={!selectedRepo}
          >
            Clone repository
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
