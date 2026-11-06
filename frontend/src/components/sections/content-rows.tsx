'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Flame, Film, Tv, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContentCard } from '@/components/content-card'
import { VideoContent, ContentCategory } from '@/types/video'
import { mapDbItemToVideoContent, extractItemsFromApiResponse } from '@/lib/content-mapper'

interface ContentRowProps {
  category: ContentCategory
}

function ContentRow({ category }: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

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
  }, [category.content.length])

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

  if (category.content.length === 0) {
    return null
  }

  return (
    <div className="mb-14 relative group/row">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-3 px-4 md:px-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">
            {category.name}
          </h2>
          {category.description && (
            <p className="text-gray-400 text-xs md:text-sm mt-0.5">
              {category.description}
            </p>
          )}
        </div>

        {/* Desktop Carousel Controls */}
        <div className="hidden sm:flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label={`Scroll ${category.name} left`}
            className="h-8 w-8 text-white hover:bg-white/10 rounded-full disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label={`Scroll ${category.name} right`}
            className="h-8 w-8 text-white hover:bg-white/10 rounded-full disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content Carousel with native touch swiping & zero inline styles */}
      <div className="relative">
        <div
          ref={rowRef}
          onScroll={checkScroll}
          className="carousel-track scrollbar-none px-4 md:px-0"
        >
          {category.content.map((content) => (
            <div
              key={content.id}
              className="carousel-slide w-[220px] sm:w-[260px] md:w-[280px]"
            >
              <ContentCard content={content} size="medium" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ContentRows() {
  const [categories, setCategories] = useState<ContentCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDynamicCatalog = async () => {
      try {
        setLoading(true)
        // Fetch trending, movies, series, documentaries concurrently from real database
        const [trendingRes, moviesRes, seriesRes, docsRes] = await Promise.all([
          fetch('/api/content/trending', { credentials: 'include' }).catch(() => null),
          fetch('/api/content?type=MOVIE&limit=20', { credentials: 'include' }).catch(() => null),
          fetch('/api/content?type=SERIES&limit=20', { credentials: 'include' }).catch(() => null),
          fetch('/api/content?type=DOCUMENTARY&limit=20', { credentials: 'include' }).catch(() => null),
        ])

        const trendingData = trendingRes && trendingRes.ok ? await trendingRes.json() : []
        const moviesData = moviesRes && moviesRes.ok ? await moviesRes.json() : []
        const seriesData = seriesRes && seriesRes.ok ? await seriesRes.json() : []
        const docsData = docsRes && docsRes.ok ? await docsRes.json() : []

        const trendingItems = extractItemsFromApiResponse(trendingData).map(mapDbItemToVideoContent)
        const movieItems = extractItemsFromApiResponse(moviesData).map(mapDbItemToVideoContent)
        const seriesItems = extractItemsFromApiResponse(seriesData).map(mapDbItemToVideoContent)
        const docItems = extractItemsFromApiResponse(docsData).map(mapDbItemToVideoContent)

        const dynamicCategories: ContentCategory[] = []

        if (trendingItems.length > 0) {
          dynamicCategories.push({
            id: 'cat-trending',
            name: 'Trending Now',
            slug: 'trending',
            description: 'Most watched titles across the community right now',
            content: trendingItems,
          })
        }

        if (movieItems.length > 0) {
          dynamicCategories.push({
            id: 'cat-movies',
            name: 'Blockbuster Movies',
            slug: 'movies',
            description: 'Action, sci-fi, adventure, and top-rated feature films',
            content: movieItems,
          })
        }

        if (seriesItems.length > 0) {
          dynamicCategories.push({
            id: 'cat-series',
            name: 'Binge-Worthy TV Shows',
            slug: 'series',
            description: 'Critically acclaimed dramas, animation, and multi-season hits',
            content: seriesItems,
          })
        }

        if (docItems.length > 0) {
          dynamicCategories.push({
            id: 'cat-docs',
            name: 'Documentaries & Nature',
            slug: 'documentaries',
            description: 'Explore the universe, wildlife, and extraordinary true stories',
            content: docItems,
          })
        }

        setCategories(dynamicCategories)
      } catch (err) {
        console.error('Failed to load dynamic categories from database:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDynamicCatalog()
  }, [])

  if (loading) {
    return (
      <section className="py-10 md:py-14 bg-netflix-black">
        <div className="container mx-auto px-4 md:px-4 space-y-10">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-48 bg-gray-900 rounded-md animate-pulse border border-gray-800" />
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div
                    key={j}
                    className="w-[220px] sm:w-[260px] md:w-[280px] aspect-[2/3] bg-gray-900 rounded-xl animate-pulse border border-gray-800 shrink-0"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="py-10 md:py-14 bg-netflix-black">
      <div className="container mx-auto px-0 md:px-4">
        {categories.map((category) => (
          <ContentRow key={category.id} category={category} />
        ))}
      </div>
    </section>
  )
}
