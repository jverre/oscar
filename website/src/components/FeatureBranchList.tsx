import { useState } from 'react'
import { Plus, GitBranch, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { FeatureBranchModal } from './FeatureBranchModal'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'

interface FeatureBranchListProps {
  repositoryId: Id<"repositories">
  repositoryName: string
}

export function FeatureBranchList({ repositoryId, repositoryName }: FeatureBranchListProps) {
  const [showModal, setShowModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; branchId?: Id<"featureBranches">; branchName?: string }>({ open: false })
  const [isDeleting, setIsDeleting] = useState(false)
  const featureBranches = useQuery(api.featureBranches.getByRepository, { repositoryId })
  const deleteFeatureBranch = useMutation(api.featureBranches.deleteFeatureBranch)

  const handleDeleteClick = (branchId: Id<"featureBranches">, branchName: string) => {
    setDeleteModal({ open: true, branchId, branchName })
  }

  const handleConfirmDelete = async () => {
    if (!deleteModal.branchId) return

    setIsDeleting(true)
    try {
      await deleteFeatureBranch({ featureBranchId: deleteModal.branchId })
      setDeleteModal({ open: false })
    } catch (error) {
      console.error('Failed to delete feature branch:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="space-y-1">
        {featureBranches?.map((branch) => (
          <div key={branch._id} className="group relative">
            <Button
              variant="ghost"
              className="w-full justify-start px-2 py-1.5 h-auto text-xs text-muted-foreground font-medium hover:bg-sage-green-100 dark:hover:bg-sage-green-800/30"
            >
              <GitBranch className="w-3 h-3 shrink-0 text-sage-green-500 mr-2" />
              <span className="truncate">{branch.name}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 h-5 w-5 p-0 border-0 text-muted-red-600 hover:text-muted-red-700 hover:bg-transparent hover:scale-110"
              onClick={(e) => {
                e.stopPropagation()
                handleDeleteClick(branch._id, branch.name)
              }}
            >
              <Trash2 className="w-2.5 h-2.5 stroke-2" />
            </Button>
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start px-2 py-1.5 h-auto text-xs text-sage-green-600 dark:text-sage-green-400 hover:text-sage-green-700 dark:hover:text-sage-green-300 hover:bg-sage-green-100 dark:hover:bg-sage-green-800/30"
        onClick={() => setShowModal(true)}
      >
        <Plus className="w-3 h-3 mr-2" />
        New Feature
      </Button>

      <FeatureBranchModal
        open={showModal}
        onOpenChange={setShowModal}
        repositoryId={repositoryId}
        repositoryName={repositoryName}
      />

      <ConfirmDeleteModal
        open={deleteModal.open}
        onOpenChange={(open) => setDeleteModal({ open })}
        onConfirm={handleConfirmDelete}
        title="Delete Feature Branch"
        description={`Are you sure you want to delete the feature branch "${deleteModal.branchName}"? This action cannot be undone.`}
        isDeleting={isDeleting}
      />
    </>
  )
}