import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { useNavigate } from '@tanstack/react-router'

interface FeatureBranchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  repositoryId: Id<"repositories">
  repositoryName: string
}

function validateGitHubBranchName(name: string): { isValid: boolean; error?: string } {
  if (!name.trim()) {
    return { isValid: false, error: 'Branch name is required' }
  }

  if (name.length > 250) {
    return { isValid: false, error: 'Branch name must be 250 characters or less' }
  }

  // Convert to valid format
  const processedName = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')

  if (!processedName) {
    return { isValid: false, error: 'Branch name must contain at least one alphanumeric character' }
  }

  if (processedName.startsWith('-') || processedName.endsWith('-')) {
    return { isValid: false, error: 'Branch name cannot start or end with a hyphen' }
  }

  // Check for reserved names
  const reservedNames = ['head', 'master', 'main']
  if (reservedNames.includes(processedName)) {
    return { isValid: false, error: 'Branch name cannot be a reserved Git name' }
  }

  return { isValid: true }
}

function formatBranchName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_]/g, '')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-')
}

export function FeatureBranchModal({ open, onOpenChange, repositoryId, repositoryName }: FeatureBranchModalProps) {
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const createFeatureBranch = useMutation(api.featureBranches.create)
  const navigate = useNavigate()

  const validation = validateGitHubBranchName(name)
  const formattedName = formatBranchName(name)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validation.isValid) return

    setIsCreating(true)
    try {
      await createFeatureBranch({
        name: formattedName,
        repositoryId,
      })

      setName('')
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to create feature branch:', error)
    } finally {
      setIsCreating(false)
      navigate({ to: '/build/$repositoryName/$featureName', params: { repositoryName, featureName: formattedName } })
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName('')
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Feature Branch</DialogTitle>
          <DialogDescription>
            Create a new feature branch for {repositoryName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter feature branch name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={validation.isValid === false && name ? 'border-red-500' : ''}
            />

            {name && (
              <div className="text-xs space-y-1">
                {formattedName !== name && (
                  <p className="text-muted-foreground">
                    Will be formatted as: <code className="bg-sage-green-100 dark:bg-sage-green-900/30 px-1 rounded">{formattedName}</code>
                  </p>
                )}

                {validation.error && (
                  <p className="text-red-600 dark:text-red-400">{validation.error}</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!validation.isValid || isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Feature Branch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}