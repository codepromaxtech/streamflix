'use client'

import React, { createContext, useContext, useState, useRef } from 'react'
import { VideoPlayerContextType, VideoContent } from '@/types/video'

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined)

export function VideoPlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentVideo, setCurrentVideo] = useState<VideoContent | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [quality, setQuality] = useState('auto')
  const [playbackRate, setPlaybackRate] = useState(1)
  const [subtitles, setSubtitles] = useState<string | null>(null)
  const [isBuffering, setIsBuffering] = useState(false)
  const playerRef = useRef<any>(null)

  const playVideo = (video: VideoContent) => {
    setCurrentVideo(video)
    setIsPlaying(true)
  }

  const pauseVideo = () => {
    setIsPlaying(false)
  }

  const stopVideo = () => {
    setCurrentVideo(null)
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const seekTo = (time: number) => {
    setCurrentTime(time)
    if (playerRef.current) {
      playerRef.current.currentTime = time
    }
  }

  const changeVolume = (newVolume: number) => {
    setVolume(newVolume)
    if (playerRef.current) {
      playerRef.current.volume = newVolume
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (playerRef.current) {
      playerRef.current.muted = !isMuted
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const changeQuality = (newQuality: string) => {
    setQuality(newQuality)
    // Implementation depends on video player library
  }

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate)
    if (playerRef.current) {
      playerRef.current.playbackRate = rate
    }
  }

  const toggleSubtitles = (language: string | null) => {
    setSubtitles(language)
    // Implementation depends on video player library
  }

  const updateProgress = (time: number, totalDuration: number) => {
    setCurrentTime(time)
    setDuration(totalDuration)
  }

  const value: VideoPlayerContextType = {
    currentVideo,
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
    playerRef,
    playVideo,
    pauseVideo,
    stopVideo,
    seekTo,
    changeVolume,
    toggleMute,
    toggleFullscreen,
    changeQuality,
    changePlaybackRate,
    toggleSubtitles,
    updateProgress,
    setIsBuffering,
  }

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  )
}

export function useVideoPlayer() {
  const context = useContext(VideoPlayerContext)
  if (context === undefined) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider')
  }
  return context
}
