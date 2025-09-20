import { createFileRoute } from '@tanstack/react-router'
import { BuildPage } from '@/pages/build/BuildPage'

export const Route = createFileRoute('/_authenticated/build/$repositoryName/$featureName')({
  component: BuildPage,
})