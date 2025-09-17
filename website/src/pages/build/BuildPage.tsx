import { useState } from 'react'
import { PageContainer } from '@/components/PageContainer'
import { PageContent } from '@/components/FullWidth'
import { Header } from '@/components/header/Header'
import { BuildCard } from '@/components/BuildCard'
import { Github, Link, Plus } from 'lucide-react'
import { CloneUrlModal } from './CloneUrlModal'
import { RepositorySidebar } from './RepositorySidebar'
import { RepositoryDropdown } from './RepositoryDropdown'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

export function BuildPage() {
  const [showCloneUrlModal, setShowCloneUrlModal] = useState(false)
  const repositories = useQuery(api.repositories.getUserRepositories)

  const handleGithubClone = () => {
    // TODO: Implement GitHub clone functionality
    console.log('Clone from GitHub clicked')
  }

  const handleUrlClone = () => {
    setShowCloneUrlModal(true)
  }

  const handleNewProject = () => {
    // TODO: Implement new project functionality
    console.log('New project clicked')
  }

  const hasRepositories = repositories && repositories.length > 0

  return (
    <div className="min-h-screen flex flex-col">
      <PageContainer>
        <Header />
        <div className="flex-1">
          <PageContent className="px-6 md:px-8 h-full">
            {/* Mobile Repository Dropdown */}
            {hasRepositories && <RepositoryDropdown />}

            {/* Conditional layout based on repositories */}
            {/* TODO: Remove the min-h-[calc(100vh-8rem-1px)] */}
            <div className={hasRepositories ? "flex min-h-[calc(100vh-8rem-1px)]" : ""}>
            {/* Desktop Sidebar */}
            {hasRepositories && <RepositorySidebar />}

            {/* Main content area */}
            <div className="flex-1 flex flex-col items-center mx-4 xl:mx-auto">
              <div className="text-center my-12">
                <h2 className="text-3xl font-bold text-foreground">Build</h2>
                <p className="mt-4 text-muted-foreground">
                  Choose how you'd like to start your next project
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
                <BuildCard
                  title="Clone from GitHub"
                  icon={Github}
                  onClick={handleGithubClone}
                  comingSoon={true}
                />

                <BuildCard
                  title="Clone from URL"
                  icon={Link}
                  onClick={handleUrlClone}
                />

                <BuildCard
                  title="New Project"
                  icon={Plus}
                  onClick={handleNewProject}
                  comingSoon={true}
                />
              </div>
              </div>
            </div>
          </PageContent>
        </div>

        <CloneUrlModal
          open={showCloneUrlModal}
          onOpenChange={setShowCloneUrlModal}
        />
      </PageContainer>
    </div>
  )
}