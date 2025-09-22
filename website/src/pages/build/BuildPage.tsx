import { PageContainer } from '@/components/PageContainer'
import { PageContent } from '@/components/FullWidth'
import { Header } from '@/components/header/Header'
import { BuildHome } from './BuildHome'
import { BuildFeature } from './BuildFeature'
import { RepositorySidebar } from './components/pageStructure/RepositorySidebar'
import { RepositoryDropdown } from './components/pageStructure/RepositoryDropdown'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useParams } from '@tanstack/react-router'

export function BuildPage() {
  const repositories = useQuery(api.repositories.getUserRepositories)
  const hasRepositories = repositories && repositories.length > 0
  const params = useParams({ strict: false })

  // Check if we have repository and feature params
  const isFeatureView = params.repositoryName && params.featureName

  return (
    <div className="h-screen flex flex-col">
      <PageContainer>
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <PageContent className="px-6 md:px-8 flex flex-col h-full w-full">
            {/* Mobile Repository Dropdown */}
            {hasRepositories && <RepositoryDropdown />}

            {/* Conditional layout based on repositories */}
            <div className={hasRepositories ? "flex flex-1 overflow-auto" : "flex-1 overflow-auto"}>
              {/* Desktop Sidebar */}
              {hasRepositories && <RepositorySidebar />}
              {/* Main content area */}
              {isFeatureView ? (
                <BuildFeature
                  repositoryName={params.repositoryName as string}
                  featureName={params.featureName as string}
                />
              ) : (
                <BuildHome />
              )}
            </div>
          </PageContent>
        </div>
      </PageContainer>
    </div>
  )
}