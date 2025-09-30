'use client'

import { useState } from 'react'
import { Edit, Trash2, Eye, MoreHorizontal, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Content {
  id: string
  title: string
  type: 'movie' | 'series' | 'documentary'
  status: 'published' | 'draft' | 'pending' | 'rejected'
  views: number
  rating: number
  duration: number
  createdAt: string
  thumbnail: string
}

interface ContentTableProps {
  searchQuery: string
}

// Mock data - in production this would come from your API
const mockContent: Content[] = [
  {
    id: '1',
    title: 'The Batman',
    type: 'movie',
    status: 'published',
    views: 125000,
    rating: 8.2,
    duration: 176,
    createdAt: '2024-01-15',
    thumbnail: '/images/batman-thumb.jpg',
  },
  {
    id: '2',
    title: 'Stranger Things',
    type: 'series',
    status: 'published',
    views: 890000,
    rating: 8.7,
    duration: 3600,
    createdAt: '2024-01-10',
    thumbnail: '/images/stranger-things-thumb.jpg',
  },
  {
    id: '3',
    title: 'Planet Earth III',
    type: 'documentary',
    status: 'pending',
    views: 0,
    rating: 0,
    duration: 3000,
    createdAt: '2024-01-20',
    thumbnail: '/images/planet-earth-thumb.jpg',
  },
  {
    id: '4',
    title: 'Dune: Part Two',
    type: 'movie',
    status: 'draft',
    views: 0,
    rating: 0,
    duration: 166,
    createdAt: '2024-01-18',
    thumbnail: '/images/dune2-thumb.jpg',
  },
]

const getStatusBadge = (status: string) => {
  const styles = {
    published: 'bg-green-600 text-green-100',
    draft: 'bg-gray-600 text-gray-100',
    pending: 'bg-yellow-600 text-yellow-100',
    rejected: 'bg-red-600 text-red-100',
  }

  return (
    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

export function ContentTable({ searchQuery }: ContentTableProps) {
  const [selectedContent, setSelectedContent] = useState<string[]>([])

  const filteredContent = mockContent.filter(content =>
    content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    content.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectContent = (contentId: string) => {
    setSelectedContent(prev =>
      prev.includes(contentId)
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    )
  }

  const handleSelectAll = () => {
    setSelectedContent(
      selectedContent.length === filteredContent.length
        ? []
        : filteredContent.map(content => content.id)
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              checked={selectedContent.length === filteredContent.length && filteredContent.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-netflix-red bg-gray-700 border-gray-600 rounded focus:ring-netflix-red"
            />
            <span className="text-sm text-gray-400">
              {selectedContent.length > 0 ? `${selectedContent.length} selected` : `${filteredContent.length} items`}
            </span>
          </div>
          
          {selectedContent.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                Bulk Edit
              </Button>
              <Button variant="destructive" size="sm">
                Delete Selected
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Content
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Views
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredContent.map((content) => (
              <tr key={content.id} className="hover:bg-gray-800/30">
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
                        className="h-12 w-20 rounded object-cover"
                        src={content.thumbnail}
                        alt={content.title}
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{content.title}</div>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="capitalize text-gray-300">{content.type}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(content.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                  {content.views.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                  {content.rating > 0 ? `⭐ ${content.rating}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                  {formatDuration(content.duration)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                  {new Date(content.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Play className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing 1 to {filteredContent.length} of {filteredContent.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
