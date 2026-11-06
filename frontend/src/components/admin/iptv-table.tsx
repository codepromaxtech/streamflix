'use client'

import { useState, useEffect } from 'react'
import {
  Tv,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Check,
  X,
  ExternalLink,
  Zap,
  Globe,
  Radio,
  UploadCloud,
  Layers,
  Activity,
  AlertCircle,
  Play
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useVideoPlayer } from '@/contexts/video-player-context'

interface Channel {
  id: string
  name: string
  logo: string
  category: string
  country: string
  countryCode: string
  language?: string
  quality?: string
  streamUrl: string
  backupStreamUrl?: string
  isBdixSupported: boolean
  peeringType: string
  currentProgram?: string
  nextProgram?: string
  isActive: boolean
  viewCount: number
}

interface PeeringNode {
  id: string
  name: string
  region: string
  countryCode: string
  latencyMs: number
  status: string
  description?: string
  isActive: boolean
}

export function IptvTable() {
  const [subTab, setSubTab] = useState<'channels' | 'nodes' | 'm3u'>('channels')
  const [channels, setChannels] = useState<Channel[]>([])
  const [nodes, setNodes] = useState<PeeringNode[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [countries, setCountries] = useState<{ country: string; countryCode: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCountry, setSelectedCountry] = useState('ALL')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedPeering, setSelectedPeering] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Channel Edit / Create Modal State
  const [channelModalOpen, setChannelModalOpen] = useState(false)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [channelForm, setChannelForm] = useState({
    name: '',
    logo: '',
    category: 'News',
    country: 'Bangladesh',
    countryCode: 'BD',
    streamUrl: '',
    backupStreamUrl: '',
    isBdixSupported: true,
    peeringType: 'BDIX',
    currentProgram: 'Live 24/7 Broadcast',
    quality: '1080p FHD',
    isActive: true,
  })

  // Peering Node Modal State
  const [nodeModalOpen, setNodeModalOpen] = useState(false)
  const [editingNode, setEditingNode] = useState<PeeringNode | null>(null)
  const [nodeForm, setNodeForm] = useState({
    name: '',
    region: '',
    countryCode: 'BD',
    latencyMs: '10',
    status: 'OPTIMAL',
    description: '',
    isActive: true,
  })

  // M3U Import State
  const [m3uUrl, setM3uUrl] = useState('')
  const [m3uContent, setM3uContent] = useState('')
  const [importingM3u, setImportingM3u] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const { playVideo } = useVideoPlayer()

  const fetchFilters = async () => {
    try {
      const [catRes, ctryRes] = await Promise.all([
        fetch('/api/iptv/categories'),
        fetch('/api/iptv/countries'),
      ])
      if (catRes.ok) {
        const catData = await catRes.json()
        setCategories(catData)
      }
      if (ctryRes.ok) {
        const ctryData = await ctryRes.json()
        setCountries(ctryData)
      }
    } catch (err) {
      console.error('Failed to load dynamic IPTV categories/countries:', err)
    }
  }

  const fetchChannels = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedCountry !== 'ALL') params.append('country', selectedCountry)
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory)
      if (selectedPeering !== 'ALL') params.append('peering', selectedPeering)
      if (search.trim()) params.append('search', search.trim())
      params.append('page', String(page))
      params.append('limit', '40')
      params.append('all', 'true') // Allow seeing drafts

      const res = await fetch(`/api/iptv/channels?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setChannels(data.channels || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch IPTV channels from DB:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchNodes = async () => {
    try {
      const res = await fetch('/api/iptv/peering-nodes?all=true')
      if (res.ok) {
        const data = await res.json()
        setNodes(data)
      }
    } catch (err) {
      console.error('Failed to fetch peering nodes:', err)
    }
  }

  useEffect(() => {
    fetchFilters()
    fetchNodes()
  }, [])

  useEffect(() => {
    fetchChannels()
  }, [page, selectedCountry, selectedCategory, selectedPeering, search])

  // --- Channel CRUD Handlers ---

  const openCreateChannelModal = () => {
    setEditingChannel(null)
    setChannelForm({
      name: '',
      logo: '',
      category: categories[0] || 'News',
      country: 'Bangladesh',
      countryCode: 'BD',
      streamUrl: '',
      backupStreamUrl: '',
      isBdixSupported: true,
      peeringType: 'BDIX',
      currentProgram: 'Live 24/7 Broadcast',
      quality: '1080p FHD',
      isActive: true,
    })
    setChannelModalOpen(true)
  }

  const openEditChannelModal = (ch: Channel) => {
    setEditingChannel(ch)
    setChannelForm({
      name: ch.name,
      logo: ch.logo,
      category: ch.category,
      country: ch.country,
      countryCode: ch.countryCode,
      streamUrl: ch.streamUrl,
      backupStreamUrl: ch.backupStreamUrl || '',
      isBdixSupported: ch.isBdixSupported,
      peeringType: ch.peeringType,
      currentProgram: ch.currentProgram || '',
      quality: ch.quality || '1080p',
      isActive: ch.isActive,
    })
    setChannelModalOpen(true)
  }

  const handleSaveChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!channelForm.name.trim() || !channelForm.streamUrl.trim()) return

    try {
      const url = editingChannel
        ? `/api/iptv/channels/${editingChannel.id}`
        : '/api/iptv/channels'
      const method = editingChannel ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelForm),
      })

      if (res.ok) {
        setChannelModalOpen(false)
        fetchChannels()
        fetchFilters()
      }
    } catch (err) {
      console.error('Error saving channel:', err)
    }
  }

  const handleToggleChannelStatus = async (ch: Channel) => {
    try {
      const res = await fetch(`/api/iptv/channels/${ch.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !ch.isActive }),
      })
      if (res.ok) {
        setChannels((prev) =>
          prev.map((c) => (c.id === ch.id ? { ...c, isActive: !c.isActive } : c))
        )
      }
    } catch (err) {
      console.error('Failed to toggle channel status:', err)
    }
  }

  const handleDeleteChannel = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete channel "${name}"?`)) return
    try {
      const res = await fetch(`/api/iptv/channels/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setChannels((prev) => prev.filter((c) => c.id !== id))
        fetchFilters()
      }
    } catch (err) {
      console.error('Failed to delete channel:', err)
    }
  }

  // --- Peering Node CRUD Handlers ---

  const openCreateNodeModal = () => {
    setEditingNode(null)
    setNodeForm({
      name: '',
      region: '',
      countryCode: 'BD',
      latencyMs: '10',
      status: 'OPTIMAL',
      description: '',
      isActive: true,
    })
    setNodeModalOpen(true)
  }

  const openEditNodeModal = (node: PeeringNode) => {
    setEditingNode(node)
    setNodeForm({
      name: node.name,
      region: node.region,
      countryCode: node.countryCode,
      latencyMs: String(node.latencyMs),
      status: node.status,
      description: node.description || '',
      isActive: node.isActive,
    })
    setNodeModalOpen(true)
  }

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nodeForm.name.trim() || !nodeForm.region.trim()) return

    try {
      const url = editingNode
        ? `/api/iptv/peering-nodes/${editingNode.id}`
        : '/api/iptv/peering-nodes'
      const method = editingNode ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...nodeForm,
          latencyMs: Number(nodeForm.latencyMs) || 10,
        }),
      })

      if (res.ok) {
        setNodeModalOpen(false)
        fetchNodes()
      }
    } catch (err) {
      console.error('Failed to save peering node:', err)
    }
  }

  const handleDeleteNode = async (id: string, name: string) => {
    if (!confirm(`Delete peering node "${name}"?`)) return
    try {
      const res = await fetch(`/api/iptv/peering-nodes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setNodes((prev) => prev.filter((n) => n.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete node:', err)
    }
  }

  // --- M3U Import Handler ---

  const handleImportM3u = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!m3uUrl && !m3uContent) return
    setImportingM3u(true)
    setImportResult(null)

    try {
      const res = await fetch('/api/iptv/m3u/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: m3uUrl.trim() || undefined,
          content: m3uContent.trim() || undefined,
        }),
      })
      const data = await res.json()
      setImportResult(data)
      fetchChannels()
      fetchFilters()
    } catch (err: any) {
      setImportResult({ error: err?.message || 'Import failed' })
    } finally {
      setImportingM3u(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-netflix-red/20 border border-netflix-red/30 flex items-center justify-center text-netflix-red">
              <Tv className="h-4 w-4" />
            </div>
            <h2 className="text-2xl font-bold text-white">Live IPTV & Regional Peering</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Manage live broadcast channels, BDIX regional optical routing nodes, and custom M3U playlists from PostgreSQL.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 bg-gray-900 border border-gray-800 p-1 rounded-xl">
          <button
            onClick={() => setSubTab('channels')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              subTab === 'channels'
                ? 'bg-netflix-red text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Channels ({totalCount})
          </button>
          <button
            onClick={() => setSubTab('nodes')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              subTab === 'nodes'
                ? 'bg-netflix-red text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Peering Nodes ({nodes.length})
          </button>
          <button
            onClick={() => setSubTab('m3u')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              subTab === 'm3u'
                ? 'bg-netflix-red text-white shadow'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            Bulk Import M3U
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: CHANNELS MANAGEMENT */}
      {/* ========================================================================= */}
      {subTab === 'channels' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <Input
                  placeholder="Search channels by name, country, or category..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="bg-gray-900 border-gray-800 text-white pl-9 text-xs h-9"
                />
              </div>

              {/* Dynamic Country Filter */}
              <select
                aria-label="Filter channels by country"
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value)
                  setPage(1)
                }}
                className="bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Countries ({countries.reduce((acc, c) => acc + c.count, 0)})</option>
                {countries.map((c) => (
                  <option key={c.countryCode} value={c.countryCode}>
                    {c.country} ({c.count})
                  </option>
                ))}
              </select>

              {/* Dynamic Category Filter */}
              <select
                aria-label="Filter channels by category"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value)
                  setPage(1)
                }}
                className="bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {/* Peering Filter */}
              <select
                aria-label="Filter channels by peering type"
                value={selectedPeering}
                onChange={(e) => {
                  setSelectedPeering(e.target.value)
                  setPage(1)
                }}
                className="bg-gray-900 border border-gray-800 text-gray-200 text-xs rounded-lg px-3 py-2 cursor-pointer focus:outline-none"
              >
                <option value="ALL">All Peering</option>
                <option value="BDIX">⚡ BDIX Only</option>
                <option value="NIXI">🇮🇳 NIXI</option>
                <option value="GLOBAL">🌐 Global</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchChannels}
                disabled={loading}
                className="h-9 border-gray-800 bg-gray-900 text-gray-300 hover:text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin text-netflix-red' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="netflix"
                size="sm"
                onClick={openCreateChannelModal}
                className="h-9"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Live Channel
              </Button>
            </div>
          </div>

          {/* Channels Data Table */}
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-950/80 text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="px-5 py-3.5">Channel</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Country / Peering</th>
                    <th className="px-4 py-3.5">EPG / Current Program</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Views</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80">
                  {loading && channels.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-netflix-red" />
                          <span>Loading active channels from PostgreSQL...</span>
                        </div>
                      </td>
                    </tr>
                  ) : channels.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        No channels match your current filters. Click &quot;Add Live Channel&quot; or &quot;Bulk Import M3U&quot;.
                      </td>
                    </tr>
                  ) : (
                    channels.map((ch) => (
                      <tr key={ch.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-950 border border-gray-800 flex items-center justify-center p-1 overflow-hidden shrink-0">
                              <img
                                src={ch.logo || '/placeholder-poster.svg'}
                                alt={ch.name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src = '/placeholder-poster.svg'
                                }}
                              />
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm line-clamp-1 flex items-center gap-1.5">
                                {ch.name}
                                {ch.isBdixSupported && (
                                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1 rounded font-mono font-bold">
                                    BDIX
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-gray-400 font-mono truncate max-w-xs">
                                {ch.streamUrl}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-medium">
                            {ch.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <div className="text-gray-200 font-medium">{ch.country}</div>
                            <span className="text-[10px] uppercase font-mono text-gray-400 px-1 py-0.2 rounded bg-gray-950">
                              {ch.peeringType}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="text-gray-300 line-clamp-1">
                            {ch.currentProgram || '24/7 Live Stream'}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono">
                            {ch.quality || '1080p'}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleChannelStatus(ch)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold transition-colors cursor-pointer ${
                              ch.isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700'
                            }`}
                          >
                            {ch.isActive ? (
                              <>
                                <Check className="h-3 w-3" /> Active
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3" /> Draft
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-400">
                          {ch.viewCount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                playVideo({
                                  id: ch.id,
                                  title: `${ch.name} (Live IPTV)`,
                                  description: ch.currentProgram || 'Live FTA Broadcast',
                                  thumbnail: ch.logo,
                                  videoUrl: ch.streamUrl,
                                  duration: 0,
                                  releaseDate: new Date().toISOString(),
                                  rating: 9.0,
                                  maturityRating: 'LIVE',
                                  genre: [ch.category, ch.country],
                                  cast: [],
                                  director: [],
                                  producer: [],
                                  language: ch.language || 'Bengali',
                                  subtitles: [],
                                  audioTracks: [],
                                  qualityLevels: [],
                                  type: 'live',
                                  isExclusive: false,
                                  isPremium: false,
                                  tags: ['IPTV', ch.peeringType],
                                  createdAt: new Date().toISOString(),
                                  updatedAt: new Date().toISOString(),
                                })
                              }}
                              title="Preview Live Stream"
                              className="h-8 w-8 text-emerald-400 hover:bg-emerald-950 hover:text-emerald-300"
                            >
                              <Play className="h-3.5 w-3.5 fill-current" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditChannelModal(ch)}
                              title="Edit Channel Details"
                              className="h-8 w-8 text-blue-400 hover:bg-blue-950 hover:text-blue-300"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteChannel(ch.id, ch.name)}
                              title="Delete Channel"
                              className="h-8 w-8 text-red-400 hover:bg-red-950 hover:text-red-300"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400 bg-gray-950/60">
                <span>
                  Page {page} of {totalPages} ({totalCount} total channels)
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-7 px-2.5 text-xs border-gray-800 bg-gray-900"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-7 px-2.5 text-xs border-gray-800 bg-gray-900"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: PEERING NODES MANAGEMENT */}
      {/* ========================================================================= */}
      {subTab === 'nodes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-400">
              Low-latency edge nodes configured for BDIX, NIXI, and Global direct fiber peering.
            </p>
            <Button
              variant="netflix"
              size="sm"
              onClick={openCreateNodeModal}
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Peering Node
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {nodes.map((node) => (
              <div
                key={node.id}
                className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        {node.name}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            node.status === 'OPTIMAL'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          }`}
                        >
                          {node.status}
                        </span>
                      </h4>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                        <Globe className="h-3 w-3 text-gray-500" />
                        {node.region} ({node.countryCode})
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-mono font-black text-emerald-400 flex items-center justify-end gap-1">
                        <Zap className="h-4 w-4 fill-emerald-400" />
                        {node.latencyMs} ms
                      </div>
                      <span className="text-[10px] text-gray-500 font-mono">Edge Latency</span>
                    </div>
                  </div>

                  {node.description && (
                    <p className="text-xs text-gray-300 mt-3 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-gray-800/80">
                      {node.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-xs">
                  <span className="text-gray-400 font-mono">
                    Status: {node.isActive ? 'Active Edge' : 'Inactive'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditNodeModal(node)}
                      className="h-8 px-2.5 text-xs text-blue-400 hover:bg-blue-950"
                    >
                      <Edit2 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNode(node.id, node.name)}
                      className="h-8 px-2.5 text-xs text-red-400 hover:bg-red-950"
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: BULK IMPORT M3U */}
      {/* ========================================================================= */}
      {subTab === 'm3u' && (
        <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-6 max-w-3xl shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UploadCloud className="h-5 w-5 text-netflix-red" />
              Direct M3U Playlist Database Importer
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Import hundreds of live Free-to-Air stream channels automatically by providing an external M3U / M3U8 playlist URL or pasting raw M3U text below.
            </p>
          </div>

          <form onSubmit={handleImportM3u} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                Option A: Remote M3U Playlist URL
              </label>
              <Input
                placeholder="https://example.com/playlist.m3u"
                value={m3uUrl}
                onChange={(e) => setM3uUrl(e.target.value)}
                className="bg-gray-950 border-gray-800 text-white text-xs h-10"
              />
            </div>

            <div className="text-center text-xs text-gray-500 font-bold">— OR —</div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1.5">
                Option B: Raw M3U Content
              </label>
              <textarea
                rows={6}
                placeholder={`#EXTM3U\n#EXTINF:-1 tvg-logo="https://..." group-title="News", Channel Name\nhttps://stream-url.m3u8`}
                value={m3uContent}
                onChange={(e) => setM3uContent(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-gray-200 font-mono focus:outline-none focus:border-netflix-red"
              />
            </div>

            {importResult && (
              <div
                className={`p-4 rounded-xl text-xs ${
                  importResult.error
                    ? 'bg-red-950/60 border border-red-500/30 text-red-300'
                    : 'bg-emerald-950/60 border border-emerald-500/30 text-emerald-300'
                }`}
              >
                {importResult.error || importResult.message}
              </div>
            )}

            <Button
              type="submit"
              variant="netflix"
              disabled={importingM3u || (!m3uUrl.trim() && !m3uContent.trim())}
              className="w-full h-10 text-xs font-semibold"
            >
              <UploadCloud className={`h-4 w-4 mr-2 ${importingM3u ? 'animate-bounce' : ''}`} />
              {importingM3u ? 'Parsing & Ingesting Channels...' : 'Import to PostgreSQL Database'}
            </Button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CHANNEL CREATE / EDIT MODAL */}
      {/* ========================================================================= */}
      {channelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-white text-lg">
                {editingChannel ? `Edit: ${editingChannel.name}` : 'Add New Live Channel'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setChannelModalOpen(false)}
                className="h-8 w-8 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveChannel} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-gray-300 block mb-1">Channel Name *</label>
                  <Input
                    required
                    value={channelForm.name}
                    onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                    placeholder="e.g. Somoy News TV"
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="font-semibold text-gray-300 block mb-1">Category</label>
                  <Input
                    value={channelForm.category}
                    onChange={(e) => setChannelForm({ ...channelForm, category: e.target.value })}
                    placeholder="News, Sports, Entertainment..."
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Country Name</label>
                  <Input
                    value={channelForm.country}
                    onChange={(e) => setChannelForm({ ...channelForm, country: e.target.value })}
                    placeholder="Bangladesh, India, USA..."
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Country Code (2-Letter)</label>
                  <Input
                    value={channelForm.countryCode}
                    onChange={(e) => setChannelForm({ ...channelForm, countryCode: e.target.value.toUpperCase() })}
                    placeholder="BD, IN, US, GLOBAL..."
                    className="bg-gray-950 border-gray-800 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-300 block mb-1">Stream URL (HLS / m3u8 / YouTube) *</label>
                <Input
                  required
                  value={channelForm.streamUrl}
                  onChange={(e) => setChannelForm({ ...channelForm, streamUrl: e.target.value })}
                  placeholder="https://.../live.m3u8 or https://www.youtube.com/watch?v=..."
                  className="bg-gray-950 border-gray-800 text-white font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-gray-300 block mb-1">Backup Stream URL (Optional)</label>
                <Input
                  value={channelForm.backupStreamUrl}
                  onChange={(e) => setChannelForm({ ...channelForm, backupStreamUrl: e.target.value })}
                  placeholder="https://..."
                  className="bg-gray-950 border-gray-800 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Logo URL</label>
                  <Input
                    value={channelForm.logo}
                    onChange={(e) => setChannelForm({ ...channelForm, logo: e.target.value })}
                    placeholder="https://.../logo.png"
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Peering Type</label>
                  <select
                    aria-label="Channel peering type"
                    value={channelForm.peeringType}
                    onChange={(e) => setChannelForm({ ...channelForm, peeringType: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="BDIX">BDIX (Local BD)</option>
                    <option value="NIXI">NIXI (India)</option>
                    <option value="GLOBAL">GLOBAL (Anycast)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Current Program (EPG)</label>
                  <Input
                    value={channelForm.currentProgram}
                    onChange={(e) => setChannelForm({ ...channelForm, currentProgram: e.target.value })}
                    placeholder="e.g. Prime News Live"
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Stream Quality</label>
                  <Input
                    value={channelForm.quality}
                    onChange={(e) => setChannelForm({ ...channelForm, quality: e.target.value })}
                    placeholder="1080p FHD, 720p..."
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 font-semibold">
                  <input
                    type="checkbox"
                    checked={channelForm.isBdixSupported}
                    onChange={(e) => setChannelForm({ ...channelForm, isBdixSupported: e.target.checked })}
                    className="h-4 w-4 text-netflix-red rounded bg-gray-950 border-gray-800"
                  />
                  <span>Enable BDIX Direct Peering</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 font-semibold">
                  <input
                    type="checkbox"
                    checked={channelForm.isActive}
                    onChange={(e) => setChannelForm({ ...channelForm, isActive: e.target.checked })}
                    className="h-4 w-4 text-netflix-red rounded bg-gray-950 border-gray-800"
                  />
                  <span>Published / Active</span>
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setChannelModalOpen(false)}
                  className="border-gray-800 text-gray-300"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="netflix">
                  {editingChannel ? 'Save Changes' : 'Create Channel'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PEERING NODE CREATE / EDIT MODAL */}
      {/* ========================================================================= */}
      {nodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-white text-lg">
                {editingNode ? `Edit: ${editingNode.name}` : 'Add Peering Edge Node'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNodeModalOpen(false)}
                className="h-8 w-8 text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSaveNode} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-gray-300 block mb-1">Node Name *</label>
                <Input
                  required
                  value={nodeForm.name}
                  onChange={(e) => setNodeForm({ ...nodeForm, name: e.target.value })}
                  placeholder="e.g. BDIX Core Peering Node (Dhaka)"
                  className="bg-gray-950 border-gray-800 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Region / City *</label>
                  <Input
                    required
                    value={nodeForm.region}
                    onChange={(e) => setNodeForm({ ...nodeForm, region: e.target.value })}
                    placeholder="Dhaka, Bangladesh"
                    className="bg-gray-950 border-gray-800 text-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Country Code</label>
                  <Input
                    value={nodeForm.countryCode}
                    onChange={(e) => setNodeForm({ ...nodeForm, countryCode: e.target.value.toUpperCase() })}
                    placeholder="BD, IN, GLOBAL"
                    className="bg-gray-950 border-gray-800 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Latency (ms)</label>
                  <Input
                    type="number"
                    value={nodeForm.latencyMs}
                    onChange={(e) => setNodeForm({ ...nodeForm, latencyMs: e.target.value })}
                    placeholder="8"
                    className="bg-gray-950 border-gray-800 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-gray-300 block mb-1">Status</label>
                  <select
                    aria-label="Node status"
                    value={nodeForm.status}
                    onChange={(e) => setNodeForm({ ...nodeForm, status: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg px-3 py-2 text-xs"
                  >
                    <option value="OPTIMAL">OPTIMAL</option>
                    <option value="ONLINE">ONLINE</option>
                    <option value="DEGRADED">DEGRADED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold text-gray-300 block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={nodeForm.description}
                  onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
                  placeholder="Low-latency routing details..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2 text-xs text-gray-200"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-gray-300 font-semibold">
                <input
                  type="checkbox"
                  checked={nodeForm.isActive}
                  onChange={(e) => setNodeForm({ ...nodeForm, isActive: e.target.checked })}
                  className="h-4 w-4 text-netflix-red rounded bg-gray-950 border-gray-800"
                />
                <span>Active Peering Node</span>
              </label>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-gray-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNodeModalOpen(false)}
                  className="border-gray-800 text-gray-300"
                >
                  Cancel
                </Button>
                <Button type="submit" variant="netflix">
                  {editingNode ? 'Save Node' : 'Create Node'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
