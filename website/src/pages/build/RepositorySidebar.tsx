import { ChevronRight, Home, GithubIcon } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { GridCircles } from '../home/GridCircles'

export function RepositorySidebar() {
  const repositories = useQuery(api.repositories.getUserRepositories)
  const [openItems, setOpenItems] = useState<Set<string>>(new Set())

  if (!repositories || repositories.length === 0) {
    return (
      <div className="hidden md:block w-64 shrink-0 border-r border-sage-green-200/60 self-stretch">
        <div className="py-2 px-4 border-b border-sage-green-200/60 relative">
          <Collapsible>
            <Link to="/build" className="w-full text-left">
              <CollapsibleTrigger disabled className="w-full text-left px-0">
                <div className="flex items-center gap-2 px-2">
                  <Home className="w-4 h-4 text-sage-green-500" />
                  <span className="text-sm truncate text-foreground">Home</span>
                </div>
              </CollapsibleTrigger>
            </Link>
          </Collapsible>
          <GridCircles />
        </div>

        <div className="p-4">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">Clone repository</p>
          </div>
        </div>
      </div>
    )
  }

  const toggleItem = (repoId: string) => {
    setOpenItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(repoId)) {
        newSet.delete(repoId)
      } else {
        newSet.add(repoId)
      }
      return newSet
    })
  }

  return (
    <div className="hidden md:block w-64 shrink-0 border-r border-sage-green-200/60 self-stretch">
        <div className="py-2 px-4 border-b border-sage-green-200/60 relative">
          <Collapsible>
            <Link to="/build" className="w-full text-left">
              <CollapsibleTrigger disabled className="w-full text-left px-0">
                <div className="flex items-center gap-2 px-2">
                  <Home className="w-4 h-4 text-sage-green-500" />
                  <span className="text-sm truncate text-foreground">Home</span>
                </div>
              </CollapsibleTrigger>
            </Link>
          </Collapsible>
          <GridCircles />
        </div>

        <div className="space-y-1 px-4 py-2">
          {repositories.map((repo) => (
            <Collapsible
              key={repo._id}
              open={openItems.has(repo._id)}
              onOpenChange={() => toggleItem(repo._id)}
            >
              <CollapsibleTrigger className="w-full text-left">
                <div className="flex w-full justify-between rounded-sm transition-colors hover:bg-sage-green-100 dark:hover:bg-sage-green-800/30">
                  <div className="flex items-center gap-2">
                    <ChevronRight className={`w-4 h-4 transition-transform duration-200 text-sage-green-500 ${openItems.has(repo._id) ? 'rotate-90' : ''}`} />
                    <span className="text-sm truncate text-foreground flex-1">{repo.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
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
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="ml-6 mt-1 p-3 bg-sage-green-50/30 dark:bg-sage-green-900/10 rounded-sm border-l-2 border-sage-green-200/40">
                  <div className="text-xs text-muted-foreground">
                    Added: {new Date(repo.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
    </div>
  )
}