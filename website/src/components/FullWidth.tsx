import { ReactNode } from 'react'

interface ContentProps {
  children: ReactNode
  className?: string
}

/**
 * Wraps content with padding that aligns with the page grid lines.
 * Use this for content that should respect the grid boundaries.
 */
export function PageContent({ children, className = '' }: ContentProps) {
  return (
    <div className={`px-3 md:px-8 lg:px-12 ${className}`}>
      {children}
    </div>
  )
}

/**
 * Breaks out of grid padding for full-width content.
 * Use sparingly for components that need to span edge-to-edge.
 */
export function FullWidth({ children, className = '' }: ContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}