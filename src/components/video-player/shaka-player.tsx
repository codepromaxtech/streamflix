'use client'

import { useEffect, useRef, useState } from 'react'
import { VideoPlayerControls } from './video-player-controls'
import { useVideoPlayer } from '@/contexts/video-player-context'
import { VideoContent } from '@/types/video'

interface ShakaPlayerProps {
  content: VideoContent
  autoPlay?: boolean
  onEnded?: () => void
  onProgress?: (currentTime: number, duration: number) => void
}

export function ShakaPlayer({ 
  content, 
  autoPlay = false, 
  onEnded, 
  onProgress 
}: ShakaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null)
  
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isFullscreen,
    quality,
    playbackRate,
    subtitles,
    isBuffering,
    updateProgress,
    setIsBuffering,
  } = useVideoPlayer()

  useEffect(() => {
    const initializePlayer = async () => {
      if (!videoRef.current) return

      try {
        // Dynamically import Shaka Player
        const shaka = await import('shaka-player/dist/shaka-player.ui.js')
        
        // Install built-in polyfills to patch browser incompatibilities
        shaka.polyfill.installAll()

        // Check if browser is supported
        if (!shaka.Player.isBrowserSupported()) {
          setError('Browser not supported for video playback')
          return
        }

        // Create player instance
        const player = new shaka.Player(videoRef.current)
        playerRef.current = player

        // Configure player
        player.configure({
          streaming: {
            bufferingGoal: 30,
            rebufferingGoal: 5,
            bufferBehind: 30,
            ignoreTextStreamFailures: true,
            alwaysStreamText: false,
            startAtSegmentBoundary: false,
            smallGapLimit: 0.5,
            jumpLargeGaps: false,
            durationBackoff: 1,
            forceTransmuxTS: false,
            safeSeekOffset: 5,
            stallEnabled: true,
            stallThreshold: 1,
            stallSkip: 0.1,
            useNativeHlsOnSafari: true,
          },
          drm: {
            retryParameters: {
              timeout: 30000,
              maxAttempts: 2,
              baseDelay: 1000,
              backoffFactor: 2,
              fuzzFactor: 0.5,
            },
          },
          abr: {
            enabled: true,
            useNetworkInformation: true,
            defaultBandwidthEstimate: 1000000, // 1 Mbps
            restrictions: {
              minBandwidth: 0,
              maxBandwidth: Infinity,
              minHeight: 0,
              maxHeight: Infinity,
              minWidth: 0,
              maxWidth: Infinity,
              minPixels: 0,
              maxPixels: Infinity,
            },
          },
        })

        // Error handling
        player.addEventListener('error', (event: any) => {
          console.error('Shaka Player Error:', event.detail)
          setError(`Playback error: ${event.detail.message}`)
          setIsLoading(false)
        })

        // Buffering events
        player.addEventListener('buffering', (event: any) => {
          setIsBuffering(event.buffering)
        })

        // Adaptation events
        player.addEventListener('adaptation', () => {
          const tracks = player.getVariantTracks()
          const activeTrack = tracks.find(track => track.active)
          if (activeTrack) {
            console.log(`Quality changed to: ${activeTrack.height}p`)
          }
        })

        // Load the content
        await player.load(content.videoUrl)
        setIsLoading(false)

        // Set up subtitles if available
        if (content.subtitles && content.subtitles.length > 0) {
          const textTracks = player.getTextTracks()
          if (textTracks.length > 0) {
            const defaultSubtitle = content.subtitles.find(sub => sub.default)
            if (defaultSubtitle) {
              player.selectTextTrack(textTracks.find(track => 
                track.language === defaultSubtitle.language
              ))
            }
          }
        }

      } catch (err) {
        console.error('Failed to initialize Shaka Player:', err)
        setError('Failed to initialize video player')
        setIsLoading(false)
      }
    }

    initializePlayer()

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
        playerRef.current = null
      }
    }
  }, [content.videoUrl, content.subtitles, setIsBuffering])

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      updateProgress(video.currentTime, video.duration)
      onProgress?.(video.currentTime, video.duration)
    }

    const handleEnded = () => {
      onEnded?.()
    }

    const handleLoadedMetadata = () => {
      updateProgress(video.currentTime, video.duration)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
    }
  }, [updateProgress, onEnded, onProgress])

  // Auto-hide controls
  const showControls = () => {
    setIsControlsVisible(true)
    if (controlsTimeout) {
      clearTimeout(controlsTimeout)
    }
    const timeout = setTimeout(() => {
      if (isPlaying) {
        setIsControlsVisible(false)
      }
    }, 3000)
    setControlsTimeout(timeout)
  }

  const handleMouseMove = () => {
    showControls()
  }

  const handleClick = () => {
    showControls()
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-black text-white">
        <div className="text-center">
          <p className="text-red-500 mb-2">⚠️ Playback Error</p>
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="video-player-container relative w-full h-full bg-black"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        className="w-full h-full"
        autoPlay={autoPlay}
        playsInline
        poster={content.thumbnail}
      />

      {/* Loading Spinner */}
      {(isLoading || isBuffering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        </div>
      )}

      {/* Video Controls */}
      <VideoPlayerControls 
        content={content}
        isVisible={isControlsVisible}
        onShowControls={showControls}
      />
    </div>
  )
}
