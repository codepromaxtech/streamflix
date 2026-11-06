'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContentCard } from '@/components/content-card'
import { VideoContent } from '@/types/video'
import { mapDbItemToVideoContent, extractItemsFromApiResponse } from '@/lib/content-mapper'

export function FeaturedContent() {
  const [featuredList, setFeaturedList] = useState<VideoContent[]>([])
  const [loading, setLoading] = useState(true)
  const rowRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/content/featured', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const items = extractItemsFromApiResponse(data)
          if (items.length > 0) {
            setFeaturedList(items.map(mapDbItemToVideoContent))
            return
          }
        }

        // Fallback to top rating items if no isFeatured flag
        const topRes = await fetch('/api/content?limit=8', { credentials: 'include' })
        if (topRes.ok) {
          const data = await topRes.json()
          const items = extractItemsFromApiResponse(data)
          setFeaturedList(items.map(mapDbItemToVideoContent))
        }
      } catch (err) {
        console.error('Failed to load featured content from database:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFeatured()
  }, [])

  const checkScroll = () => {
    if (rowRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = rowRef.current
      setCanScrollLeft(scrollLeft > 10)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    const handleResize = () => checkScroll()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [featuredList.length])

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const scrollAmount = rowRef.current.clientWidth * 0.75
      rowRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(checkScroll, 350)
    }
  }

  if (!loading && featuredList.length === 0) {
    return null
  }

  return (
    <section className="py-10 md:py-14 bg-netflix-black border-b border-gray-800/60 relative z-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-netflix-red" />
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Featured Content
              </h2>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm mt-0.5">
              Specially curated blockbusters and series from our live catalog
            </p>
          </div>
          
          <div className="hidden sm:flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll featured content left"
              className="text-white hover:bg-white/10 rounded-full h-8 w-8 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
              aria-label="Scroll featured content right"
              className="text-white hover:bg-white/10 rounded-full h-8 w-8 disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content Carousel with native touch swiping & zero inline styles */}
        <div className="relative">
          {loading ? (
            <div className="flex gap-4 overflow-hidden py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[260px] sm:w-[300px] md:w-[340px] aspect-video bg-gray-900 rounded-xl animate-pulse border border-gray-800 shrink-0"
                />
              ))}
            </div>
          ) : (
            <div
              ref={rowRef}
              onScroll={checkScroll}
              className="carousel-track scrollbar-none"
            >
              {featuredList.map((content) => (
                <div
                  key={content.id}
                  className="carousel-slide w-[260px] sm:w-[300px] md:w-[340px]"
                >
                  <ContentCard content={content} size="large" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
