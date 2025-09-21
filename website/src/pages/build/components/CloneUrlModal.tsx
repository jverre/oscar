import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'

interface CloneUrlModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CloneUrlModal({ open, onOpenChange }: CloneUrlModalProps) {
  const [url, setUrl] = useState('')
  const createRepository = useMutation(api.repositories.create)

  const handleClone = async () => {
    if (!url.trim()) return

    try {
      // Extract repository name from URL
      const repoName = url.split('/').pop()?.replace('.git', '') || 'repository'

      // Create repository record
      await createRepository({
        name: repoName,
        repositoryUrl: url.trim(),
      })

      console.log('Repository saved:', repoName, url)

      // Close modal and reset form
      onOpenChange(false)
      setUrl('')
    } catch (error) {
      console.error('Failed to save repository:', error)
      // TODO: Add proper error handling/toast
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setUrl('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Clone from URL</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <div className="space-y-6">
            <label htmlFor="repo-url" className="text-sm font-medium text-foreground cursor-pointer">
              Repo
            </label>
            <Input
              id="repo-url"
              type="url"
              placeholder="https://github.com/username/repository.git"
              className="mt-1"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleClone()
                }
              }}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button
            variant="primary"
            onClick={handleClone}
            disabled={!url.trim()}
          >
            Clone repository
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}