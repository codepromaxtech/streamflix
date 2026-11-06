import { VideoContent } from '@/types/video'

export function mapDbItemToVideoContent(item: any): VideoContent {
  const genreList: string[] = Array.isArray(item.genre)
    ? item.genre
    : item.genre
    ? [item.genre]
    : item.genres && item.genres.length > 0
    ? item.genres.map((g: any) => g.genre?.name || g.name || 'General')
    : ['General']

  const rawType = (item.type || '').toUpperCase()
  const normalizedType: 'movie' | 'series' | 'documentary' | 'live' =
    rawType === 'SERIES'
      ? 'series'
      : rawType === 'DOCUMENTARY'
      ? 'documentary'
      : rawType === 'LIVE'
      ? 'live'
      : 'movie'

  return {
    id: String(item.id),
    title: item.title || 'Untitled',
    description: item.description || '',
    thumbnail:
      item.thumbnail ||
      '/placeholder-poster.svg',
    backdrop:
      item.backdrop ||
      item.thumbnail ||
      '/placeholder-backdrop.svg',
    videoUrl: item.videoUrl || '',
    trailer: item.trailer || '',
    duration: Number(item.duration) || 5400,
    releaseDate: item.releaseDate ? String(item.releaseDate).split('T')[0] : '2024-01-01',
    rating: Number(item.rating) || 8.0,
    maturityRating: item.maturityRating || 'PG-13',
    genre: genreList,
    cast: item.cast || [],
    director: item.director ? [item.director] : [],
    producer: [],
    language: item.language || 'English',
    subtitles: item.subtitles || [],
    audioTracks: item.audioTracks || [],
    qualityLevels: item.qualityLevels || [],
    type: normalizedType,
    season: item.season || (normalizedType === 'series' ? 1 : undefined),
    episode: item.episode || (normalizedType === 'series' ? 1 : undefined),
    isExclusive: Boolean(item.isExclusive),
    isPremium: Boolean(item.isPremium),
    tags: item.isTrending ? ['trending'] : [],
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }
}

export function extractItemsFromApiResponse(data: any): any[] {
  if (!data) return []
  if (Array.isArray(data)) return data
  if (Array.isArray(data.items)) return data.items
  if (Array.isArray(data.content)) return data.content
  return []
}
