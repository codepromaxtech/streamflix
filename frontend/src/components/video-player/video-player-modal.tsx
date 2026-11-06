'use client'

import React, { useEffect, useState } from 'react'
import { X, Download, Check } from 'lucide-react'
import { useVideoPlayer } from '@/contexts/video-player-context'
import { ShakaPlayer } from './shaka-player'
import { Button } from '@/components/ui/button'

export function VideoPlayerModal() {
  const { currentVideo, stopVideo } = useVideoPlayer()
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    if (!currentVideo?.videoUrl) return

    if (currentVideo.videoUrl.startsWith('magnet:')) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(currentVideo.videoUrl).catch(() => {})
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }

    const a = document.createElement('a')
    a.href = currentVideo.videoUrl
    a.download = `${currentVideo.title.replace(/[^a-zA-Z0-9]/g, '_')}.torrent`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

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

        <div className="flex items-center space-x-2">
          {currentVideo.videoUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className={`h-9 px-3 text-xs font-semibold rounded-lg border transition-all ${
                copied
                  ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                  : 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-500/50 text-emerald-300 hover:text-white shadow-lg shadow-emerald-950/50'
              }`}
              title={copied ? 'Magnet URI Copied to Clipboard!' : 'Download Torrent / Magnet'}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1.5 text-emerald-400" />
                  Copied Magnet
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1.5 text-emerald-400" />
                  Download Torrent
                </>
              )}
            </Button>
          )}

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
      </div>

      {/* Main Video Viewport */}
      <div className="w-full h-full flex items-center justify-center bg-black">
        <ShakaPlayer content={currentVideo} autoPlay />
      </div>
    </div>
  )
}
