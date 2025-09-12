import { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  /** Add vertical grid lines */
  withGridLines?: boolean
}

export function PageContainer({ children, withGridLines = true }: PageContainerProps) {
  return (
    <div className="relative min-h-screen bg-cream-50/70">
      {/* Noise texture background */}
      <div className="noise-background"></div>
      
      {children}
      
      {/* Vertical grid lines */}
      {withGridLines && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="relative mx-3 h-full md:mx-8 lg:mx-12">
            {/* Left grid line */}
            <div className="absolute left-0 top-0 h-full w-px bg-sage-green-200/60"></div>
            {/* Right grid line */}
            <div className="absolute right-0 top-0 h-full w-px bg-sage-green-200/60"></div>
          </div>
        </div>
      )}
    </div>
  )
}