'use client'

import { useEffect, useRef, useState } from 'react'
import { VideoPlayerControls } from './video-player-controls'
import { useVideoPlayer } from '@/contexts/video-player-context'
import { VideoContent } from '@/types/video'
import {
  ExternalLink,
  Copy,
  Check,
  Play,
  Film,
  Radio,
  Wifi,
  Users,
  Download,
  AlertCircle,
  Sparkles,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ShakaPlayerProps {
  content: VideoContent
  autoPlay?: boolean
  onEnded?: () => void
  onProgress?: (currentTime: number, duration: number) => void
}

function extractYouTubeId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  const match = url.match(regExp)
  return match && match[1] ? match[1] : null
}

function isDirectVideoStream(url?: string): boolean {
  if (!url || typeof url !== 'string') return false
  const lower = url.toLowerCase()
  return (
    (lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('/')) &&
    (lower.includes('.mp4') ||
      lower.includes('.m3u8') ||
      lower.includes('.mpd') ||
      lower.includes('.webm') ||
      lower.includes('.mkv') ||
      lower.includes('/stream'))
  )
}

function isMagnetUri(url?: string): boolean {
  return typeof url === 'string' && url.toLowerCase().startsWith('magnet:?xt=urn:btih:')
}

function extractInfoHash(magnetUri?: string): string {
  if (!magnetUri) return ''
  const match = magnetUri.match(/btih:([a-fA-F0-9]{32,40})/i)
  return match ? match[1].toUpperCase() : ''
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

function loadWebTorrentScript(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is undefined'))
  if ((window as any).WebTorrent) return Promise.resolve((window as any).WebTorrent)

  return new Promise((resolve, reject) => {
    const existing = document.getElementById('streamflix-webtorrent') as HTMLScriptElement | null
    if (existing) {
      if ((window as any).WebTorrent) {
        resolve((window as any).WebTorrent)
      } else {
        existing.addEventListener('load', () => resolve((window as any).WebTorrent))
        existing.addEventListener('error', reject)
      }
      return
    }

    const script = document.createElement('script')
    script.id = 'streamflix-webtorrent'
    script.src = '/js/webtorrent.min.js'
    script.async = true
    script.onload = () => resolve((window as any).WebTorrent)
    script.onerror = () => {
      // Fallback to CDN if local bundle fails
      const cdnScript = document.createElement('script')
      cdnScript.id = 'streamflix-webtorrent-cdn'
      cdnScript.src = 'https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js'
      cdnScript.async = true
      cdnScript.onload = () => resolve((window as any).WebTorrent)
      cdnScript.onerror = reject
      document.head.appendChild(cdnScript)
    }
    document.head.appendChild(script)
  })
}

export function ShakaPlayer({
  content,
  autoPlay = true,
  onEnded,
  onProgress,
}: ShakaPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const shakaInstanceRef = useRef<any>(null)
  const [copiedMagnet, setCopiedMagnet] = useState(false)
  const [activeTab, setActiveTab] = useState<'torrent' | 'trailer' | 'stream'>('torrent')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isControlsVisible, setIsControlsVisible] = useState(true)
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null)
  const [swarmTimeout, setSwarmTimeout] = useState(false)

  // WebTorrent Live Telemetry State
  const [torrentStats, setTorrentStats] = useState<{
    status: 'initializing' | 'connecting' | 'streaming' | 'ready' | 'idle' | 'error'
    downloadSpeed: number
    uploadSpeed: number
    progress: number
    numPeers: number
    downloaded: number
    totalLength: number
    fileName: string
    errorMessage?: string
  }>({
    status: 'initializing',
    downloadSpeed: 0,
    uploadSpeed: 0,
    progress: 0,
    numPeers: 0,
    downloaded: 0,
    totalLength: 0,
    fileName: '',
  })

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    playbackRate,
    isBuffering,
    playerRef,
    updateProgress,
    setIsBuffering,
    setIsPlaying,
  } = useVideoPlayer()

  // Identify media streams specific to this title
  const directVideoUrl = isDirectVideoStream(content.videoUrl)
    ? content.videoUrl
    : isDirectVideoStream(content.trailer)
    ? content.trailer
    : null

  const magnetUri = isMagnetUri(content.videoUrl)
    ? content.videoUrl
    : isMagnetUri(content.trailer)
    ? content.trailer
    : null

  const youTubeId =
    extractYouTubeId(content.trailer) ||
    extractYouTubeId(content.videoUrl) ||
    null

  const infoHash = extractInfoHash(magnetUri || undefined)

  // Determine initial playback mode:
  // 1. Official 1080p Trailer (instant playback, 0 delay) if available
  // 2. Direct In-Platform Torrent Streaming (if magnetUri is present)
  // 3. Direct Video Stream (HLS/MP4)
  useEffect(() => {
    setSwarmTimeout(false)
    if (youTubeId) {
      setActiveTab('trailer')
    } else if (magnetUri) {
      setActiveTab('torrent')
    } else if (directVideoUrl) {
      setActiveTab('stream')
    } else {
      setActiveTab('trailer')
    }
  }, [content.id, youTubeId, magnetUri, directVideoUrl])

  // Attach HTML5 video element to context playerRef when active
  useEffect(() => {
    if (videoRef.current && (activeTab === 'stream' || activeTab === 'torrent')) {
      ;(playerRef as any).current = videoRef.current
      videoRef.current.volume = volume
      videoRef.current.muted = isMuted
      videoRef.current.playbackRate = playbackRate
    }
  }, [playerRef, volume, isMuted, playbackRate, activeTab])

  // =========================================================================
  // 1. DIRECT IN-BROWSER WEBTORRENT ENGINE
  // =========================================================================
  useEffect(() => {
    if (activeTab !== 'torrent' || !magnetUri) return
    let isCancelled = false
    let client: any = null

    const initWebTorrent = async () => {
      try {
        setTorrentStats(prev => ({ ...prev, status: 'initializing', errorMessage: undefined }))
        setIsLoading(true)

        // Load client-side WebTorrent engine
        await loadWebTorrentScript()
        if (isCancelled) return

        const WT = (window as any).WebTorrent
        if (!WT) {
          throw new Error('WebTorrent library unavailable')
        }

        client = new WT({
          tracker: {
            rtcConfig: {
              iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' },
              ],
            },
          },
        })

        // Standard public WebRTC trackers for in-browser P2P
        const publicTrackers = [
          'wss://tracker.openwebtorrent.com',
          'wss://tracker.btorrent.xyz',
          'wss://tracker.fastcast.nz',
          'wss://tracker.webtorrent.dev',
        ]

        let fullMagnet = magnetUri
        for (const tr of publicTrackers) {
          if (!fullMagnet.includes(encodeURIComponent(tr))) {
            fullMagnet += `&tr=${encodeURIComponent(tr)}`
          }
        }

        setTorrentStats(prev => ({ ...prev, status: 'connecting' }))

        const torrent = client.add(fullMagnet, {
          announce: publicTrackers,
        })

        torrent.on('ready', () => {
          if (isCancelled) return
          // Find the best video file to stream
          const videoFile =
            torrent.files.find((f: any) => {
              const ext = f.name.split('.').pop()?.toLowerCase()
              return ['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)
            }) || torrent.files[0]

          if (videoFile && videoRef.current) {
            setTorrentStats(prev => ({
              ...prev,
              status: 'streaming',
              fileName: videoFile.name,
              totalLength: torrent.length,
            }))

            videoFile.renderTo(
              videoRef.current,
              { autoplay: autoPlay, controls: false },
              (renderErr: any) => {
                if (renderErr) {
                  console.warn('WebTorrent render error:', renderErr)
                } else {
                  setTorrentStats(prev => ({ ...prev, status: 'ready' }))
                  setIsLoading(false)
                }
              }
            )
          }
        })

        // Swarm connection timeout for WebRTC peers (7 seconds)
        const trackerTimeout = setTimeout(() => {
          if (!isCancelled) {
            setTorrentStats(current => {
              if (current.numPeers === 0 && current.downloaded === 0) {
                setSwarmTimeout(true)
                setIsLoading(false)
              }
              return current
            })
          }
        }, 7000)

        torrent.on('download', () => {
          if (isCancelled) return
          clearTimeout(trackerTimeout)
          setSwarmTimeout(false)
          setTorrentStats(prev => ({
            ...prev,
            status: prev.status === 'ready' ? 'ready' : 'streaming',
            downloadSpeed: torrent.downloadSpeed,
            uploadSpeed: torrent.uploadSpeed,
            progress: torrent.progress,
            numPeers: torrent.numPeers,
            downloaded: torrent.downloaded,
            totalLength: torrent.length || prev.totalLength,
          }))
          if (torrent.downloaded > 2 * 1024 * 1024) {
            setIsLoading(false)
          }
        })

        torrent.on('wire', () => {
          if (isCancelled) return
          clearTimeout(trackerTimeout)
          setSwarmTimeout(false)
          setTorrentStats(prev => ({ ...prev, numPeers: torrent.numPeers }))
        })

        torrent.on('error', (err: any) => {
          console.warn('WebTorrent swarm error:', err)
          if (isCancelled) return
          setTorrentStats(prev => ({
            ...prev,
            status: 'error',
            errorMessage: err.message || 'Swarm connection issue',
          }))
          setIsLoading(false)
        })
      } catch (err: any) {
        console.warn('Failed to initialize WebTorrent:', err)
        if (isCancelled) return
        setTorrentStats(prev => ({
          ...prev,
          status: 'error',
          errorMessage: err.message || 'Browser WebTorrent initialization failed',
        }))
        setIsLoading(false)
      }
    }

    initWebTorrent()

    return () => {
      isCancelled = true
      if (client) {
        try {
          client.destroy()
        } catch (e) {}
      }
    }
  }, [activeTab, magnetUri, autoPlay])

  // =========================================================================
  // 2. DIRECT HLS / DASH / MP4 STREAM ENGINE
  // =========================================================================
  useEffect(() => {
    if (activeTab !== 'stream' || !directVideoUrl) return
    let isCancelled = false
    const video = videoRef.current
    if (!video) return

    const isAdaptiveManifest =
      directVideoUrl.includes('.mpd') || directVideoUrl.includes('.m3u8')

    const setupNativePlayback = () => {
      if (isCancelled || !video) return
      video.src = directVideoUrl
      video.load()
      if (autoPlay) {
        video.play().catch(() => {
          video.muted = true
          video.play().catch(console.warn)
        })
      }
      setIsLoading(false)
      setError(null)
    }

    const initPlayer = async () => {
      setIsLoading(true)
      setError(null)

      if (!isAdaptiveManifest) {
        setupNativePlayback()
        return
      }

      try {
        const shakaModule = await import('shaka-player')
        const shaka: any = shakaModule.default || shakaModule

        if (shaka.polyfill) {
          shaka.polyfill.installAll()
        }

        if (!shaka.Player || !shaka.Player.isBrowserSupported()) {
          setupNativePlayback()
          return
        }

        if (isCancelled || !videoRef.current) return

        const player = new shaka.Player(videoRef.current)
        shakaInstanceRef.current = player

        player.configure({
          streaming: {
            bufferingGoal: 20,
            rebufferingGoal: 4,
            bufferBehind: 20,
            stallEnabled: true,
            useNativeHlsOnSafari: true,
          },
          abr: {
            enabled: true,
          },
        })

        player.addEventListener('error', (event: any) => {
          console.warn('Shaka stream error, falling back to native video:', event.detail)
          setupNativePlayback()
        })

        player.addEventListener('buffering', (event: any) => {
          setIsBuffering(event.buffering)
        })

        await player.load(directVideoUrl)

        if (!isCancelled) {
          setIsLoading(false)
          if (autoPlay && videoRef.current) {
            videoRef.current.play().catch(console.warn)
          }
        }
      } catch (shakaErr) {
        console.warn('Failed to load with Shaka Player, trying native:', shakaErr)
        setupNativePlayback()
      }
    }

    initPlayer()

    return () => {
      isCancelled = true
      if (shakaInstanceRef.current) {
        shakaInstanceRef.current.destroy().catch(() => {})
        shakaInstanceRef.current = null
      }
    }
  }, [directVideoUrl, autoPlay, activeTab, setIsBuffering])

  // Native HTML5 video event listeners
  useEffect(() => {
    const video = videoRef.current
    if (!video || (activeTab !== 'stream' && activeTab !== 'torrent')) return

    const handleTimeUpdate = () => {
      updateProgress(video.currentTime, video.duration || 0)
      onProgress?.(video.currentTime, video.duration || 0)
    }

    const handleEnded = () => {
      setIsPlaying?.(false)
      onEnded?.()
    }

    const handleLoadedMetadata = () => {
      updateProgress(video.currentTime, video.duration || 0)
      setIsLoading(false)
    }

    const handleWaiting = () => setIsBuffering(true)
    const handlePlaying = () => {
      setIsBuffering(false)
      setIsLoading(false)
      setIsPlaying?.(true)
    }
    const handlePause = () => setIsPlaying?.(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('play', handlePlaying)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('play', handlePlaying)
      video.removeEventListener('pause', handlePause)
    }
  }, [activeTab, onEnded, onProgress, setIsBuffering, setIsPlaying, updateProgress])

  const handleCopyMagnet = () => {
    if (!magnetUri) return
    navigator.clipboard.writeText(magnetUri)
    setCopiedMagnet(true)
    setTimeout(() => setCopiedMagnet(false), 2500)
  }

  const showControls = () => {
    setIsControlsVisible(true)
    if (controlsTimeout) clearTimeout(controlsTimeout)
    const timeout = setTimeout(() => {
      if (isPlaying) setIsControlsVisible(false)
    }, 3500)
    setControlsTimeout(timeout)
  }

  // Navigation Tabs Bar
  const renderNavTabs = () => (
    <div className="absolute top-16 left-0 right-0 z-40 px-6 py-2 bg-gradient-to-b from-black/85 via-black/50 to-transparent flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
      <div className="flex items-center gap-2">
        {activeTab === 'torrent' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Radio className="h-3 w-3 animate-pulse" />
            DIRECT IN-BROWSER TORRENT STREAM
          </span>
        )}
        {activeTab === 'trailer' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-netflix-red/20 text-netflix-red border border-netflix-red/30">
            <Film className="h-3 w-3" />
            OFFICIAL 1080p TRAILER & PREVIEW
          </span>
        )}
        {activeTab === 'stream' && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Play className="h-3 w-3" />
            DIRECT HLS / MP4 STREAM
          </span>
        )}
        <span className="text-xs text-gray-300 font-medium hidden md:inline">
          &quot;{content.title}&quot;
        </span>
      </div>

      <div className="flex items-center gap-2">
        {magnetUri && (
          <Button
            variant={activeTab === 'torrent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('torrent')}
            className={`h-8 text-xs font-semibold ${
              activeTab === 'torrent'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                : 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
            }`}
          >
            <Radio className="h-3.5 w-3.5 mr-1.5" />
            In-Browser Torrent
          </Button>
        )}

        <Button
          variant={activeTab === 'trailer' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('trailer')}
          className={`h-8 text-xs font-semibold ${
            activeTab === 'trailer'
              ? 'bg-netflix-red hover:bg-red-700 text-white'
              : 'border-netflix-red/40 bg-red-950/60 text-red-300 hover:bg-red-900/60'
          }`}
        >
          <Film className="h-3.5 w-3.5 mr-1.5" />
          Official Trailer
        </Button>

        {directVideoUrl && (
          <Button
            variant={activeTab === 'stream' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('stream')}
            className={`h-8 text-xs font-semibold ${
              activeTab === 'stream'
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'border-blue-500/40 bg-blue-950/60 text-blue-300 hover:bg-blue-900/60'
            }`}
          >
            <Play className="h-3.5 w-3.5 mr-1.5" />
            Direct Stream
          </Button>
        )}

        {magnetUri && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="h-8 text-xs font-semibold bg-emerald-950/80 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900 hover:text-white shadow-md shadow-emerald-950/50"
          >
            <a href={magnetUri} download title="Download Torrent / Open in BitTorrent Client">
              <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              Download Torrent
            </a>
          </Button>
        )}

        {magnetUri && (
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-8 text-xs border border-gray-700 bg-gray-900/80 text-gray-200 hover:text-white"
          >
            <a href={magnetUri} title="Launch in VLC / External Player">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5 text-purple-400" />
              VLC / Stremio
            </a>
          </Button>
        )}
      </div>
    </div>
  )

  // =========================================================================
  // VIEW 1: OFFICIAL YOUTUBE TRAILER
  // =========================================================================
  if (activeTab === 'trailer') {
    const embedUrl = youTubeId
      ? `https://www.youtube-nocookie.com/embed/${youTubeId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1&enablejsapi=1`
      : `https://www.youtube-nocookie.com/embed?listType=search&list=${encodeURIComponent(content.title + ' official trailer')}&autoplay=1`

    return (
      <div className="relative w-full h-full bg-black flex flex-col justify-between">
        {renderNavTabs()}
        <div className="w-full h-full pt-14 flex items-center justify-center">
          <iframe
            src={embedUrl}
            title={`${content.title} Official Trailer`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW 2: DIRECT HLS / MP4 STREAM
  // =========================================================================
  if (activeTab === 'stream' && directVideoUrl) {
    return (
      <div
        className="video-player-container relative w-full h-full bg-black flex items-center justify-center select-none"
        onMouseMove={showControls}
        onClick={showControls}
      >
        {renderNavTabs()}
        <video
          ref={videoRef}
          className="w-full h-full object-contain pt-14"
          autoPlay={autoPlay}
          playsInline
          poster={content.backdrop || content.thumbnail}
        />

        {(isLoading || isBuffering) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-netflix-red border-t-transparent shadow-lg"></div>
          </div>
        )}

        <VideoPlayerControls
          content={content}
          isVisible={isControlsVisible}
          onShowControls={showControls}
        />
      </div>
    )
  }

  // =========================================================================
  // VIEW 3: DIRECT IN-BROWSER WEBTORRENT STREAMING (Default for Magnet Releases)
  // =========================================================================
  return (
    <div
      className="video-player-container relative w-full h-full bg-black flex flex-col items-center justify-center select-none overflow-hidden"
      onMouseMove={showControls}
      onClick={showControls}
    >
      {/* Dynamic Nav Header */}
      {renderNavTabs()}

      {/* Background Ambience Backdrop */}
      {content.backdrop && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-2xl scale-105 pointer-events-none"
          style={{ backgroundImage: `url(${content.backdrop})` }}
        />
      )}

      {/* Main HTML5 Video Tag for Direct Torrent Playback */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain pt-14 z-10"
        autoPlay={autoPlay}
        playsInline
        controls={false}
        poster={content.backdrop || content.thumbnail}
      />

      {/* Live Swarm Telemetry HUD (Overlaid on Top of Video) */}
      <div
        className={`absolute bottom-20 left-6 right-6 z-30 transition-opacity duration-300 pointer-events-auto ${
          isControlsVisible ? 'opacity-100' : 'opacity-0 hover:opacity-100'
        }`}
      >
        <div className="max-w-4xl mx-auto bg-gray-950/85 backdrop-blur-md border border-gray-800 rounded-2xl p-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Swarm Status Indicator */}
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    torrentStats.status === 'ready' || torrentStats.status === 'streaming'
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3 w-3 ${
                    torrentStats.status === 'ready' || torrentStats.status === 'streaming'
                      ? 'bg-emerald-500'
                      : 'bg-amber-500'
                  }`}
                />
              </span>
              <div>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  {torrentStats.status === 'initializing' && 'Initializing WebTorrent Engine...'}
                  {torrentStats.status === 'connecting' && 'Connecting to WebRTC Tracker Swarm...'}
                  {torrentStats.status === 'streaming' && 'Streaming Torrent Direct to Browser'}
                  {torrentStats.status === 'ready' && 'Playing In-Browser Torrent Stream'}
                  {torrentStats.status === 'error' && 'Swarm Peering in Progress'}
                </p>
                <p className="text-[11px] text-gray-400">
                  {torrentStats.fileName ? torrentStats.fileName : `Target: ${content.title}`}
                </p>
              </div>
            </div>

            {/* Live Metrics: Speed, Peers, Buffer */}
            <div className="flex items-center gap-5 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <Download className="h-4 w-4" />
                <span>{formatBytes(torrentStats.downloadSpeed)}/s</span>
              </div>
              <div className="flex items-center gap-1.5 text-blue-400">
                <Users className="h-4 w-4" />
                <span>{torrentStats.numPeers} WebRTC Peers</span>
              </div>
              <div className="flex items-center gap-1.5 text-purple-300">
                <Wifi className="h-4 w-4" />
                <span>{(torrentStats.progress * 100).toFixed(1)}%</span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              {magnetUri && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyMagnet}
                  className="h-7 text-xs border-gray-700 bg-gray-800/80 text-gray-300 hover:text-white"
                >
                  {copiedMagnet ? (
                    <>
                      <Check className="h-3 w-3 mr-1 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Magnet
                    </>
                  )}
                </Button>
              )}
              {magnetUri && (
                <Button
                  variant="netflix"
                  size="sm"
                  asChild
                  className="h-7 text-xs shadow-md shadow-netflix-red/30"
                >
                  <a href={magnetUri}>
                    <ExternalLink className="h-3 w-3 mr-1" />
                    VLC / Stremio
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(torrentStats.progress * 100, 2)}%` }}
            />
          </div>

          {/* Sub-bar Helpful Hint */}
          <div className="mt-2 text-[10px] text-gray-400 flex items-center justify-between">
            <span>
              Direct P2P streaming over WebRTC tracker swarms. No third-party servers required.
            </span>
            <span className="text-gray-500">
              Downloaded: {formatBytes(torrentStats.downloaded)} of{' '}
              {formatBytes(torrentStats.totalLength)}
            </span>
          </div>
        </div>
      </div>

      {/* WebRTC Swarm Timeout Notice Card */}
      {swarmTimeout && torrentStats.numPeers === 0 && torrentStats.downloaded === 0 && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-black/85 backdrop-blur-md">
          <div className="max-w-xl w-full bg-gray-900/95 border border-purple-500/30 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Radio className="h-7 w-7 animate-pulse" />
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white">
              WebRTC In-Browser Swarm Notice
            </h3>
            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              This torrent&apos;s active seeders are on traditional BitTorrent networks (TCP/uTP DHT). Web browsers restrict raw TCP sockets, so in-browser streaming requires WebRTC-bridged peers.
            </p>
            <div className="p-3 bg-black/50 border border-gray-800 rounded-xl text-left text-xs text-gray-400 flex items-center justify-between font-mono">
              <span>SWARM SEEDERS:</span>
              <span className="text-emerald-400 font-semibold">Active on TCP/uTP (Desktop)</span>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {youTubeId && (
                <Button
                  variant="netflix"
                  onClick={() => setActiveTab('trailer')}
                  className="w-full sm:w-auto font-semibold shadow-lg shadow-netflix-red/30"
                >
                  <Film className="h-4 w-4 mr-2" />
                  Watch Official HD Trailer
                </Button>
              )}
              {magnetUri && (
                <Button
                  variant="outline"
                  asChild
                  className="w-full sm:w-auto border-purple-500/50 bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 font-semibold"
                >
                  <a href={magnetUri}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Launch in VLC / Stremio
                  </a>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSwarmTimeout(false)
                  setIsLoading(true)
                }}
                className="w-full sm:w-auto text-xs text-gray-400 hover:text-white"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Keep Retrying
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading & Buffer Spinner */}
      {!swarmTimeout && isLoading && torrentStats.downloaded < 1024 * 1024 && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 pointer-events-none p-6 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent shadow-xl mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">
            Establishing Direct In-Browser Torrent Stream
          </h3>
          <p className="text-xs text-gray-300 max-w-md">
            Connecting to high-speed WebRTC peer swarms for &quot;{content.title}&quot;. Video will begin
            playing automatically as sequential pieces arrive.
          </p>
          <div className="mt-4 flex items-center gap-3 pointer-events-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('trailer')}
              className="text-xs border-gray-700 bg-gray-900 text-gray-200"
            >
              <Film className="h-3.5 w-3.5 mr-1.5 text-netflix-red" />
              Watch Official HD Trailer Instead
            </Button>
            {magnetUri && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs border-purple-500/50 bg-purple-950/60 text-purple-200"
              >
                <a href={magnetUri}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Launch in External VLC / Stremio
                </a>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Full Player Controls (Seekbar, Volume, Fullscreen) */}
      <VideoPlayerControls
        content={content}
        isVisible={isControlsVisible}
        onShowControls={showControls}
      />
    </div>
  )
}
