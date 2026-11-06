'use client'

import { useState, useEffect, useMemo } from 'react'
import { Header } from '@/components/layout/header'
import {
  Tv,
  Radio,
  Wifi,
  Search,
  Globe,
  Sparkles,
  Zap,
  UploadCloud,
  Check,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Play,
  Volume2,
  Maximize2,
  SlidersHorizontal,
  X,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IptvPlayer } from '@/components/iptv/iptv-player'

interface IptvChannel {
  id: string
  name: string
  logo: string
  category: string
  country: string
  countryCode: string
  language: string
  quality: string
  resolution: string
  streamUrl: string
  backupStreamUrl?: string
  isBdixSupported: boolean
  peeringType: string
  currentProgram?: string
  nextProgram?: string
  epgTime?: string
  viewCount: number
}

interface PeeringNode {
  id: string
  name: string
  region: string
  countryCode: string
  latencyMs: number
  status: string
  description: string
}

interface CountryMeta {
  country: string
  countryCode: string
  count: number
}

function extractYouTubeId(url?: string): string | null {
  if (!url || typeof url !== 'string') return null
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  const match = url.match(regExp)
  return match && match[1] ? match[1] : null
}

export default function IptvPage() {
  const [channels, setChannels] = useState<IptvChannel[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [countries, setCountries] = useState<CountryMeta[]>([])
  const [peeringNodes, setPeeringNodes] = useState<PeeringNode[]>([])
  const [loading, setLoading] = useState(true)

  // Filtering states
  const [selectedCountry, setSelectedCountry] = useState('ALL')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [selectedPeering, setSelectedPeering] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // Selected Active Channel for Playback
  const [activeChannel, setActiveChannel] = useState<IptvChannel | null>(null)
  const [activePeeringNode, setActivePeeringNode] = useState<PeeringNode | null>(null)

  // M3U Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [m3uUrl, setM3uUrl] = useState('')
  const [m3uText, setM3uText] = useState('')
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  // 1. Fetch Dynamic Data from Database
  const fetchIptvData = async () => {
    try {
      setLoading(true)

      const [channelsRes, catsRes, countriesRes, nodesRes] = await Promise.all([
        fetch('/api/iptv/channels?limit=150'),
        fetch('/api/iptv/categories'),
        fetch('/api/iptv/countries'),
        fetch('/api/iptv/peering-nodes'),
      ])

      if (channelsRes.ok) {
        const data = await channelsRes.json()
        const channelList: IptvChannel[] = data.channels || []
        setChannels(channelList)
        if (channelList.length > 0 && !activeChannel) {
          setActiveChannel(channelList[0])
        }
      }

      if (catsRes.ok) {
        const catsData = await catsRes.json()
        setCategories(Array.isArray(catsData) ? catsData : [])
      }

      if (countriesRes.ok) {
        const countriesData = await countriesRes.json()
        setCountries(Array.isArray(countriesData) ? countriesData : [])
      }

      if (nodesRes.ok) {
        const nodesData = await nodesRes.json()
        const nodesList: PeeringNode[] = Array.isArray(nodesData) ? nodesData : []
        setPeeringNodes(nodesList)
        if (nodesList.length > 0 && !activePeeringNode) {
          setActivePeeringNode(nodesList[0])
        }
      }
    } catch (err) {
      console.error('Failed to load dynamic IPTV database catalog:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIptvData()
  }, [])

  // 2. Filter Channels Client-Side / Real-Time
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      // Country Filter
      if (selectedCountry !== 'ALL') {
        const matchesCode = ch.countryCode.toUpperCase() === selectedCountry.toUpperCase()
        const matchesCountry = ch.country.toUpperCase() === selectedCountry.toUpperCase()
        if (!matchesCode && !matchesCountry) return false
      }

      // Category Filter
      if (selectedCategory !== 'ALL') {
        if (ch.category.toLowerCase() !== selectedCategory.toLowerCase()) return false
      }

      // Peering Filter
      if (selectedPeering !== 'ALL') {
        if (selectedPeering === 'BDIX' && !ch.isBdixSupported) return false
        if (selectedPeering !== 'BDIX' && ch.peeringType !== selectedPeering) return false
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchesName = ch.name.toLowerCase().includes(q)
        const matchesCountry = ch.country.toLowerCase().includes(q)
        const matchesProg = (ch.currentProgram || '').toLowerCase().includes(q)
        const matchesCat = ch.category.toLowerCase().includes(q)
        if (!matchesName && !matchesCountry && !matchesProg && !matchesCat) return false
      }

      return true
    })
  }, [channels, selectedCountry, selectedCategory, selectedPeering, searchQuery])

  // 3. Handle M3U Custom Playlist Import
  const handleImportM3u = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!m3uUrl.trim() && !m3uText.trim()) return

    try {
      setImporting(true)
      setImportMessage(null)

      const res = await fetch('/api/iptv/m3u/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: m3uUrl.trim() || undefined,
          content: m3uText.trim() || undefined,
        }),
      })

      const result = await res.json()
      if (res.ok) {
        setImportMessage(result.message || 'M3U imported successfully into database!')
        setM3uUrl('')
        setM3uText('')
        // Refresh catalog from DB
        fetchIptvData()
      } else {
        setImportMessage(`Import Error: ${result.message || 'Failed to parse playlist'}`)
      }
    } catch (err: any) {
      setImportMessage(`Connection Error: ${err.message}`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-netflix-black text-white flex flex-col selection:bg-netflix-red selection:text-white">
      <Header />

      <main className="flex-1 pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto w-full">
        {/* Top Header Banner & Stats */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600/15 border border-red-500/30 text-xs font-bold text-red-400 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
              BROADCAST STREAMING ENGINE
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              <Tv className="h-8 w-8 text-netflix-red" />
              Live IPTV &amp; BDIX Peering
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              High-definition live broadcast channels with zero-buffer local BDIX peering for Bangladesh and low-latency global CDN edge routing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsImportModalOpen(true)}
              className="border-gray-700 bg-gray-900/90 hover:bg-gray-800 text-gray-200 text-xs font-semibold"
            >
              <UploadCloud className="h-3.5 w-3.5 mr-1.5 text-netflix-red" />
              Import Custom M3U / ISP Playlist
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchIptvData}
              disabled={loading}
              className="text-xs text-gray-400 hover:text-white"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MAIN STAGE: Live Stream Player & Active Channel Telemetry */}
        {/* ============================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left: Broadcast Screen with Shaka Player & Stream Switcher */}
          <div className="lg:col-span-8">
            <IptvPlayer channel={activeChannel} peeringNode={activePeeringNode} />
          </div>

          {/* Right: Regional Peering & Routing Gateway Manager */}
          <div className="lg:col-span-4 flex flex-col bg-gray-900/80 border border-gray-800 rounded-3xl p-5 shadow-xl backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Regional Peering Exchange
                </h3>
              </div>
              <span className="text-[11px] text-emerald-400 font-mono font-semibold">
                ● PEERING ACTIVE
              </span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Select your local exchange network for ultra-low latency routing. Bangladeshi ISP users can select <strong className="text-white">BDIX</strong> for zero-buffering high-bandwidth 1080p streaming.
            </p>

            {/* Peering Nodes List (Dynamically from DB) */}
            <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[290px] pr-1">
              {peeringNodes.map((node) => {
                const isSelected = activePeeringNode?.id === node.id
                return (
                  <div
                    key={node.id}
                    onClick={() => setActivePeeringNode(node)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-950/40 shadow-lg shadow-emerald-950/50'
                        : 'border-gray-800 bg-gray-950/60 hover:border-gray-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white">{node.name}</span>
                        {node.countryCode === 'BD' && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500 text-black">
                            BDIX
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">{node.region}</p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-mono font-bold ${
                          node.latencyMs < 20
                            ? 'text-emerald-400'
                            : node.latencyMs < 60
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      >
                        {node.latencyMs} ms
                      </span>
                      <p className="text-[9px] text-gray-500 uppercase">{node.status}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* BDIX & Regional Routing Feature Highlights */}
            <div className="p-3 bg-black/40 border border-gray-800/80 rounded-2xl text-[11px] text-gray-400 space-y-1">
              <div className="flex items-center justify-between text-gray-300">
                <span>⚡ BDIX Support:</span>
                <span className="text-emerald-400 font-semibold font-mono">10Gbps Peering</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>🌐 Global Fallback:</span>
                <span className="text-blue-400 font-semibold font-mono">Anycast Edge</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>🛡 Protocol:</span>
                <span className="text-purple-300 font-semibold font-mono">HLS / MPEG-TS / RTMP</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CHANNEL FILTERS & DISCOVERY BAR */}
        {/* ============================================================== */}
        <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 mb-8 shadow-xl backdrop-blur-xl space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Bar */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search live channels or programs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-gray-950 border-gray-800 rounded-xl text-xs text-white placeholder:text-gray-500 focus-visible:ring-netflix-red"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Country Tabs (Dynamic from DB) */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCountry('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCountry === 'ALL'
                    ? 'bg-netflix-red text-white shadow-md shadow-netflix-red/30'
                    : 'bg-gray-950/80 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                🌍 All Countries ({channels.length})
              </button>
              {countries.map((c) => (
                <button
                  key={c.countryCode}
                  onClick={() => setSelectedCountry(c.countryCode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    selectedCountry === c.countryCode
                      ? 'bg-netflix-red text-white shadow-md shadow-netflix-red/30'
                      : 'bg-gray-950/80 text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  {c.countryCode === 'BD' && '🇧🇩'}
                  {c.countryCode === 'IN' && '🇮🇳'}
                  {c.countryCode === 'US' && '🇺🇸'}
                  {c.countryCode === 'UK' && '🇬🇧'}
                  {c.countryCode === 'GLOBAL' && '🌐'}
                  <span>{c.country}</span>
                  <span className="text-[10px] opacity-75 font-mono">({c.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category & Peering Filter Pills (Dynamic from DB) */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-800/80">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <span className="text-[11px] text-gray-400 font-bold uppercase mr-1">Category:</span>
              <button
                onClick={() => setSelectedCategory('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedCategory === 'ALL'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-950/60 text-gray-400 hover:text-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    selectedCategory === cat
                      ? 'bg-gray-700 text-white'
                      : 'bg-gray-950/60 text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Peering Route Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-400 font-bold uppercase mr-1">Peering:</span>
              <button
                onClick={() => setSelectedPeering('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedPeering === 'ALL'
                    ? 'bg-gray-700 text-white'
                    : 'bg-gray-950/60 text-gray-400 hover:text-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedPeering('BDIX')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  selectedPeering === 'BDIX'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-950/50 text-emerald-300 hover:bg-emerald-900/50 border border-emerald-500/30'
                }`}
              >
                <Zap className="h-3 w-3" />
                BDIX Only
              </button>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* CHANNEL GRID: Live Broadcast Cards */}
        {/* ============================================================== */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-netflix-red" />
              Available Live Channels ({filteredChannels.length})
            </h2>
            <span className="text-xs text-gray-400">
              Click any channel to immediately stream live
            </span>
          </div>

          {filteredChannels.length === 0 ? (
            <div className="bg-gray-900/60 border border-gray-800 rounded-3xl p-12 text-center">
              <Tv className="h-12 w-12 mx-auto text-gray-600 mb-3" />
              <p className="text-gray-300 font-bold">No channels match your current filter.</p>
              <p className="text-xs text-gray-500 mt-1">Try resetting the country or category filters.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCountry('ALL')
                  setSelectedCategory('ALL')
                  setSelectedPeering('ALL')
                  setSearchQuery('')
                }}
                className="mt-4 text-xs"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredChannels.map((channel) => {
                const isActive = activeChannel?.id === channel.id
                return (
                  <div
                    key={channel.id}
                    onClick={() => setActiveChannel(channel)}
                    className={`group relative rounded-2xl p-4 border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between ${
                      isActive
                        ? 'border-netflix-red bg-red-950/30 shadow-xl shadow-red-950/40 ring-1 ring-netflix-red'
                        : 'border-gray-800 bg-gray-900/80 hover:border-gray-700 hover:bg-gray-800/80 hover:-translate-y-1'
                    }`}
                  >
                    {/* Header: Logo, Badges */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        {/* Logo Container */}
                        <div className="h-12 w-16 rounded-xl bg-black/60 border border-gray-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={channel.logo}
                            alt={channel.name}
                            className="max-h-full max-w-full object-contain"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = '/placeholder-poster.svg'
                            }}
                          />
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white tracking-wider">
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            LIVE
                          </span>
                          {channel.isBdixSupported && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 font-mono">
                              BDIX
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Name & Country */}
                      <h3 className="font-extrabold text-sm text-white group-hover:text-netflix-red transition-colors line-clamp-1">
                        {channel.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-0.5">
                        <span>{channel.country}</span>
                        <span>•</span>
                        <span className="text-gray-300 font-semibold">{channel.category}</span>
                      </div>
                    </div>

                    {/* Program Info */}
                    <div className="mt-4 pt-3 border-t border-gray-800/80 text-left">
                      <p className="text-[10px] uppercase font-bold text-gray-500 font-mono">
                        CURRENTLY BROADCASTING:
                      </p>
                      <p className="text-xs font-semibold text-gray-200 line-clamp-1 mt-0.5">
                        {channel.currentProgram || '24/7 Live Stream'}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400 font-mono">
                        <span>{channel.quality}</span>
                        <span className="group-hover:text-netflix-red font-bold flex items-center gap-0.5">
                          {isActive ? 'PLAYING NOW' : 'WATCH STREAM'}
                          <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* M3U PLAYLIST IMPORT MODAL */}
        {/* ============================================================== */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="max-w-lg w-full bg-gray-900 border border-gray-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <UploadCloud className="h-5 w-5 text-netflix-red" />
                  <h3 className="text-base font-bold text-white">
                    Import Custom M3U / ISP Playlist
                  </h3>
                </div>
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                Add your local ISP BDIX IPTV playlist or any public M3U/M3U8 feed directly into the database. All channels will be parsed, categorized, and added to the live catalog.
              </p>

              <form onSubmit={handleImportM3u} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 mb-1 block">
                    Option A: M3U Playlist URL (HTTP / HTTPS)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://example.com/playlist.m3u"
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    className="bg-gray-950 border-gray-800 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 mb-1 block">
                    Option B: Paste Raw M3U Content
                  </label>
                  <textarea
                    rows={4}
                    placeholder="#EXTM3U&#10;#EXTINF:-1 tvg-logo=&quot;...&quot; group-title=&quot;News&quot;, My Channel&#10;http://stream.m3u8"
                    value={m3uText}
                    onChange={(e) => setM3uText(e.target.value)}
                    className="w-full rounded-xl bg-gray-950 border border-gray-800 p-2.5 text-xs text-white font-mono focus:border-netflix-red focus:outline-none"
                  />
                </div>

                {importMessage && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium ${
                      importMessage.includes('Error')
                        ? 'bg-red-950/60 text-red-300 border border-red-500/30'
                        : 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {importMessage}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsImportModalOpen(false)}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="netflix"
                    size="sm"
                    disabled={importing || (!m3uUrl && !m3uText)}
                    className="text-xs font-semibold shadow-md shadow-netflix-red/30"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Importing to Database...
                      </>
                    ) : (
                      'Save to Database'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
