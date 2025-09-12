import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/Header'
import { HeroSection } from '@/components/HeroSection'
import { GridSeparator } from '@/components/GridSeparator'
import { PageContainer } from '@/components/PageContainer'
import { FeaturesSection } from '@/components/FeaturesSection'
import { Footer } from '@/components/Footer'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <PageContainer>
      <Header />
      <HeroSection />
      <FeaturesSection />
      <GridSeparator id="hero-grid-separator" />
      
      {/* Future sections can be added here */}
      
      <Footer />
    </PageContainer>
  )
}
