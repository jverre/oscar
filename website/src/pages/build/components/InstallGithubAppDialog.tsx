import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Github } from 'lucide-react'

interface InstallGithubAppDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InstallGithubAppDialog({ open, onOpenChange }: InstallGithubAppDialogProps) {
  const handleInstall = () => {
    // Get the GitHub App installation URL
    const githubAppSlug = 'getoscar'
    const installUrl = `https://github.com/apps/${githubAppSlug}/installations/new`

    // Redirect to GitHub to install the app
    window.location.href = installUrl
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            Connect GitHub
          </DialogTitle>
          <DialogDescription className="pt-2">
            Install the Oscar GitHub App to access your repositories. You'll be able to choose which repositories to grant access to.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">What you'll get:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Clone your GitHub repositories</li>
              <li>Access both public and private repos</li>
              <li>Control which repos Oscar can access</li>
              <li>Secure, short-lived access tokens</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleInstall}
            className="flex items-center gap-2"
          >
            <Github className="w-4 h-4" />
            Install GitHub App
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
