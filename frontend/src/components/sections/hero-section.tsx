'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Play, Info, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVideoPlayer } from '@/contexts/video-player-context'

// Mock featured content - in production this would come from your API
const featuredContent = {
  id: '1',
  title: 'Stranger Things',
  description: 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces, and one strange little girl.',
  backdrop: '/images/stranger-things-backdrop.jpg',
  trailer: '/videos/stranger-things-trailer.mp4',
  videoUrl: '/videos/stranger-things-s1e1.mp4',
  duration: 3600,
  releaseDate: '2016-07-15',
  rating: 8.7,
  maturityRating: 'TV-14',
  genre: ['Drama', 'Fantasy', 'Horror'],
  cast: [],
  director: ['The Duffer Brothers'],
  producer: ['Shawn Levy'],
  language: 'English',
  subtitles: [],
  audioTracks: [],
  qualityLevels: [],
  type: 'series' as const,
  season: 1,
  episode: 1,
  isExclusive: true,
  isPremium: false,
  tags: ['trending', 'popular'],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
}

export function HeroSection() {
  const [isMuted, setIsMuted] = useState(true)
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false)
  const { playVideo } = useVideoPlayer()

  const handlePlayTrailer = () => {
    setIsTrailerPlaying(true)
    setIsMuted(false)
  }

  const handlePlayContent = () => {
    playVideo(featuredContent)
  }

  return (
    <section className="relative h-screen overflow-hidden">
      {/* Background Video/Image */}
      <div className="absolute inset-0">
        {isTrailerPlaying ? (
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted={isMuted}
            loop
            poster={featuredContent.backdrop}
          >
            <source src={featuredContent.trailer} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={featuredContent.backdrop}
            alt={featuredContent.title}
            fill
            className="object-cover"
            priority
          />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 hero-gradient" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 animate-fade-in">
              {featuredContent.title}
            </h1>

            {/* Metadata */}
            <div className="flex items-center space-x-4 text-white/80 mb-4 animate-fade-in">
              <span className="bg-netflix-red px-2 py-1 text-xs font-semibold rounded">
                {featuredContent.maturityRating}
              </span>
              <span>{new Date(featuredContent.releaseDate).getFullYear()}</span>
              <span>⭐ {featuredContent.rating}/10</span>
              <span>{featuredContent.genre.join(' • ')}</span>
            </div>

            {/* Description */}
            <p className="text-white/90 text-lg mb-8 max-w-xl animate-fade-in">
              {featuredContent.description}
            </p>

            {/* Action Buttons */}
            <div className="flex items-center space-x-4 animate-fade-in">
              <Button
                variant="netflix"
                size="lg"
                onClick={handlePlayContent}
                className="flex items-center space-x-2"
              >
                <Play className="h-5 w-5 fill-current" />
                <span>Play</span>
              </Button>

              <Button
                variant="netflix-outline"
                size="lg"
                onClick={handlePlayTrailer}
                className="flex items-center space-x-2"
              >
                <Info className="h-5 w-5" />
                <span>More Info</span>
              </Button>

              {/* Mute/Unmute Button */}
              {isTrailerPlaying && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white border border-white/30 hover:bg-white/10"
                >
                  {isMuted ? (
                    <VolumeX className="h-5 w-5" />
                  ) : (
                    <Volume2 className="h-5 w-5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-white/50 rounded-full mt-2 animate-pulse" />
        </div>
      </div>
    </section>
  )
}
