'use client'

import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { useVideoPlayer } from '@/contexts/video-player-context'
import { ShakaPlayer } from './shaka-player'
import { Button } from '@/components/ui/button'

export function VideoPlayerModal() {
  const { currentVideo, stopVideo } = useVideoPlayer()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopVideo()
      }
    }
    if (currentVideo) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [currentVideo, stopVideo])

  if (!currentVideo) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Playing ${currentVideo.title}`}
      className="fixed inset-0 z-50 bg-black flex items-center justify-center animate-fade-in"
    >
      {/* Top Bar with Title and Close Button */}
      <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 md:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent pointer-events-auto">
        <div className="flex items-center space-x-3">
          <span className="text-netflix-red font-bold text-lg md:text-xl tracking-wider">StreamFlix</span>
          <span className="text-gray-400">|</span>
          <h2 className="text-white font-semibold text-sm md:text-base line-clamp-1">{currentVideo.title}</h2>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={stopVideo}
          className="rounded-full bg-black/60 hover:bg-white/20 text-white border border-white/20 h-10 w-10 transition-transform hover:scale-105"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close Player</span>
        </Button>
      </div>

      {/* Main Video Viewport */}
      <div className="w-full h-full flex items-center justify-center bg-black">
        <ShakaPlayer content={currentVideo} autoPlay />
      </div>
    </div>
  )
}
