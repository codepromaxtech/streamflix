'use client'

import { useState, useEffect } from 'react'
import { Edit, Trash2, Eye, MoreHorizontal, Play, Check, X, RefreshCw, Film, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useVideoPlayer } from '@/contexts/video-player-context'

interface ContentItem {
  id: string
  title: string
  description?: string
  type: string
  genre?: string
  isPublished: boolean
  isFeatured: boolean
  isTrending: boolean
  viewCount: number
  rating: number
  duration: number
  createdAt: string
  thumbnail: string
  backdrop?: string
  trailer?: string
  videoUrl?: string
  maturityRating?: string
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

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    type: 'MOVIE',
    genre: 'Action',
    rating: '8.5',
    duration: '120',
    videoUrl: '',
    thumbnail: '',
    backdrop: '',
    trailer: '',
    maturityRating: 'PG-13',
    isPublished: true,
    isFeatured: false,
    isTrending: false,
  })
  const [savingEdit, setSavingEdit] = useState(false)

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

  const handleOpenEdit = (item: ContentItem) => {
    setEditingItem(item)
    const totalMinutes = item.duration > 300 ? Math.floor(item.duration / 60) : item.duration
    setEditForm({
      title: item.title || '',
      description: item.description || '',
      type: item.type || 'MOVIE',
      genre: item.genre || 'Action',
      rating: String(item.rating || 0),
      duration: String(totalMinutes || 120),
      videoUrl: item.videoUrl || '',
      thumbnail: item.thumbnail || '',
      backdrop: item.backdrop || '',
      trailer: item.trailer || '',
      maturityRating: item.maturityRating || 'PG-13',
      isPublished: Boolean(item.isPublished),
      isFeatured: Boolean(item.isFeatured),
      isTrending: Boolean(item.isTrending),
    })
    setEditModalOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/admin/content/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        credentials: 'include',
        body: JSON.stringify({
          ...editForm,
          duration: Number(editForm.duration) * 60,
          rating: Number(editForm.rating),
        }),
      })
      if (res.ok) {
        setEditModalOpen(false)
        fetchContent()
        onContentUpdated?.()
      }
    } catch (err) {
      console.error('Failed to update content:', err)
    } finally {
      setSavingEdit(false)
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
                        className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                        onClick={() => handleOpenEdit(content)}
                        title={`Edit ${content.title}`}
                      >
                        <Edit className="h-4 w-4" />
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

      {/* Edit Content Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-white text-lg">
                Edit Content: {editingItem?.title}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setEditModalOpen(false)}
                className="h-8 w-8 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-300 block mb-1">Title *</label>
                <Input
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  placeholder="Content title"
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-300 block mb-1">Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Plot summary or overview..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-xs text-gray-200"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-300 block mb-1">
                  Video URL / Torrent Magnet URI *
                </label>
                <Input
                  required
                  value={editForm.videoUrl}
                  onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                  placeholder="magnet:?xt=urn:btih:... or https://..."
                  className="bg-gray-950 border-gray-800 text-white font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Content Type</label>
                  <select
                    aria-label="Content type"
                    value={editForm.type}
                    onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="MOVIE">Movie</option>
                    <option value="SERIES">TV Series</option>
                    <option value="DOCUMENTARY">Documentary</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Genre</label>
                  <Input
                    value={editForm.genre}
                    onChange={(e) => setEditForm({ ...editForm, genre: e.target.value })}
                    placeholder="Action, Sci-Fi, Drama..."
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Rating (0-10)</label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="10"
                    value={editForm.rating}
                    onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })}
                    className="bg-gray-950 border-gray-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Duration (Mins)</label>
                  <Input
                    type="number"
                    value={editForm.duration}
                    onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                    className="bg-gray-950 border-gray-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Maturity Rating</label>
                  <Input
                    value={editForm.maturityRating}
                    onChange={(e) => setEditForm({ ...editForm, maturityRating: e.target.value })}
                    placeholder="PG-13, TV-MA..."
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Thumbnail Poster URL</label>
                  <Input
                    value={editForm.thumbnail}
                    onChange={(e) => setEditForm({ ...editForm, thumbnail: e.target.value })}
                    placeholder="https://.../poster.jpg"
                    className="bg-gray-950 border-gray-800 text-white text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Backdrop Image URL</label>
                  <Input
                    value={editForm.backdrop}
                    onChange={(e) => setEditForm({ ...editForm, backdrop: e.target.value })}
                    placeholder="https://.../backdrop.jpg"
                    className="bg-gray-950 border-gray-800 text-white text-[11px]"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-300 block mb-1">Official Trailer (YouTube / MP4)</label>
                <Input
                  value={editForm.trailer}
                  onChange={(e) => setEditForm({ ...editForm, trailer: e.target.value })}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="bg-gray-950 border-gray-800 text-white text-[11px]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 font-semibold">
                  <input
                    type="checkbox"
                    checked={editForm.isPublished}
                    onChange={(e) => setEditForm({ ...editForm, isPublished: e.target.checked })}
                    className="h-4 w-4 text-netflix-red rounded bg-gray-950 border-gray-800"
                  />
                  <span>Published</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 font-semibold">
                  <input
                    type="checkbox"
                    checked={editForm.isFeatured}
                    onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                    className="h-4 w-4 text-netflix-red rounded bg-gray-950 border-gray-800"
                  />
                  <span>Featured Spotlight</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 font-semibold">
                  <input
                    type="checkbox"
                    checked={editForm.isTrending}
                    onChange={(e) => setEditForm({ ...editForm, isTrending: e.target.checked })}
                    className="h-4 w-4 text-netflix-red rounded bg-gray-950 border-gray-800"
                  />
                  <span>Trending</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditModalOpen(false)}
                  className="border-gray-800 text-gray-300"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="netflix" disabled={savingEdit}>
                  {savingEdit ? 'Saving Changes...' : 'Save Dynamic Values'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
