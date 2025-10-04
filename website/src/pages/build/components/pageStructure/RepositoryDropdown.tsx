import { useState } from 'react'
import { GitBranch, ChevronDown, Home, Plus, GithubIcon, ChevronRight } from 'lucide-react'
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

  const currentRepository = repositories?.find(r => r.name === currentRepo)

  return (
    <div className="flex md:hidden my-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              {currentRepository ? (
                <GitBranch className="w-4 h-4" />
              ) : (
                <Home className="w-4 h-4" />
              )}
              <span className="text-sm">
                {currentRepository ? currentRepository.name : 'Home'}
                {currentFeature && ` / ${currentFeature}`}
              </span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-0">
          <DropdownMenuItem
            onClick={() => {
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
                  className={`p-2 rounded-sm transition-colors hover:bg-sage-green-100 dark:hover:bg-sage-green-800/30 ${
                    isCurrentRepo ? 'bg-sage-green-100 dark:bg-sage-green-800/50' : ''
                  }`}
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <ChevronRight className="w-4 h-4 transition-transform duration-200 text-sage-green-500 rotate-90" />
                      <span className={`text-sm truncate ${
                        isCurrentRepo ? 'text-sage-green-700 dark:text-sage-green-300 font-medium' : 'text-foreground'
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
                  <div className="ml-6 mb-1 p-2 bg-sage-green-50/30 dark:bg-sage-green-900/10 rounded-sm border-l-2 border-sage-green-200/40">
                    {branches.map(branch => {
                      const isCurrentFeature = currentFeature === branch.name && isCurrentRepo
                      return (
                        <DropdownMenuItem
                          key={branch._id}
                          className={`justify-start px-2 py-1.5 h-auto text-xs font-medium hover:bg-sage-green-100 dark:hover:bg-sage-green-800/30 ${
                            isCurrentFeature
                              ? 'bg-sage-green-200 dark:bg-sage-green-700/70 text-sage-green-800 dark:text-sage-green-200'
                              : 'text-muted-foreground'
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
                          <GitBranch className={`w-3 h-3 shrink-0 mr-2 ${
                            isCurrentFeature ? 'text-sage-green-700 dark:text-sage-green-300' : 'text-sage-green-500'
                          }`} />
                          <span className="truncate">{branch.name}</span>
                        </DropdownMenuItem>
                      )
                    })}
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault()
                        setModalRepoId(repo._id)
                        setShowFeatureBranchModal(true)
                      }}
                      className="justify-start px-2 py-1.5 h-auto text-xs text-sage-green-600 dark:text-sage-green-400 hover:text-sage-green-700 dark:hover:text-sage-green-300 hover:bg-sage-green-100 dark:hover:bg-sage-green-800/30"
                    >
                      <Plus className="w-3 h-3 mr-2" />
                      New Feature
                    </DropdownMenuItem>
                  </div>
                )}
              </div>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

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