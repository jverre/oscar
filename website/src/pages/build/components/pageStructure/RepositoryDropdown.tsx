import { useState } from 'react'
import { GitBranch, ChevronDown, Home, Plus, GithubIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { FeatureBranchModal } from '@/components/FeatureBranchModal'
import { useNavigate, useParams } from '@tanstack/react-router'

export function RepositoryDropdown() {
  const repositories = useQuery(api.repositories.getUserRepositories)
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)
  const [showFeatureBranchModal, setShowFeatureBranchModal] = useState(false)
  const [modalRepoId, setModalRepoId] = useState<string | null>(null)
  const featureBranchesByRepo = new Map<string, any[]>()

  // Get current selection from URL params
  const currentRepo = params.repositoryName
  const currentFeature = params.featureName

  // Fetch feature branches for all repositories
  repositories?.forEach(repo => {
    const branches = useQuery(api.featureBranches.getByRepository, { repositoryId: repo._id })
    if (branches) {
      featureBranchesByRepo.set(repo._id, branches)
    }
  })

  if (!repositories || repositories.length === 0) {
    return null
  }

  const selectedRepository = repositories.find(r => r._id === selectedRepo)
  const currentRepository = repositories?.find(r => r.name === currentRepo)

  return (
    <div className="md:hidden my-4">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              {currentRepository || selectedRepository ? (
                <GitBranch className="w-4 h-4" />
              ) : (
                <Home className="w-4 h-4" />
              )}
              <span className="text-sm">
                {currentRepository ? currentRepository.name : selectedRepository ? selectedRepository.name : 'Home'}
                {currentFeature && ` / ${currentFeature}`}
              </span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-0">
          <DropdownMenuItem
            onClick={() => {
              setSelectedRepo(null)
              navigate({ to: '/build' })
            }}
            className="cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span className="text-sm font-medium">Home</span>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {repositories.map((repo) => {
            const branches = featureBranchesByRepo.get(repo._id) || []
            const isCurrentRepo = currentRepo === repo.name
            return (
              <div key={repo._id}>
                <DropdownMenuItem
                  onClick={() => setSelectedRepo(repo._id)}
                  className={`cursor-pointer ${
                    isCurrentRepo ? 'bg-sage-green-100 dark:bg-sage-green-800/50' : ''
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4" />
                      <span className={`text-sm font-medium ${
                        isCurrentRepo ? 'text-sage-green-700 dark:text-sage-green-300' : ''
                      }`}>{repo.name}</span>
                    </div>
                    <a
                      href={repo.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors opacity-60 hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GithubIcon className="w-3 h-3" />
                    </a>
                  </div>
                </DropdownMenuItem>
                {/* Feature branches */}
                {branches.length > 0 && (
                  <div className="ml-4 border-l border-sage-green-200/40 dark:border-sage-green-700/40">
                    {branches.map(branch => {
                      const isCurrentFeature = currentFeature === branch.name && isCurrentRepo
                      return (
                        <DropdownMenuItem
                          key={branch._id}
                          className={`cursor-pointer pl-6 py-1 text-xs ${
                            isCurrentFeature ? 'bg-sage-green-200 dark:bg-sage-green-700/70' : ''
                          }`}
                          onClick={() => {
                            navigate({
                              to: '/build/$repositoryName/$featureName',
                              params: {
                                repositoryName: repo.name,
                                featureName: branch.name
                              }
                            })
                          }}
                        >
                          <GitBranch className={`w-3 h-3 mr-2 ${
                            isCurrentFeature ? 'text-sage-green-700 dark:text-sage-green-300' : 'text-sage-green-500'
                          }`} />
                          <span className={isCurrentFeature ? 'text-sage-green-800 dark:text-sage-green-200 font-medium' : 'text-muted-foreground'}>{branch.name}</span>
                        </DropdownMenuItem>
                      )
                    })}
                  </div>
                )}
                <DropdownMenuItem
                  onClick={() => {
                    setModalRepoId(repo._id)
                    setShowFeatureBranchModal(true)
                  }}
                  className="cursor-pointer ml-4 pl-6 py-1"
                >
                  <Plus className="w-3 h-3 mr-2 text-sage-green-600" />
                  <span className="text-xs text-sage-green-600">New Feature</span>
                </DropdownMenuItem>
              </div>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      {selectedRepository && (
        <div className="mt-2 p-3 bg-sage-green-50/50 dark:bg-sage-green-900/20 rounded-sm">
          <a
            href={selectedRepository.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-sage-green-600 dark:text-sage-green-400 hover:underline break-all"
          >
            {selectedRepository.repositoryUrl}
          </a>
          <div className="mt-1 text-xs text-muted-foreground">
            Added: {new Date(selectedRepository.createdAt).toLocaleDateString()}
          </div>
        </div>
      )}

      {modalRepoId && (
        <FeatureBranchModal
          open={showFeatureBranchModal}
          onOpenChange={(open) => {
            setShowFeatureBranchModal(open)
            if (!open) setModalRepoId(null)
          }}
          repositoryId={modalRepoId as any}
          repositoryName={repositories?.find(r => r._id === modalRepoId)?.name || ''}
        />
      )}
    </div>
  )
}