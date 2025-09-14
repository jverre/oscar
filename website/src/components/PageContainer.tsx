import { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  /** Add vertical grid lines */
  withGridLines?: boolean
}

export function PageContainer({ children, withGridLines = true }: PageContainerProps) {
  return (
    <div className="relative min-h-screen">
      {/* Darker side areas extending to full viewport - inspired by zed.dev */}
      <div className="absolute inset-0 bg-gradient-to-r from-cream-100/50 via-cream-50/70 to-cream-100/50"></div>

      {/* Noise texture background */}
      <div className="noise-background"></div>

      {/* Content area - positioned like original but with relative layering */}
      <div className="relative min-h-screen">
        {children}
      </div>

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