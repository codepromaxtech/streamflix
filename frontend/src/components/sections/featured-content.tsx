'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ContentCard } from '@/components/content-card'
import { VideoContent } from '@/types/video'

// Mock data - in production this would come from your API
const mockFeaturedContent: VideoContent[] = [
  {
    id: '2',
    title: 'The Crown',
    description: 'Follows the political rivalries and romance of Queen Elizabeth II\'s reign.',
    thumbnail: '/images/the-crown-thumb.jpg',
    backdrop: '/images/the-crown-backdrop.jpg',
    videoUrl: '/videos/the-crown-s1e1.mp4',
    duration: 3600,
    releaseDate: '2016-11-04',
    rating: 8.7,
    maturityRating: 'TV-MA',
    genre: ['Drama', 'History'],
    cast: [],
    director: ['Peter Morgan'],
    producer: ['Andy Harries'],
    language: 'English',
    subtitles: [],
    audioTracks: [],
    qualityLevels: [],
    type: 'series',
    isExclusive: true,
    isPremium: true,
    tags: ['award-winning', 'drama'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '3',
    title: 'Squid Game',
    description: 'Hundreds of cash-strapped players accept a strange invitation to compete in children\'s games.',
    thumbnail: '/images/squid-game-thumb.jpg',
    backdrop: '/images/squid-game-backdrop.jpg',
    videoUrl: '/videos/squid-game-s1e1.mp4',
    duration: 3600,
    releaseDate: '2021-09-17',
    rating: 8.0,
    maturityRating: 'TV-MA',
    genre: ['Thriller', 'Drama'],
    cast: [],
    director: ['Hwang Dong-hyuk'],
    producer: ['Kim Ji-yeon'],
    language: 'Korean',
    subtitles: [],
    audioTracks: [],
    qualityLevels: [],
    type: 'series',
    isExclusive: true,
    isPremium: false,
    tags: ['trending', 'international'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  {
    id: '4',
    title: 'Dune',
    description: 'Paul Atreides leads nomadic tribes in a revolt against the evil Harkonnen.',
    thumbnail: '/images/dune-thumb.jpg',
    backdrop: '/images/dune-backdrop.jpg',
    videoUrl: '/videos/dune.mp4',
    duration: 9360, // 2h 36m
    releaseDate: '2021-10-22',
    rating: 8.0,
    maturityRating: 'PG-13',
    genre: ['Sci-Fi', 'Adventure'],
    cast: [],
    director: ['Denis Villeneuve'],
    producer: ['Mary Parent'],
    language: 'English',
    subtitles: [],
    audioTracks: [],
    qualityLevels: [],
    type: 'movie',
    isExclusive: false,
    isPremium: true,
    tags: ['blockbuster', 'sci-fi'],
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
  },
  // Add more mock content...
]

export function FeaturedContent() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const itemsPerView = 4
  const maxIndex = Math.max(0, mockFeaturedContent.length - itemsPerView)

  const nextSlide = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex))
  }

  const prevSlide = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }

  return (
    <section className="py-12 bg-netflix-black">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            Featured Content
          </h2>
          
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
            {mockFeaturedContent.map((content) => (
              <div
                key={content.id}
                className="flex-shrink-0 w-full sm:w-1/2 md:w-1/3 lg:w-1/4 px-2"
              >
                <ContentCard content={content} />
              </div>
            ))}
          </div>
        </div>

        {/* Indicators */}
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: maxIndex + 1 }).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-netflix-red' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
