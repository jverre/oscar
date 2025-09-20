import { GitBranch } from 'lucide-react'

interface BuildFeatureProps {
  repositoryName: string
  featureName: string
}

export function BuildFeature({ repositoryName, featureName }: BuildFeatureProps) {
  return (
    <div className="flex-1 flex flex-col items-center mx-4 xl:mx-auto">
      <div className="text-center my-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <GitBranch className="w-8 h-8 text-sage-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-foreground">{featureName}</h2>
        <p className="mt-2 text-muted-foreground">
          Repository: {repositoryName}
        </p>
      </div>
    </div>
  )
}