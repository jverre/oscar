import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/header/Header'
import { HeroSection } from '@/pages/home/HeroSection'
import { GridSeparator } from '@/pages/home/GridSeparator'
import { FeaturesSection } from '@/pages/home/FeaturesSection'
import { Footer } from '@/components/Footer'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div
      className="relative min-h-screen"
      style={{
        '--page-padding': '0.75rem',
        '--page-padding-md': '2rem',
        '--page-padding-lg': '3rem'
      } as React.CSSProperties}
    >
      {/* Noise texture background */}
      <div className="noise-background"></div>

      {/* Vertical grid lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="relative mx-3 h-full md:mx-8 lg:mx-12">
          <div className="absolute left-0 top-0 h-full w-px bg-sage-green-200/60"></div>
          <div className="absolute right-0 top-0 h-full w-px bg-sage-green-200/60"></div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-col min-h-screen bg-gradient-to-r from-cream-100/50 via-cream-50/70 to-cream-100/50">
        <Header />
        <HeroSection />
        <FeaturesSection />
        <GridSeparator id="hero-grid-separator" />

        {/* Future sections can be added here */}

        <Footer />
      </div>
    </div>
  )
}
