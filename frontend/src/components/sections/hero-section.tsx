'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Play, Info, Volume2, VolumeX, Sparkles, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVideoPlayer } from '@/contexts/video-player-context'
import { VideoContent } from '@/types/video'
import { mapDbItemToVideoContent, extractItemsFromApiResponse } from '@/lib/content-mapper'

export function HeroSection() {
  const [content, setContent] = useState<VideoContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMuted, setIsMuted] = useState(true)
  const [isTrailerPlaying, setIsTrailerPlaying] = useState(false)
  const { playVideo } = useVideoPlayer()

  useEffect(() => {
    const fetchHeroContent = async () => {
      try {
        setLoading(true)
        // 1. Try featured endpoint
        const res = await fetch('/api/content/featured', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const items = extractItemsFromApiResponse(data)
          if (items.length > 0) {
            setContent(mapDbItemToVideoContent(items[0]))
            return
          }
        }

        // 2. Fallback to trending
        const trendingRes = await fetch('/api/content/trending', { credentials: 'include' })
        if (trendingRes.ok) {
          const data = await trendingRes.json()
          const items = extractItemsFromApiResponse(data)
          if (items.length > 0) {
            setContent(mapDbItemToVideoContent(items[0]))
            return
          }
        }

        // 3. Fallback to latest published item
        const latestRes = await fetch('/api/content?limit=1', { credentials: 'include' })
        if (latestRes.ok) {
          const data = await latestRes.json()
          const items = extractItemsFromApiResponse(data)
          if (items.length > 0) {
            setContent(mapDbItemToVideoContent(items[0]))
          }
        }
      } catch (err) {
        console.error('Failed to load hero content from database:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchHeroContent()
  }, [])

  const handlePlayTrailer = () => {
    setIsTrailerPlaying(true)
    setIsMuted(false)
  }

  const handlePlayContent = () => {
    if (content) {
      playVideo(content)
    }
  }

  if (loading || !content) {
    return (
      <section className="relative min-h-[560px] h-[82vh] max-h-[820px] bg-netflix-black flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-netflix-black via-gray-900/40 to-transparent animate-pulse" />
        <div className="relative z-10 text-center space-y-4 max-w-xl px-4">
          <div className="h-6 w-32 bg-gray-800 rounded-full mx-auto animate-pulse" />
          <div className="h-12 w-3/4 bg-gray-800 rounded-xl mx-auto animate-pulse" />
          <div className="h-4 w-full bg-gray-800/60 rounded mx-auto animate-pulse" />
        </div>
      </section>
    )
  }

  return (
    <section className="relative min-h-[560px] h-[82vh] max-h-[820px] overflow-hidden">
      {/* Background Video/Image */}
      <div className="absolute inset-0">
        {isTrailerPlaying && content.trailer ? (
          <video
            className="w-full h-full object-cover"
            autoPlay
            muted={isMuted}
            loop
            poster={content.backdrop || content.thumbnail}
          >
            <source src={content.trailer} type="video/mp4" />
          </video>
        ) : (
          <Image
            src={content.backdrop || content.thumbnail || '/placeholder-backdrop.svg'}
            alt={content.title}
            fill
            className="object-cover"
            priority
          />
        )}

        {/* Gradient Overlays */}
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 bg-gradient-to-t from-netflix-black via-netflix-black/25 to-transparent pointer-events-none" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            {/* Tag */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/30 backdrop-blur-md mb-3">
              <Sparkles className="h-3.5 w-3.5 text-netflix-red" />
              <span className="text-xs font-semibold uppercase tracking-wider text-netflix-red">
                StreamFlix Spotlight
              </span>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 animate-fade-in drop-shadow-lg">
              {content.title}
            </h1>

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-white/80 mb-4 animate-fade-in text-xs sm:text-sm">
              <span className="bg-netflix-red px-2 py-0.5 text-xs font-semibold rounded text-white">
                {content.maturityRating}
              </span>
              <span>{new Date(content.releaseDate).getFullYear()}</span>
              <span className="text-yellow-400 font-semibold">⭐ {content.rating.toFixed(1)}/10</span>
              <span>{content.genre.join(' • ')}</span>
            </div>

            {/* Description */}
            <p className="text-white/90 text-sm sm:text-base md:text-lg mb-8 max-w-xl animate-fade-in line-clamp-3 leading-relaxed drop-shadow">
              {content.description}
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
                <span>Play Now</span>
              </Button>

              <Button
                variant="netflix-outline"
                size="lg"
                onClick={handlePlayTrailer}
                className="flex items-center space-x-2"
              >
                <Info className="h-5 w-5" />
                <span>Watch Trailer</span>
              </Button>

              {content.videoUrl && (
                <Button
                  variant="outline"
                  size="lg"
                  asChild
                  className="border-emerald-500/50 bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-300 hover:text-white flex items-center space-x-2 shadow-lg shadow-emerald-950/40"
                >
                  <a href={content.videoUrl} download title="Download Torrent (Magnet / File)">
                    <Download className="h-5 w-5 text-emerald-400" />
                    <span>Download Torrent</span>
                  </a>
                </Button>
              )}

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
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 animate-bounce z-10 pointer-events-none">
        <div className="w-5 h-8 border-2 border-white/30 rounded-full flex justify-center">
          <div className="w-1 h-2 bg-white/50 rounded-full mt-1.5 animate-pulse" />
        </div>
      </div>
    </section>
  )
}
