import { useState } from 'react'
import { BuildCard } from '@/components/BuildCard'
import { Github, Link, Plus } from 'lucide-react'
import { CloneUrlModal } from './CloneUrlModal'

export function BuildHome() {
  const [showCloneUrlModal, setShowCloneUrlModal] = useState(false)

  const handleGithubClone = () => {
    console.log('Clone from GitHub clicked')
  }

  const handleUrlClone = () => {
    setShowCloneUrlModal(true)
  }

  const handleNewProject = () => {
    console.log('New project clicked')
  }

  return (
    <>
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

      <CloneUrlModal
        open={showCloneUrlModal}
        onOpenChange={setShowCloneUrlModal}
      />
    </>
  )
}