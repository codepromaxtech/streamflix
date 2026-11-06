'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Bookmark, Film, Play, Plus, ArrowRight } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ContentCard } from '@/components/content-card'
import { Button } from '@/components/ui/button'
import { VideoContent } from '@/types/video'
import { useAuth } from '@/contexts/auth-context'
import { mapDbItemToVideoContent, extractItemsFromApiResponse } from '@/lib/content-mapper'

export default function MyListPage() {
  const { user } = useAuth()
  const [list, setList] = useState<VideoContent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Attempt to load from favorites / recommendations
    const loadList = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/content?limit=8', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          const raw = extractItemsFromApiResponse(data)
          if (raw.length > 0) {
            const mapped = raw.slice(0, 5).map(mapDbItemToVideoContent)
            setList(mapped)
          }
        }
      } catch (err) {
        console.warn('Could not load watchlist:', err)
      } finally {
        setLoading(false)
      }
    }

    loadList()
  }, [])

  return (
    <div className="min-h-screen bg-netflix-black text-white flex flex-col">
      <Header />

      <main className="flex-1 pb-16 pt-24 container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex items-center justify-between pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2.5">
              <Bookmark className="h-6 w-6 text-netflix-red" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                My Watchlist
              </h1>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm mt-1">
              Your saved movies, shows, and bookmarked streams for instant playback.
            </p>
          </div>

          <Button variant="outline" asChild className="border-gray-700 bg-gray-800 text-gray-200">
            <Link href="/movies" className="flex items-center gap-2">
              Browse Movies
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 mt-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] bg-gray-900/80 rounded-xl animate-pulse border border-gray-800"
              />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/30 rounded-2xl border border-gray-800/80 mt-8">
            <Bookmark className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">Your Watchlist is empty</h3>
            <p className="text-gray-400 text-xs sm:text-sm max-w-sm mx-auto mb-6">
              Explore the library and click the + icon on any movie or TV show to save it here.
            </p>
            <div className="flex justify-center gap-3">
              <Button variant="netflix" asChild>
                <Link href="/movies">Explore Movies</Link>
              </Button>
              <Button variant="outline" asChild className="border-gray-700 text-gray-200">
                <Link href="/tv-shows">Explore TV Shows</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 mt-8">
            {list.map((item) => (
              <div key={item.id} className="h-full">
                <ContentCard content={item} size="medium" />
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
