import { useState } from 'react'
import { PageContainer } from '@/components/PageContainer'
import { Header } from '@/components/header/Header'
import { BuildCard } from '@/components/BuildCard'
import { Github, Link, Plus } from 'lucide-react'
import { CloneUrlModal } from './CloneUrlModal'

export function BuildPage() {
  const [showCloneUrlModal, setShowCloneUrlModal] = useState(false)

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

  return (
    <PageContainer>
      <Header />
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground">Build</h2>
            <p className="mt-4 text-muted-foreground">
              Choose how you'd like to start your next project
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
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

      <CloneUrlModal
        open={showCloneUrlModal}
        onOpenChange={setShowCloneUrlModal}
      />
    </PageContainer>
  )
}