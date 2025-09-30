'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, Plus, ThumbsUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VideoContent } from '@/types/video'
import { useVideoPlayer } from '@/contexts/video-player-context'
import { formatDuration } from '@/lib/utils'

interface ContentCardProps {
  content: VideoContent
  size?: 'small' | 'medium' | 'large'
}

export function ContentCard({ content, size = 'medium' }: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const { playVideo } = useVideoPlayer()

  const handlePlay = () => {
    playVideo(content)
  }

  const cardSizes = {
    small: 'aspect-video w-full max-w-[200px]',
    medium: 'aspect-video w-full max-w-[280px]',
    large: 'aspect-video w-full max-w-[350px]',
  }

  return (
    <div
      className={`content-card group relative ${cardSizes[size]} cursor-pointer`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
      <div className="relative w-full h-full rounded-lg overflow-hidden bg-gray-800">
        <Image
          src={content.thumbnail}
          alt={content.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="(max-width: 640px) 200px, (max-width: 1024px) 280px, 350px"
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlay}
            className="bg-black/50 hover:bg-black/70 text-white border-2 border-white/50 rounded-full w-12 h-12"
          >
            <Play className="h-6 w-6 fill-current" />
          </Button>
        </div>

        {/* Premium Badge */}
        {content.isPremium && (
          <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs font-bold px-2 py-1 rounded">
            PREMIUM
          </div>
        )}

        {/* Exclusive Badge */}
        {content.isExclusive && (
          <div className="absolute top-2 right-2 bg-netflix-red text-white text-xs font-bold px-2 py-1 rounded">
            EXCLUSIVE
          </div>
        )}
      </div>

      {/* Content Info - Shows on Hover */}
      <div className="content-info absolute top-full left-0 right-0 bg-netflix-black border border-gray-700 rounded-b-lg p-4 shadow-xl z-20">
        {/* Action Buttons */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlay}
              className="bg-white text-black hover:bg-gray-200 rounded-full w-8 h-8"
            >
              <Play className="h-4 w-4 fill-current" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="border border-gray-500 text-white hover:border-white rounded-full w-8 h-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="border border-gray-500 text-white hover:border-white rounded-full w-8 h-8"
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="border border-gray-500 text-white hover:border-white rounded-full w-8 h-8"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Metadata */}
        <div className="space-y-2">
          <h3 className="text-white font-semibold text-sm line-clamp-1">
            {content.title}
          </h3>
          
          <div className="flex items-center space-x-2 text-xs text-gray-300">
            <span className="bg-gray-700 px-1 rounded text-xs">
              {content.maturityRating}
            </span>
            <span>{formatDuration(content.duration)}</span>
            <span>⭐ {content.rating}</span>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {content.genre.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded"
              >
                {genre}
              </span>
            ))}
          </div>
          
          <p className="text-xs text-gray-400 line-clamp-2">
            {content.description}
          </p>
        </div>
      </div>
    </div>
  )
}
