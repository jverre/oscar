import { useState } from 'react'
import { GitBranch, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function RepositoryDropdown() {
  const repositories = useQuery(api.repositories.getUserRepositories)
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null)

  if (!repositories || repositories.length === 0) {
    return null
  }

  const selectedRepository = repositories.find(r => r._id === selectedRepo)

  return (
    <div className="md:hidden my-4">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="secondary"
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              <span className="text-sm">
                {selectedRepository ? selectedRepository.name : 'Select Repository'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-0">
          {repositories.map((repo) => (
            <DropdownMenuItem
              key={repo._id}
              onClick={() => setSelectedRepo(repo._id)}
              className="cursor-pointer"
            >
              <div className="flex flex-col w-full">
                <span className="text-sm font-medium">{repo.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {repo.repositoryUrl}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
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
    </div>
  )
}