import { ChevronRight, Home, GithubIcon } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '../../../../../convex/_generated/api'
import { Link, useParams } from '@tanstack/react-router'
import { GridCircles } from '../../../home/GridCircles'
import { FeatureBranchList } from '@/components/FeatureBranchList'

export function RepositorySidebar() {
  const repositories = useQuery(api.repositories.getUserRepositories)
  const params = useParams({ strict: false })

  // Get current selection from URL params
  const currentRepo = params.repositoryName
  const currentFeature = params.featureName

  if (!repositories || repositories.length === 0) {
    return (
      <div className="hidden md:block w-64 shrink-0 border-r border-sage-green-200/60 self-stretch">
        <div className="py-2 px-4 border-b border-sage-green-200/60 relative">
              <Link to="/build" className="w-full text-left">
                <div className="flex items-center gap-2 px-2 py-2 rounded-sm hover:bg-sage-green-100 dark:hover:bg-sage-green-800/30 transition-colors">
                  <Home className="w-4 h-4 text-sage-green-500" />
                  <span className="text-sm truncate text-foreground">Home</span>
                </div>
              </Link>
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


  return (
    <div className="hidden md:block w-64 shrink-0 border-r border-sage-green-200/60 self-stretch">
        <div className="py-2 px-4 border-b border-sage-green-200/60 relative">
          <Link to="/build" className="w-full text-left">
            <div className="flex items-center gap-2 px-2 py-2 rounded-sm hover:bg-sage-green-100 dark:hover:bg-sage-green-800/30 transition-colors">
              <Home className="w-4 h-4 text-sage-green-500" />
              <span className="text-sm truncate text-foreground">Home</span>
            </div>
          </Link>
          <GridCircles />
        </div>

        <div className="space-y-1 px-4 py-2">
          {repositories.map((repo) => {
            const isCurrentRepo = false; //currentRepo === repo.name && !currentFeature
            return (
              <div key={repo._id}>
                <div className={`w-full text-left p-2 rounded-sm transition-colors hover:bg-sage-green-100 dark:hover:bg-sage-green-800/30 ${
                  isCurrentRepo ? 'bg-sage-green-100 dark:bg-sage-green-800/50' : ''
                }`}>
                  <div className="flex w-full justify-between items-center">
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
                </div>
                <div className="ml-6 mt-1 p-3 bg-sage-green-50/30 dark:bg-sage-green-900/10 rounded-sm border-l-2 border-sage-green-200/40 space-y-2">
                  <FeatureBranchList
                    repositoryId={repo._id}
                    repositoryName={repo.name}
                    currentFeature={currentFeature}
                  />
                </div>
              </div>
            )
          })}
        </div>
    </div>
  )
}