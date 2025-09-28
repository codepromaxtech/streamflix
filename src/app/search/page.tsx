'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Filter, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ContentCard } from '@/components/content-card'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { debounce } from '@/lib/utils'

interface SearchFilters {
  type: string[]
  genre: string[]
  rating: { min?: number; max?: number }
  releaseYear: { min?: number; max?: number }
  duration: { min?: number; max?: number }
}

interface SearchResult {
  id: string
  title: string
  description: string
  type: string
  genre: string[]
  rating: number
  releaseDate: string
  thumbnail: string
  score: number
}

const contentTypes = ['movie', 'series', 'documentary', 'live']
const genres = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Thriller', 'Animation', 'Crime',
  'Family', 'History', 'Music', 'War', 'Western', 'Biography'
]

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [totalResults, setTotalResults] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<SearchFilters>({
    type: [],
    genre: [],
    rating: {},
    releaseYear: {},
    duration: {},
  })

  const itemsPerPage = 20

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (searchQuery: string, searchFilters: SearchFilters, page: number) => {
      if (!searchQuery.trim()) {
        setResults([])
        setTotalResults(0)
        return
      }

      setIsLoading(true)
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: searchQuery,
            filters: searchFilters,
            limit: itemsPerPage,
            offset: (page - 1) * itemsPerPage,
          }),
        })

        const data = await response.json()
        setResults(data.results || [])
        setTotalResults(data.total || 0)
      } catch (error) {
        console.error('Search failed:', error)
        setResults([])
        setTotalResults(0)
      } finally {
        setIsLoading(false)
      }
    }, 300),
    []
  )

  // Get search suggestions
  const getSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      if (searchQuery.length < 2) {
        setSuggestions([])
        return
      }

      try {
        const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`)
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      } catch (error) {
        console.error('Failed to get suggestions:', error)
        setSuggestions([])
      }
    }, 200),
    []
  )

  useEffect(() => {
    if (query) {
      debouncedSearch(query, filters, currentPage)
      getSuggestions(query)
    }
  }, [query, filters, currentPage, debouncedSearch, getSuggestions])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    setCurrentPage(1)
  }

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setFilters({
      type: [],
      genre: [],
      rating: {},
      releaseYear: {},
      duration: {},
    })
  }

  const totalPages = Math.ceil(totalResults / itemsPerPage)

  return (
    <div className="min-h-screen bg-netflix-black">
      <Header />
      
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          {/* Search Header */}
          <div className="mb-8">
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search movies, shows, documentaries..."
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-600 text-white placeholder-gray-400 text-lg h-12"
                />
              </div>

              {/* Search Suggestions */}
              {suggestions.length > 0 && query && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setQuery(suggestion)
                        setSuggestions([])
                      }}
                      className="w-full px-4 py-2 text-left text-white hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </Button>

              {(filters.type.length > 0 || filters.genre.length > 0) && (
                <Button variant="ghost" onClick={clearFilters} className="text-netflix-red">
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Content Type */}
                  <div>
                    <h3 className="text-white font-semibold mb-3">Content Type</h3>
                    <div className="space-y-2">
                      {contentTypes.map((type) => (
                        <label key={type} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.type.includes(type)}
                            onChange={(e) => {
                              const newTypes = e.target.checked
                                ? [...filters.type, type]
                                : filters.type.filter(t => t !== type)
                              handleFilterChange({ type: newTypes })
                            }}
                            className="h-4 w-4 text-netflix-red bg-gray-700 border-gray-600 rounded focus:ring-netflix-red mr-2"
                          />
                          <span className="text-gray-300 capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Genres */}
                  <div>
                    <h3 className="text-white font-semibold mb-3">Genres</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {genres.map((genre) => (
                        <label key={genre} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={filters.genre.includes(genre)}
                            onChange={(e) => {
                              const newGenres = e.target.checked
                                ? [...filters.genre, genre]
                                : filters.genre.filter(g => g !== genre)
                              handleFilterChange({ genre: newGenres })
                            }}
                            className="h-4 w-4 text-netflix-red bg-gray-700 border-gray-600 rounded focus:ring-netflix-red mr-2"
                          />
                          <span className="text-gray-300">{genre}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <h3 className="text-white font-semibold mb-3">Rating</h3>
                    <div className="space-y-2">
                      <div>
                        <label className="text-gray-400 text-sm">Minimum Rating</label>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          placeholder="0.0"
                          value={filters.rating.min || ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseFloat(e.target.value) : undefined
                            handleFilterChange({ rating: { ...filters.rating, min: value } })
                          }}
                          className="bg-gray-700 border-gray-600 text-white mt-1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Release Year */}
                  <div>
                    <h3 className="text-white font-semibold mb-3">Release Year</h3>
                    <div className="space-y-2">
                      <div>
                        <label className="text-gray-400 text-sm">From Year</label>
                        <Input
                          type="number"
                          min="1900"
                          max={new Date().getFullYear()}
                          placeholder="2000"
                          value={filters.releaseYear.min || ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : undefined
                            handleFilterChange({ releaseYear: { ...filters.releaseYear, min: value } })
                          }}
                          className="bg-gray-700 border-gray-600 text-white mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 text-sm">To Year</label>
                        <Input
                          type="number"
                          min="1900"
                          max={new Date().getFullYear()}
                          placeholder={new Date().getFullYear().toString()}
                          value={filters.releaseYear.max || ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : undefined
                            handleFilterChange({ releaseYear: { ...filters.releaseYear, max: value } })
                          }}
                          className="bg-gray-700 border-gray-600 text-white mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="mb-8">
            {query && (
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {isLoading ? 'Searching...' : `Search Results for "${query}"`}
                </h2>
                {totalResults > 0 && (
                  <p className="text-gray-400">
                    {totalResults.toLocaleString()} results found
                  </p>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Array.from({ length: 10 }).map((_, index) => (
                  <div key={index} className="animate-pulse">
                    <div className="bg-gray-700 aspect-video rounded-lg mb-2"></div>
                    <div className="bg-gray-700 h-4 rounded mb-1"></div>
                    <div className="bg-gray-700 h-3 rounded w-2/3"></div>
                  </div>
                ))}
              </div>
            ) : results.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {results.map((result) => (
                    <ContentCard
                      key={result.id}
                      content={{
                        id: result.id,
                        title: result.title,
                        description: result.description,
                        thumbnail: result.thumbnail,
                        videoUrl: `/videos/${result.id}.mp4`,
                        duration: 0,
                        releaseDate: result.releaseDate,
                        rating: result.rating,
                        maturityRating: 'PG-13',
                        genre: result.genre,
                        cast: [],
                        director: [],
                        producer: [],
                        language: 'English',
                        subtitles: [],
                        audioTracks: [],
                        qualityLevels: [],
                        type: result.type as any,
                        isExclusive: false,
                        isPremium: false,
                        tags: [],
                        createdAt: '',
                        updatedAt: '',
                      }}
                      size="small"
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center mt-8 space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "netflix" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            ) : query ? (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No results found</h3>
                <p className="text-gray-400 mb-4">
                  Try adjusting your search terms or filters
                </p>
                <Button variant="netflix" onClick={clearFilters}>
                  Clear All Filters
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Start searching</h3>
                <p className="text-gray-400">
                  Enter a search term to find movies, shows, and documentaries
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
