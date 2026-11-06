'use client'

import { useState, useEffect } from 'react'
import { Edit, Trash2, Eye, MoreHorizontal, Play, Check, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useVideoPlayer } from '@/contexts/video-player-context'

interface ContentItem {
  id: string
  title: string
  description?: string
  type: string
  isPublished: boolean
  isFeatured: boolean
  isTrending: boolean
  viewCount: number
  rating: number
  duration: number
  createdAt: string
  thumbnail: string
  videoUrl?: string
}

interface ContentTableProps {
  searchQuery: string
  onContentUpdated?: () => void
}

export function ContentTable({ searchQuery, onContentUpdated }: ContentTableProps) {
  const [contentList, setContentList] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedContent, setSelectedContent] = useState<string[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { playVideo } = useVideoPlayer()

  const getAuthHeader = (): Record<string, string> => {
    if (typeof window === 'undefined') return {}
    const token = localStorage.getItem('auth-token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchContent = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/admin/content?limit=50&search=${encodeURIComponent(searchQuery || '')}`,
        {
          headers: getAuthHeader(),
          credentials: 'include',
        }
      )
      if (res.ok) {
        const data = await res.json()
        setContentList(data.content || data.items || [])
      }
    } catch (err) {
      console.error('Failed to fetch admin content:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchContent()
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content item?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/content/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
        credentials: 'include',
      })
      if (res.ok) {
        setContentList((prev) => prev.filter((item) => item.id !== id))
        onContentUpdated?.()
      }
    } catch (err) {
      console.error('Failed to delete content:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleTogglePublish = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/content/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        credentials: 'include',
      })
      if (res.ok) {
        const updated = await res.json()
        setContentList((prev) =>
          prev.map((c) => (c.id === id ? { ...c, isPublished: updated.isPublished } : c))
        )
      }
    } catch (err) {
      console.error('Failed to toggle publish status:', err)
    }
  }

  const handleSelectContent = (contentId: string) => {
    setSelectedContent((prev) =>
      prev.includes(contentId) ? prev.filter((id) => id !== contentId) : [...prev, contentId]
    )
  }

  const handleSelectAll = () => {
    setSelectedContent(
      selectedContent.length === contentList.length ? [] : contentList.map((c) => c.id)
    )
  }

  const formatDuration = (secondsOrMinutes: number) => {
    if (!secondsOrMinutes) return 'N/A'
    const totalMinutes = secondsOrMinutes > 300 ? Math.floor(secondsOrMinutes / 60) : secondsOrMinutes
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/80 overflow-hidden shadow-xl">
      {/* Table Header Controls */}
      <div className="px-6 py-4 border-b border-gray-700/80 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={selectedContent.length === contentList.length && contentList.length > 0}
            onChange={handleSelectAll}
            className="h-4 w-4 text-netflix-red bg-gray-700 border-gray-600 rounded focus:ring-netflix-red"
          />
          <span className="text-sm text-gray-400">
            {selectedContent.length > 0
              ? `${selectedContent.length} selected`
              : `${contentList.length} items loaded from database`}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchContent}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {selectedContent.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (confirm(`Delete ${selectedContent.length} selected items?`)) {
                  selectedContent.forEach(handleDelete)
                  setSelectedContent([])
                }
              }}
            >
              Delete Selected
            </Button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-900/60 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700/60">
            <tr>
              <th className="px-6 py-3.5">Content</th>
              <th className="px-6 py-3.5">Type</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Views</th>
              <th className="px-6 py-3.5">Rating</th>
              <th className="px-6 py-3.5">Duration</th>
              <th className="px-6 py-3.5">Added Date</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading && contentList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-netflix-red" />
                    <span>Loading real catalog from database...</span>
                  </div>
                </td>
              </tr>
            ) : contentList.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  No content found matching &quot;{searchQuery}&quot;. Use the Scraper or Add Content to ingest media.
                </td>
              </tr>
            ) : (
              contentList.map((content) => (
                <tr key={content.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedContent.includes(content.id)}
                        onChange={() => handleSelectContent(content.id)}
                        className="h-4 w-4 text-netflix-red bg-gray-700 border-gray-600 rounded focus:ring-netflix-red mr-4"
                      />
                      <div className="flex items-center">
                        <img
                          className="h-12 w-20 rounded-md object-cover bg-gray-800"
                          src={content.thumbnail || '/placeholder-poster.svg'}
                          alt={content.title}
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src = '/placeholder-poster.svg'
                          }}
                        />
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-white">{content.title}</div>
                          {content.isTrending && (
                            <span className="text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded mr-1">
                              Trending
                            </span>
                          )}
                          {content.isFeatured && (
                            <span className="text-[10px] bg-amber-900/60 text-amber-300 px-1.5 py-0.5 rounded">
                              Featured
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs uppercase font-medium text-gray-300 px-2 py-1 bg-gray-700/50 rounded">
                      {content.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleTogglePublish(content.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer transition-colors ${
                        content.isPublished
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600'
                      }`}
                    >
                      {content.isPublished ? (
                        <>
                          <Check className="h-3 w-3" /> Published
                        </>
                      ) : (
                        <>
                          <X className="h-3 w-3" /> Draft
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300 font-mono">
                    {(content.viewCount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {content.rating > 0 ? `⭐ ${content.rating}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatDuration(content.duration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                    {content.createdAt ? new Date(content.createdAt).toISOString().split('T')[0] : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-netflix-red hover:text-white hover:bg-netflix-red/20"
                        onClick={() => playVideo(content as any)}
                        title={`Watch ${content.title}`}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(content.id)}
                        disabled={deletingId === content.id}
                        className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-700/80 flex items-center justify-between text-xs text-gray-400">
        <div>Total database items: {contentList.length}</div>
        <div>StreamFlix Live Database Sync</div>
      </div>
    </div>
  )
}
