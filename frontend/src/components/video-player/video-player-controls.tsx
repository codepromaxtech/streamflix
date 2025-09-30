'use client'

import { useState } from 'react'
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Settings, 
  Subtitles,
  SkipBack,
  SkipForward,
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useVideoPlayer } from '@/contexts/video-player-context'
import { VideoContent } from '@/types/video'
import { formatDuration } from '@/lib/utils'

interface VideoPlayerControlsProps {
  content: VideoContent
  isVisible: boolean
  onShowControls: () => void
}

export function VideoPlayerControls({ 
  content, 
  isVisible, 
  onShowControls 
}: VideoPlayerControlsProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [showSubtitles, setShowSubtitles] = useState(false)
  
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
    playerRef,
    pauseVideo,
    seekTo,
    changeVolume,
    toggleMute,
    toggleFullscreen,
    changeQuality,
    changePlaybackRate,
    toggleSubtitles,
  } = useVideoPlayer()

  const handlePlayPause = () => {
    if (!playerRef.current) return
    
    if (isPlaying) {
      playerRef.current.pause()
      pauseVideo()
    } else {
      playerRef.current.play()
    }
  }

  const handleSeek = (value: number[]) => {
    const newTime = (value[0] / 100) * duration
    seekTo(newTime)
  }

  const handleVolumeChange = (value: number[]) => {
    changeVolume(value[0] / 100)
  }

  const handleSkipBack = () => {
    seekTo(Math.max(0, currentTime - 10))
  }

  const handleSkipForward = () => {
    seekTo(Math.min(duration, currentTime + 10))
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const qualityOptions = ['auto', '4K', '1080p', '720p', '480p', '360p']
  const playbackRateOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  return (
    <div 
      className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Top Gradient */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />
      
      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4">
        {/* Progress Bar */}
        <div className="mb-4 pointer-events-auto">
          <Slider
            value={[progress]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white/70 mt-1">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between pointer-events-auto">
          {/* Left Controls */}
          <div className="flex items-center space-x-2">
            {/* Play/Pause */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6 fill-current" />
              ) : (
                <Play className="h-6 w-6 fill-current" />
              )}
            </Button>

            {/* Skip Back */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipBack}
              className="text-white hover:bg-white/20"
            >
              <SkipBack className="h-5 w-5" />
            </Button>

            {/* Skip Forward */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkipForward}
              className="text-white hover:bg-white/20"
            >
              <SkipForward className="h-5 w-5" />
            </Button>

            {/* Volume */}
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              
              <div className="w-20">
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Title */}
            <div className="ml-4">
              <h3 className="text-white font-semibold text-sm">
                {content.title}
              </h3>
              {content.type === 'series' && (
                <p className="text-white/70 text-xs">
                  S{content.season}E{content.episode}
                </p>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            {/* Subtitles */}
            {content.subtitles && content.subtitles.length > 0 && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowSubtitles(!showSubtitles)}
                  className={`text-white hover:bg-white/20 ${
                    subtitles ? 'bg-white/20' : ''
                  }`}
                >
                  <Subtitles className="h-5 w-5" />
                </Button>

                {/* Subtitles Menu */}
                {showSubtitles && (
                  <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-2 min-w-[150px]">
                    <div className="text-white text-sm font-semibold mb-2">
                      Subtitles
                    </div>
                    <button
                      onClick={() => {
                        toggleSubtitles(null)
                        setShowSubtitles(false)
                      }}
                      className={`block w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 ${
                        !subtitles ? 'text-netflix-red' : 'text-white'
                      }`}
                    >
                      Off
                    </button>
                    {content.subtitles.map((subtitle) => (
                      <button
                        key={subtitle.language}
                        onClick={() => {
                          toggleSubtitles(subtitle.language)
                          setShowSubtitles(false)
                        }}
                        className={`block w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 ${
                          subtitles === subtitle.language ? 'text-netflix-red' : 'text-white'
                        }`}
                      >
                        {subtitle.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Settings */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:bg-white/20"
              >
                <Settings className="h-5 w-5" />
              </Button>

              {/* Settings Menu */}
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg p-2 min-w-[200px]">
                  {/* Quality */}
                  <div className="mb-3">
                    <div className="text-white text-sm font-semibold mb-2">
                      Quality
                    </div>
                    {qualityOptions.map((q) => (
                      <button
                        key={q}
                        onClick={() => {
                          changeQuality(q)
                          setShowSettings(false)
                        }}
                        className={`block w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 ${
                          quality === q ? 'text-netflix-red' : 'text-white'
                        }`}
                      >
                        {q === 'auto' ? 'Auto' : q}
                      </button>
                    ))}
                  </div>

                  {/* Playback Speed */}
                  <div>
                    <div className="text-white text-sm font-semibold mb-2">
                      Speed
                    </div>
                    {playbackRateOptions.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => {
                          changePlaybackRate(rate)
                          setShowSettings(false)
                        }}
                        className={`block w-full text-left px-2 py-1 text-sm rounded hover:bg-white/20 ${
                          playbackRate === rate ? 'text-netflix-red' : 'text-white'
                        }`}
                      >
                        {rate === 1 ? 'Normal' : `${rate}x`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
