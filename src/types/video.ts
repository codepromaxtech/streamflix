export interface VideoContent {
  id: string
  title: string
  description: string
  thumbnail: string
  backdrop?: string
  trailer?: string
  videoUrl: string
  duration: number
  releaseDate: string
  rating: number
  maturityRating: string
  genre: string[]
  cast: CastMember[]
  director: string[]
  producer: string[]
  language: string
  subtitles: SubtitleTrack[]
  audioTracks: AudioTrack[]
  qualityLevels: QualityLevel[]
  type: 'movie' | 'series' | 'documentary' | 'live'
  season?: number
  episode?: number
  seriesId?: string
  isExclusive: boolean
  isPremium: boolean
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface CastMember {
  id: string
  name: string
  character: string
  avatar?: string
}

export interface SubtitleTrack {
  language: string
  label: string
  url: string
  default?: boolean
}

export interface AudioTrack {
  language: string
  label: string
  url: string
  default?: boolean
}

export interface QualityLevel {
  quality: string
  resolution: string
  bitrate: number
  url: string
}

export interface VideoPlayerContextType {
  currentVideo: VideoContent | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  quality: string
  playbackRate: number
  subtitles: string | null
  isBuffering: boolean
  playerRef: React.RefObject<any>
  playVideo: (video: VideoContent) => void
  pauseVideo: () => void
  stopVideo: () => void
  seekTo: (time: number) => void
  changeVolume: (volume: number) => void
  toggleMute: () => void
  toggleFullscreen: () => void
  changeQuality: (quality: string) => void
  changePlaybackRate: (rate: number) => void
  toggleSubtitles: (language: string | null) => void
  updateProgress: (time: number, duration: number) => void
  setIsBuffering: (buffering: boolean) => void
}

export interface ContentCategory {
  id: string
  name: string
  slug: string
  description?: string
  content: VideoContent[]
}

export interface SearchResult {
  content: VideoContent[]
  totalCount: number
  hasNextPage: boolean
}

export interface AdBreak {
  id: string
  position: number // seconds into the video
  duration: number // seconds
  ads: Advertisement[]
}

export interface Advertisement {
  id: string
  title: string
  description?: string
  videoUrl: string
  clickUrl?: string
  duration: number
  skipAfter?: number // seconds after which skip is allowed
  targeting?: AdTargeting
}

export interface AdTargeting {
  demographics?: string[]
  interests?: string[]
  location?: string[]
  deviceType?: string[]
}
