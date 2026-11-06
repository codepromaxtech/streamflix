'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Tv,
  Zap,
  Play,
  RotateCcw,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Radio,
  Wifi,
  Film,
  Layers,
  ChevronDown,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface IptvChannel {
  id: string
  name: string
  logo: string
  category: string
  country: string
  countryCode: string
  language: string
  quality: string
  resolution: string
  streamUrl: string
  backupStreamUrl?: string
  isBdixSupported: boolean
  peeringType: string
  currentProgram?: string
  nextProgram?: string
  epgTime?: string
  viewCount: number
}

export interface PeeringNode {
  id: string
  name: string
  region: string
  countryCode: string
  latencyMs: number
  status: string
  description: string
}

interface IptvPlayerProps {
  channel: IptvChannel | null
  peeringNode: PeeringNode | null
}

function extractYouTubeId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  const match = url.match(regExp)
  return match && match[1] ? match[1] : null
}

function isHlsOrDashStream(url?: string): boolean {
  if (!url || typeof url !== 'string') return false
  const lower = url.toLowerCase()
  return (
    lower.includes('.m3u8') ||
    lower.includes('.mpd') ||
    lower.includes('/hls/') ||
    lower.includes('live-orgin') ||
    lower.includes('/playlist.m3u8')
  )
}

export function IptvPlayer({ channel, peeringNode }: IptvPlayerProps) {
  const [streamSource, setStreamSource] = useState<'primary' | 'backup' | 'search'>('primary')
  const [isLoading, setIsLoading] = useState(true)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const shakaPlayerRef = useRef<any>(null)

  // Reset stream source to primary whenever the active channel changes
  useEffect(() => {
    setStreamSource('primary')
    setPlayerError(null)
    setIsLoading(true)
  }, [channel?.id])

  // Resolve current target URL based on stream source selection
  const currentStreamUrl = React.useMemo(() => {
    if (!channel) return ''
    if (streamSource === 'primary') return channel.streamUrl
    if (streamSource === 'backup') return channel.backupStreamUrl || channel.streamUrl
    if (streamSource === 'search') {
      const query = encodeURIComponent(`${channel.name} Live Bangladesh`)
      return `https://www.youtube-nocookie.com/embed?listType=search&list=${query}&autoplay=1`
    }
    return channel.streamUrl
  }, [channel, streamSource])

  const youtubeId = extractYouTubeId(currentStreamUrl)
  const isAdaptive = isHlsOrDashStream(currentStreamUrl)

  // Destroy Shaka player instance safely
  const destroyShaka = useCallback(async () => {
    if (shakaPlayerRef.current) {
      try {
        await shakaPlayerRef.current.destroy()
      } catch (e) {
        console.warn('Error destroying Shaka instance:', e)
      }
      shakaPlayerRef.current = null
    }
  }, [])

  // Initialize and load Shaka Player for HLS/DASH streams
  useEffect(() => {
    if (!isAdaptive || !currentStreamUrl || !videoRef.current) {
      destroyShaka()
      return
    }

    let isCancelled = false

    const initShaka = async () => {
      try {
        setIsLoading(true)
        setPlayerError(null)
        await destroyShaka()

        if (isCancelled || !videoRef.current) return

        const shakaModule = await import('shaka-player')
        const shaka: any = (shakaModule as any).default || shakaModule

        if (shaka.polyfill) {
          shaka.polyfill.installAll()
        }

        if (!shaka.Player || !shaka.Player.isBrowserSupported()) {
          console.warn('Shaka is not supported on this browser, trying native video playback')
          if (videoRef.current) {
            videoRef.current.src = currentStreamUrl
            videoRef.current.play().catch(console.warn)
          }
          setIsLoading(false)
          return
        }

        if (isCancelled || !videoRef.current) return

        const player = new shaka.Player(videoRef.current)
        shakaPlayerRef.current = player

        player.configure({
          streaming: {
            bufferingGoal: 10,
            rebufferingGoal: 2,
            bufferBehind: 15,
            stallEnabled: true,
            useNativeHlsOnSafari: true,
            retryParameters: {
              maxAttempts: 3,
              baseDelay: 1000,
              backoffFactor: 2,
            },
          },
          abr: {
            enabled: true,
          },
        })

        player.addEventListener('error', (event: any) => {
          console.warn('Shaka player stream error:', event.detail)
          if (!isCancelled) {
            setPlayerError(
              'Live stream feed temporarily unavailable from the upstream broadcaster. Try switching to the Backup or YouTube Live feed.'
            )
          }
        })

        player.addEventListener('buffering', (event: any) => {
          if (!isCancelled) {
            setIsBuffering(event.buffering)
          }
        })

        await player.load(currentStreamUrl)

        if (!isCancelled) {
          setIsLoading(false)
          if (videoRef.current) {
            videoRef.current.play().catch((playErr) => {
              console.warn('Autoplay prevented, attempting muted play:', playErr)
              if (videoRef.current) {
                videoRef.current.muted = true
                videoRef.current.play().catch(console.warn)
              }
            })
          }
        }
      } catch (err: any) {
        console.warn('Shaka load failure:', err)
        if (!isCancelled) {
          setIsLoading(false)
          // Attempt native HTML5 video if Safari
          if (videoRef.current && videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = currentStreamUrl
            videoRef.current.play().catch(console.warn)
          } else {
            setPlayerError(
              'Broadcast stream disconnected or peering link timeout. Switch to the live backup or search feed below.'
            )
          }
        }
      }
    }

    initShaka()

    return () => {
      isCancelled = true
      destroyShaka()
    }
  }, [currentStreamUrl, isAdaptive, destroyShaka])

  const handleCopyLink = () => {
    if (!currentStreamUrl) return
    navigator.clipboard.writeText(currentStreamUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!channel) {
    return (
      <div className="flex flex-col bg-gray-950 border border-gray-800/90 rounded-3xl overflow-hidden shadow-2xl">
        <div className="aspect-video w-full bg-black flex flex-col items-center justify-center p-8 text-center text-gray-500">
          <Tv className="h-16 w-16 mb-4 text-gray-700 animate-pulse" />
          <h3 className="text-lg font-bold text-gray-300">No Channel Selected</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1">
            Browse the catalog below and select any live broadcast channel to begin streaming.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-gray-950 border border-gray-800/90 rounded-3xl overflow-hidden shadow-2xl">
      {/* Stream Switching Controls Bar */}
      <div className="px-4 py-2.5 bg-black/80 border-b border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 font-semibold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Radio className="h-3 w-3 text-red-500" />
            Stream Feed:
          </span>

          <div className="flex items-center gap-1 bg-gray-900 p-0.5 rounded-lg border border-gray-800">
            <button
              onClick={() => {
                setStreamSource('primary')
                setPlayerError(null)
              }}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all flex items-center gap-1 ${
                streamSource === 'primary'
                  ? 'bg-netflix-red text-white shadow-sm font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Zap className="h-2.5 w-2.5 text-yellow-300" />
              Primary {channel.isBdixSupported ? '(BDIX)' : ''}
            </button>

            {channel.backupStreamUrl && (
              <button
                onClick={() => {
                  setStreamSource('backup')
                  setPlayerError(null)
                }}
                className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all flex items-center gap-1 ${
                  streamSource === 'backup'
                    ? 'bg-netflix-red text-white shadow-sm font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Layers className="h-2.5 w-2.5 text-blue-300" />
                Backup Stream
              </button>
            )}

            <button
              onClick={() => {
                setStreamSource('search')
                setPlayerError(null)
              }}
              className={`px-2.5 py-1 rounded-md font-medium text-[11px] transition-all flex items-center gap-1 ${
                streamSource === 'search'
                  ? 'bg-netflix-red text-white shadow-sm font-bold'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Film className="h-2.5 w-2.5 text-emerald-300" />
              Live Search Embed
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="h-7 px-2 text-[11px] text-gray-400 hover:text-white hover:bg-gray-800"
            title="Copy stream link for external player like VLC or MPV"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied URL</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                <span>Copy M3U8/Live URL</span>
              </>
            )}
          </Button>

          <a
            href={currentStreamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 h-7 px-2 text-[11px] text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
            title="Open in new window"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">External</span>
          </a>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        {/* Shaka Video Element for HLS / DASH */}
        {isAdaptive && (
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
        )}

        {/* YouTube Direct ID Embed */}
        {!isAdaptive && youtubeId && (
          <iframe
            key={youtubeId}
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&enablejsapi=1`}
            title={channel.name}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}

        {/* YouTube Search Embed or Direct Web Embed */}
        {!isAdaptive && !youtubeId && (
          <iframe
            key={currentStreamUrl}
            src={currentStreamUrl}
            title={channel.name}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        )}

        {/* Buffering Indicator */}
        {isBuffering && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center pointer-events-none z-20">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/80 border border-gray-700 text-xs text-white">
              <span className="h-2 w-2 rounded-full bg-netflix-red animate-ping" />
              Buffering live BDIX stream...
            </div>
          </div>
        )}

        {/* Top Stream Badges Overlay */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-black bg-red-600 text-white shadow-lg tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            LIVE
          </span>

          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/75 backdrop-blur-md text-emerald-400 border border-gray-800 font-mono">
            {channel.quality || '1080p FHD'}
          </span>

          {channel.isBdixSupported && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-mono flex items-center gap-1">
              <Zap className="h-2.5 w-2.5 text-emerald-400" />
              BDIX ROUTED
            </span>
          )}

          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-900/80 text-gray-300 border border-gray-700 font-mono">
            {isAdaptive ? 'HLS (Shaka)' : youtubeId ? 'YouTube Live' : 'Web Stream'}
          </span>
        </div>

        {/* Fallback Error Overlay */}
        {playerError && (
          <div className="absolute inset-0 z-30 bg-gray-950/95 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="h-12 w-12 text-netflix-red mb-3 animate-bounce" />
            <h3 className="text-base font-bold text-white mb-1">Live Stream Signal Issue</h3>
            <p className="text-xs text-gray-400 max-w-md mb-4">{playerError}</p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {channel.backupStreamUrl && streamSource !== 'backup' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setStreamSource('backup')
                    setPlayerError(null)
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  Try Backup Stream
                </Button>
              )}

              {streamSource !== 'search' && (
                <Button
                  size="sm"
                  onClick={() => {
                    setStreamSource('search')
                    setPlayerError(null)
                  }}
                  className="bg-netflix-red hover:bg-red-700 text-white text-xs font-bold"
                >
                  <Film className="h-3.5 w-3.5 mr-1.5" />
                  Switch to Dynamic Live Search
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="border-gray-700 bg-gray-900 hover:bg-gray-800 text-xs text-gray-200"
              >
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy URL for VLC
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Telemetry Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-b from-gray-900/90 to-gray-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-t border-gray-800/80">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={channel.logo}
            alt={channel.name}
            className="h-12 w-12 rounded-xl object-contain bg-white/10 p-1 border border-gray-700 shadow-md shrink-0"
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = '/placeholder-poster.svg'
            }}
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white">{channel.name}</h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                {channel.country}
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-500/30">
                {channel.category}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-1 flex items-center gap-1.5">
              <span className="font-semibold text-emerald-400">NOW AIRING:</span>
              <span>{channel.currentProgram || '24/7 Live Broadcast Feed'}</span>
            </p>
          </div>
        </div>

        {/* Active Peering Node Badge */}
        <div className="flex items-center gap-2 self-end sm:self-center bg-black/60 px-3 py-2 rounded-xl border border-gray-800 text-xs font-mono">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-gray-400">ROUTE:</span>
          <span className="text-white font-semibold">
            {peeringNode ? peeringNode.name.split('(')[0] : 'BDIX Core Peering'}
          </span>
          <span className="text-emerald-400 font-bold">
            {peeringNode ? `${peeringNode.latencyMs}ms` : '9ms'}
          </span>
        </div>
      </div>
    </div>
  )
}
