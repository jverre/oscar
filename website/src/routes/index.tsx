import { createFileRoute } from '@tanstack/react-router'
import { Header } from '@/components/header/Header'
import { HeroSection } from '@/pages/home/HeroSection'
import { GridSeparator } from '@/pages/home/GridSeparator'
import { PageContainer } from '@/components/PageContainer'
import { FeaturesSection } from '@/pages/home/FeaturesSection'
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
