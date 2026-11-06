'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Play, Plus, ThumbsUp, Info, Download, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VideoContent } from '@/types/video'
import { useVideoPlayer } from '@/contexts/video-player-context'
import { formatDuration } from '@/lib/utils'

interface ContentCardProps {
  content: VideoContent
  size?: 'small' | 'medium' | 'large'
}

export function ContentCard({ content, size = 'medium' }: ContentCardProps) {
  const { playVideo } = useVideoPlayer()
  const [imgSrc, setImgSrc] = useState(
    content.thumbnail || '/placeholder-poster.svg'
  )
  const [downloadCopied, setDownloadCopied] = useState(false)

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    playVideo(content)
  }

  const handleDownloadTorrent = (e: React.MouseEvent) => {
    e.stopPropagation()
    const targetUrl = content.videoUrl
    if (!targetUrl) return

    // If magnet URI, copy to clipboard for user convenience and notify
    if (targetUrl.startsWith('magnet:')) {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(targetUrl).catch(() => {})
      }
      setDownloadCopied(true)
      setTimeout(() => setDownloadCopied(false), 2500)
    }

    // Direct window trigger for BitTorrent / external clients / direct downloads
    const a = document.createElement('a')
    a.href = targetUrl
    a.download = `${content.title.replace(/[^a-zA-Z0-9]/g, '_')}.torrent`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div
      className="content-card group relative flex flex-col h-full rounded-xl overflow-hidden bg-gray-900/90 border border-gray-800/80 shadow-md hover:border-gray-700 hover:shadow-2xl hover:shadow-black/70 hover:-translate-y-1.5 transition-all duration-300 cursor-pointer"
      onClick={() => playVideo(content)}
    >
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-video overflow-hidden bg-gray-950">
        <Image
          src={imgSrc}
          alt={content.title}
          fill
          onError={() => setImgSrc('/placeholder-poster.svg')}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          sizes="(max-width: 640px) 240px, (max-width: 1024px) 300px, 360px"
        />

        {/* Subtle Dark Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-black/20 group-hover:from-gray-950/40 transition-colors duration-300" />

        {/* Center Hover Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-netflix-red/90 text-white shadow-lg shadow-netflix-red/30 rounded-full w-11 h-11 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
            <Play className="h-5 w-5 fill-current ml-0.5" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5 z-10">
          {content.isPremium && (
            <span className="bg-gradient-to-r from-amber-400 to-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow">
              PREMIUM
            </span>
          )}
          {content.isExclusive && (
            <span className="bg-netflix-red text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
              EXCLUSIVE
            </span>
          )}
        </div>

        {/* Download Torrent Quick Action Badge on Thumbnail */}
        {content.videoUrl && (
          <button
            type="button"
            onClick={handleDownloadTorrent}
            title={downloadCopied ? 'Magnet URI Copied to Clipboard!' : 'Download Torrent / Magnet'}
            className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 bg-black/80 hover:bg-emerald-600 text-gray-200 hover:text-white px-2 py-1 rounded-md text-[10px] font-semibold border border-white/20 backdrop-blur-md shadow-md transition-all duration-200 group/dl cursor-pointer"
          >
            {downloadCopied ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" />
                <span className="text-emerald-300 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Download className="h-3 w-3 text-emerald-400 group-hover/dl:text-white transition-colors" />
                <span className="hidden sm:inline">Torrent</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Card Body - Contained details that never overlap other sections */}
      <div className="p-3.5 flex flex-col justify-between flex-grow bg-gradient-to-b from-gray-900/90 to-gray-950">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-white font-semibold text-sm line-clamp-1 group-hover:text-netflix-red transition-colors">
              {content.title}
            </h3>
            {content.rating > 0 && (
              <span className="text-xs font-medium text-amber-400 shrink-0">
                ⭐ {content.rating}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-xs text-gray-400">
            {content.maturityRating && (
              <span className="bg-gray-800 border border-gray-700 text-gray-300 px-1.5 py-0.2 rounded text-[10px] font-medium">
                {content.maturityRating}
              </span>
            )}
            {content.duration > 0 && (
              <span>{formatDuration(content.duration)}</span>
            )}
            {content.type && (
              <span className="capitalize">{content.type}</span>
            )}
          </div>

          {content.description && (
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
              {content.description}
            </p>
          )}
        </div>

        {/* Action Controls & Genre Pills */}
        <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-gray-800/80">
          <div className="flex items-center space-x-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlay}
              aria-label={`Play ${content.title}`}
              title="Play Now"
              className="bg-white text-black hover:bg-gray-200 rounded-full w-7 h-7"
            >
              <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
            </Button>
            {content.videoUrl && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownloadTorrent}
                aria-label={`Download Torrent for ${content.title}`}
                title={downloadCopied ? 'Magnet URI Copied!' : 'Download Torrent / Magnet'}
                className={`rounded-full w-7 h-7 border transition-all ${
                  downloadCopied
                    ? 'border-emerald-400 bg-emerald-950 text-emerald-300'
                    : 'border-emerald-500/50 bg-emerald-950/40 text-emerald-400 hover:text-white hover:bg-emerald-600'
                }`}
              >
                {downloadCopied ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
              aria-label="Add to watchlist"
              title="Add to Watchlist"
              className="border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 rounded-full w-7 h-7"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
              aria-label="Like content"
              title="Like"
              className="border border-gray-700 text-gray-300 hover:text-white hover:border-gray-500 rounded-full w-7 h-7"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
          </div>

          {content.genre && content.genre.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-end">
              {content.genre.slice(0, 2).map((genre) => (
                <span
                  key={genre}
                  className="text-[10px] text-gray-400 bg-gray-800/80 px-1.5 py-0.5 rounded border border-gray-700/50"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
