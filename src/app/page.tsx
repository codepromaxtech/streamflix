import { HeroSection } from '@/components/sections/hero-section'
import { FeaturedContent } from '@/components/sections/featured-content'
import { ContentRows } from '@/components/sections/content-rows'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-netflix-black">
      <Header />
      
      {/* Hero Section with Featured Content */}
      <HeroSection />
      
      {/* Featured Content Carousel */}
      <FeaturedContent />
      
      {/* Content Rows by Category */}
      <ContentRows />
      
      <Footer />
    </main>
  )
}
