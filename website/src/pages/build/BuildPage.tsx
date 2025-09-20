import { PageContainer } from '@/components/PageContainer'
import { PageContent } from '@/components/FullWidth'
import { Header } from '@/components/header/Header'
import { BuildHome } from './BuildHome'
import { BuildFeature } from './BuildFeature'
import { RepositorySidebar } from './RepositorySidebar'
import { RepositoryDropdown } from './RepositoryDropdown'
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