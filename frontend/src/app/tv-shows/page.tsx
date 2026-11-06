'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import {
  Tv,
  Play,
  Star,
  Clock,
  Sparkles,
  Search,
  ArrowUpDown,
  RefreshCw,
  Info,
  Layers,
  AlertCircle,
  Download
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ContentCard } from '@/components/content-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VideoContent } from '@/types/video'
import { useVideoPlayer } from '@/contexts/video-player-context'
import { mapDbItemToVideoContent, extractItemsFromApiResponse } from '@/lib/content-mapper'

export default function TvShowsPage() {
  const [shows, setShows] = useState<VideoContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGenre, setSelectedGenre] = useState('All')
  const [sortBy, setSortBy] = useState<'rating' | 'newest' | 'title'>('rating')
  const [searchFilter, setSearchFilter] = useState('')
  const { playVideo } = useVideoPlayer()

  const fetchShows = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/content?type=SERIES&limit=100', {
        credentials: 'include',
      })
      if (!res.ok) {
        throw new Error(`Failed to load TV shows: HTTP ${res.status}`)
      }
      const data = await res.json()
      const rawList = extractItemsFromApiResponse(data)
      const mapped = rawList.map(mapDbItemToVideoContent)
      setShows(mapped)
    } catch (err: any) {
      console.error('Error fetching TV shows from database:', err)
      setError(err?.message || 'Failed to connect to media database')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchShows()
  }, [])

  // Spotlight TV Show dynamically chosen from real database content
  const featuredShow = useMemo(() => {
    if (shows.length === 0) return null
    return [...shows].sort((a, b) => b.rating - a.rating)[0]
  }, [shows])

  // Extract unique genres dynamically from real database series
  const availableGenres = useMemo(() => {
    const set = new Set<string>(['All'])
    shows.forEach((s) => {
      s.genre.forEach((g) => {
        if (g && g.trim()) set.add(g.trim())
      })
    })
    return Array.from(set)
  }, [shows])

  // Real-time filtering and sorting
  const filteredShows = useMemo(() => {
    return shows
      .filter((show) => {
        const matchesGenre =
          selectedGenre === 'All' ||
          show.genre.some((g) => g.toLowerCase() === selectedGenre.toLowerCase())
        const matchesSearch =
          !searchFilter.trim() ||
          show.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
          show.description.toLowerCase().includes(searchFilter.toLowerCase())
        return matchesGenre && matchesSearch
      })
      .sort((a, b) => {
        if (sortBy === 'rating') return b.rating - a.rating
        if (sortBy === 'newest')
          return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
        if (sortBy === 'title') return a.title.localeCompare(b.title)
        return 0
      })
  }, [shows, selectedGenre, sortBy, searchFilter])

  return (
    <div className="min-h-screen bg-netflix-black text-white flex flex-col">
      <Header />

      <main className="flex-1 pb-16">
        {/* Spotlight Hero Section - Dynamically from Database */}
        {featuredShow && (
          <section className="relative h-[65vh] min-h-[460px] max-h-[640px] w-full overflow-hidden">
            <Image
              src={featuredShow.backdrop || featuredShow.thumbnail || '/placeholder-backdrop.svg'}
              alt={featuredShow.title}
              fill
              priority
              className="object-cover object-center brightness-75 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-netflix-black via-netflix-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-netflix-black via-netflix-black/40 to-transparent" />

            <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-end pb-12 max-w-7xl">
              <div className="max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-netflix-red/20 border border-netflix-red/30 backdrop-blur-md">
                  <Sparkles className="h-3.5 w-3.5 text-netflix-red" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-netflix-red">
                    Featured Series (Live DB)
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-md">
                  {featuredShow.title}
                </h1>

                <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-gray-300">
                  <span className="inline-flex items-center gap-1 font-semibold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/20">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    {featuredShow.rating.toFixed(1)}
                  </span>
                  <span>{new Date(featuredShow.releaseDate).getFullYear()}</span>
                  <span className="px-1.5 py-0.5 rounded border border-gray-600 text-[11px] font-mono">
                    {featuredShow.maturityRating}
                  </span>
                  <span className="inline-flex items-center gap-1 text-gray-400">
                    <Layers className="h-3.5 w-3.5" />
                    Season {featuredShow.season || 1}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-300">{featuredShow.genre.join(', ')}</span>
                </div>

                <p className="text-sm sm:text-base text-gray-300 line-clamp-3 leading-relaxed drop-shadow">
                  {featuredShow.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    onClick={() => playVideo(featuredShow)}
                    className="bg-netflix-red hover:bg-red-700 text-white font-semibold px-6 py-2.5 h-11 rounded-lg flex items-center gap-2 shadow-lg shadow-red-900/40 transition-transform active:scale-95"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    Start Watching
                  </Button>
                  {featuredShow.videoUrl && (
                    <Button
                      variant="outline"
                      asChild
                      className="border-emerald-500/50 bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 hover:text-white h-11 px-5 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-950/40"
                    >
                      <a href={featuredShow.videoUrl} download title="Download Torrent (Magnet / File)">
                        <Download className="h-4 w-4 text-emerald-400" />
                        <span>Download Torrent</span>
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => playVideo(featuredShow)}
                    className="border-gray-700 bg-gray-900/60 hover:bg-gray-800 text-white h-11 px-5 rounded-lg backdrop-blur-sm"
                  >
                    <Info className="h-4 w-4 mr-2" />
                    Episodes & Details
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Filter & Catalog Controls */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl pt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800">
            <div>
              <div className="flex items-center gap-2.5">
                <Tv className="h-6 w-6 text-netflix-red" />
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  TV Shows & Series
                </h2>
                <span className="text-xs bg-gray-800 text-gray-400 border border-gray-700 px-2 py-0.5 rounded-full font-mono">
                  {filteredShows.length} {filteredShows.length === 1 ? 'series' : 'series'}
                </span>
              </div>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                Binge-worthy shows, drama, anime, and mini-series indexed from live sources.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Filter */}
              <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search series..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-gray-900 border-gray-800 text-white pl-9 h-10 text-sm focus:border-netflix-red"
                />
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 rounded-lg p-1">
                <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 ml-2" />
                <select
                  aria-label="Sort TV shows by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-xs text-gray-200 border-none focus:outline-none pr-3 py-1.5 cursor-pointer"
                >
                  <option value="rating" className="bg-gray-900">Highest Rated</option>
                  <option value="newest" className="bg-gray-900">Release Date</option>
                  <option value="title" className="bg-gray-900">Title (A-Z)</option>
                </select>
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={fetchShows}
                disabled={loading}
                className="h-10 w-10 border-gray-800 bg-gray-900 hover:bg-gray-800 text-gray-300"
                title="Refresh shows from database"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-netflix-red' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Genre Filter Pills - Dynamic from Database */}
          <div className="flex items-center gap-2 overflow-x-auto py-4 scrollbar-none">
            {availableGenres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`text-xs sm:text-sm font-medium px-4 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                  selectedGenre === genre
                    ? 'bg-netflix-red text-white shadow-md shadow-red-900/30'
                    : 'bg-gray-900/80 hover:bg-gray-800 text-gray-300 border border-gray-800'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Content Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 mt-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="aspect-[2/3] bg-gray-800/60 rounded-xl" />
                  <div className="h-4 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800/40 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-gray-900/50 border border-red-500/20 rounded-2xl my-8">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <p className="text-white font-medium mb-1">Failed to Load Series Catalog</p>
              <p className="text-xs text-gray-400 mb-4">{error}</p>
              <Button onClick={fetchShows} variant="netflix" size="sm">
                Try Again
              </Button>
            </div>
          ) : filteredShows.length === 0 ? (
            <div className="p-12 text-center bg-gray-900/40 border border-gray-800 rounded-2xl my-8">
              <Tv className="h-10 w-10 text-gray-600 mx-auto mb-3" />
              <p className="text-lg font-semibold text-white">No Series Found</p>
              <p className="text-xs text-gray-400 max-w-md mx-auto mt-1 mb-4">
                No titles matched the selected filter &quot;{selectedGenre}&quot; or search query &quot;{searchFilter}&quot;.
              </p>
              {(selectedGenre !== 'All' || searchFilter) && (
                <Button
                  onClick={() => {
                    setSelectedGenre('All')
                    setSearchFilter('')
                  }}
                  variant="outline"
                  size="sm"
                  className="border-gray-700 text-gray-300"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 mt-6">
              {filteredShows.map((show) => (
                <div key={show.id} className="h-full">
                  <ContentCard content={show} size="medium" />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
