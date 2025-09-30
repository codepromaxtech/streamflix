'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContentCard } from '@/components/content-card'
import { VideoContent, ContentCategory } from '@/types/video'

// Mock data - in production this would come from your API
const mockCategories: ContentCategory[] = [
  {
    id: '1',
    name: 'Trending Now',
    slug: 'trending',
    description: 'What everyone is watching',
    content: [
      {
        id: '5',
        title: 'Wednesday',
        description: 'Smart, sarcastic and a little dead inside, Wednesday Addams investigates a murder spree.',
        thumbnail: '/images/wednesday-thumb.jpg',
        backdrop: '/images/wednesday-backdrop.jpg',
        videoUrl: '/videos/wednesday-s1e1.mp4',
        duration: 3000,
        releaseDate: '2022-11-23',
        rating: 8.1,
        maturityRating: 'TV-14',
        genre: ['Comedy', 'Horror', 'Mystery'],
        cast: [],
        director: ['Tim Burton'],
        producer: ['Miles Millar'],
        language: 'English',
        subtitles: [],
        audioTracks: [],
        qualityLevels: [],
        type: 'series',
        isExclusive: true,
        isPremium: false,
        tags: ['trending', 'new'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      // Add more content...
    ],
  },
  {
    id: '2',
    name: 'Action & Adventure',
    slug: 'action-adventure',
    description: 'High-octane thrills and epic adventures',
    content: [
      {
        id: '6',
        title: 'Extraction 2',
        description: 'Tyler Rake survives his grievous wounds from his mission in Dhaka, Bangladesh.',
        thumbnail: '/images/extraction2-thumb.jpg',
        backdrop: '/images/extraction2-backdrop.jpg',
        videoUrl: '/videos/extraction2.mp4',
        duration: 7320, // 2h 2m
        releaseDate: '2023-06-16',
        rating: 7.0,
        maturityRating: 'R',
        genre: ['Action', 'Thriller'],
        cast: [],
        director: ['Sam Hargrave'],
        producer: ['Joe Russo'],
        language: 'English',
        subtitles: [],
        audioTracks: [],
        qualityLevels: [],
        type: 'movie',
        isExclusive: true,
        isPremium: true,
        tags: ['action', 'blockbuster'],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      // Add more content...
    ],
  },
  {
    id: '3',
    name: 'Comedy',
    slug: 'comedy',
    description: 'Laugh out loud with these hilarious shows and movies',
    content: [],
  },
  {
    id: '4',
    name: 'Documentaries',
    slug: 'documentaries',
    description: 'Real stories, real people, real impact',
    content: [],
  },
  {
    id: '5',
    name: 'International Movies',
    slug: 'international',
    description: 'Stories from around the world',
    content: [],
  },
]

interface ContentRowProps {
  category: ContentCategory
}

function ContentRow({ category }: ContentRowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerView = 5
  const maxIndex = Math.max(0, category.content.length - itemsPerView)

  const nextSlide = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex))
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }

  if (category.content.length === 0) {
    return null
  }

  return (
    <div className="mb-12">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
            {category.name}
          </h2>
          {category.description && (
            <p className="text-gray-400 text-sm">
              {category.description}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            disabled={currentIndex === 0}
            className="text-white hover:bg-white/10 disabled:opacity-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            disabled={currentIndex >= maxIndex}
            className="text-white hover:bg-white/10 disabled:opacity-50"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content Carousel */}
      <div className="relative overflow-hidden">
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
          }}
        >
          {category.content.map((content) => (
            <div
              key={content.id}
              className="flex-shrink-0 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 px-2"
            >
              <ContentCard content={content} size="small" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ContentRows() {
  return (
    <section className="py-12 bg-netflix-black">
      <div className="container mx-auto px-4">
        {mockCategories.map((category) => (
          <ContentRow key={category.id} category={category} />
        ))}
      </div>
    </section>
  )
}
