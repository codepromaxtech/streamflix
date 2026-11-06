'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Video, 
  DollarSign, 
  TrendingUp, 
  Play, 
  Eye, 
  Clock,
  Star,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Menu,
  Radio,
  RefreshCw,
  X,
  CheckCircle2,
  Tv
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { StatsCard } from '@/components/admin/stats-card'
import { ContentTable } from '@/components/admin/content-table'
import { UserTable } from '@/components/admin/user-table'
import { RecentActivity } from '@/components/admin/recent-activity'
import { ScraperManager } from '@/components/admin/scraper-manager'
import { IptvTable } from '@/components/admin/iptv-table'

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [stats, setStats] = useState<any>({
    totalUsers: 0,
    totalContent: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    contentViews: 0,
    monthlyGrowth: {
      users: 12.5,
      content: 8.3,
      revenue: 0,
      subscriptions: 10.0,
    },
    recentActivity: [],
  })
  const [statsLoading, setStatsLoading] = useState(true)
  const [isAddContentOpen, setIsAddContentOpen] = useState(false)
  const [newContent, setNewContent] = useState({
    title: '',
    type: 'MOVIE',
    genre: 'Action',
    duration: '120',
    description: '',
    rating: '8.5',
    thumbnail: '/placeholder-poster.svg',
    videoUrl: '',
  })
  const [addingContent, setAddingContent] = useState(false)

  const { user, loading } = useAuth()

  const getAuthHeader = (): Record<string, string> => {
    if (typeof window === 'undefined') return {}
    const token = localStorage.getItem('auth-token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchStats = async () => {
    try {
      setStatsLoading(true)
      const res = await fetch('/api/admin/stats', {
        headers: getAuthHeader(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to load stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    fetchStats()
  }, [])

  const handleCreateContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newContent.title.trim()) return
    setAddingContent(true)

    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        credentials: 'include',
        body: JSON.stringify({
          ...newContent,
          duration: Number(newContent.duration) * 60,
          rating: Number(newContent.rating),
        }),
      })

      if (res.ok) {
        setIsAddContentOpen(false)
        setNewContent({
          title: '',
          type: 'MOVIE',
          genre: 'Action',
          duration: '120',
          description: '',
          rating: '8.5',
          thumbnail: '/placeholder-poster.svg',
          videoUrl: '',
        })
        fetchStats()
      }
    } catch (err) {
      console.error('Failed to create content:', err)
    } finally {
      setAddingContent(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-netflix-black flex flex-col items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-netflix-red border-t-transparent shadow-lg mb-4" />
        <p className="text-gray-400 text-sm animate-pulse">Loading Admin Workspace...</p>
      </div>
    )
  }

  // Not signed in
  if (!user) {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 text-netflix-red" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Sign In Required</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Please sign in with your administrator account (<code className="text-gray-300">admin@streamflix.com</code>) to access the management portal.
          </p>
          <Button variant="netflix" asChild className="w-full h-11 text-base">
            <a href="/auth/login">Go to Login</a>
          </Button>
        </div>
      </div>
    )
  }

  // Signed in but not an ADMIN
  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="w-14 h-14 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed">
            Signed in as <strong className="text-white">{user.email}</strong>. This account does not have administrative privileges.
          </p>
          <div className="flex flex-col gap-3">
            <Button variant="netflix" asChild className="w-full">
              <a href="/">Return to Home</a>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <a href="/auth/login">Switch Account</a>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Real Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Registered Users"
                value={(stats.totalUsers || 0).toLocaleString()}
                change={stats.monthlyGrowth?.users || 12.5}
                icon={Users}
                color="blue"
              />
              <StatsCard
                title="Live Content"
                value={(stats.totalContent || 0).toLocaleString()}
                change={stats.monthlyGrowth?.content || 8.3}
                icon={Video}
                color="green"
              />
              <StatsCard
                title="Platform Revenue"
                value={`$${(stats.totalRevenue || 0).toLocaleString()}`}
                change={stats.monthlyGrowth?.revenue || 0}
                icon={DollarSign}
                color="yellow"
              />
              <StatsCard
                title="Active Subscriptions"
                value={(stats.activeSubscriptions || 0).toLocaleString()}
                change={stats.monthlyGrowth?.subscriptions || 10.0}
                icon={TrendingUp}
                color="purple"
              />
            </div>

            {/* Quick Ingestion Notice / Callout */}
            <div className="bg-gradient-to-r from-red-950/40 via-gray-900 to-black border border-netflix-red/30 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-netflix-red/20 rounded-lg text-netflix-red">
                  <Radio className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">
                    P2P Torrent & Metadata Scraper Engine Active
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Scrape movies, TV series, magnet hashes, and TMDB posters directly into the catalog.
                  </p>
                </div>
              </div>
              <Button
                variant="netflix"
                size="sm"
                onClick={() => setActiveTab('scraping')}
                className="shrink-0"
              >
                Open Scraper Manager
              </Button>
            </div>

            {/* Real Recent Activity */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RecentActivity
                  activities={
                    stats.recentActivity && stats.recentActivity.length > 0
                      ? stats.recentActivity
                      : [
                          {
                            id: 'default-1',
                            type: 'user',
                            title: 'Admin Session Active',
                            description: `Logged in as ${user.email}`,
                            timestamp: 'Just now',
                            status: 'success',
                          },
                        ]
                  }
                />
              </div>
              
              {/* Quick Actions */}
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start text-white hover:bg-gray-700" 
                    variant="ghost"
                    onClick={() => setIsAddContentOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2 text-netflix-red" />
                    Add New Content
                  </Button>
                  <Button 
                    className="w-full justify-start text-white hover:bg-gray-700" 
                    variant="ghost"
                    onClick={() => setActiveTab('iptv')}
                  >
                    <Tv className="h-4 w-4 mr-2 text-netflix-red" />
                    Live IPTV & BDIX Channels
                  </Button>
                  <Button 
                    className="w-full justify-start text-white hover:bg-gray-700" 
                    variant="ghost"
                    onClick={() => setActiveTab('scraping')}
                  >
                    <Radio className="h-4 w-4 mr-2 text-emerald-400" />
                    Torrent & Metadata Scraper
                  </Button>
                  <Button 
                    className="w-full justify-start text-white hover:bg-gray-700" 
                    variant="ghost"
                    onClick={() => setActiveTab('users')}
                  >
                    <Users className="h-4 w-4 mr-2 text-blue-400" />
                    Manage Users
                  </Button>
                  <Button 
                    className="w-full justify-start text-white hover:bg-gray-700" 
                    variant="ghost"
                    onClick={() => setActiveTab('content')}
                  >
                    <Video className="h-4 w-4 mr-2 text-purple-400" />
                    Catalog Management
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'iptv':
        return <IptvTable />

      case 'scraping':
        return <ScraperManager />

      case 'content':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Content Catalog</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Manage live database movies and series, stream URLs, and publication status.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('scraping')}
                  className="flex items-center border-gray-700 bg-gray-800 hover:bg-gray-700 text-gray-200"
                >
                  <Radio className="h-4 w-4 mr-2 text-emerald-400" />
                  Scrape Torrents
                </Button>
                <Button
                  variant="netflix"
                  onClick={() => setIsAddContentOpen(true)}
                  className="flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Content
                </Button>
              </div>
            </div>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search real database content by title, genre, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <ContentTable searchQuery={searchQuery} onContentUpdated={fetchStats} />
          </div>
        )

      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Real registered accounts, roles, subscription tiers, and account status.
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search database users by name, email, or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
            </div>
            
            <UserTable searchQuery={searchQuery} onUsersUpdated={fetchStats} />
          </div>
        )

      case 'analytics':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Analytics & Telemetry</h2>
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Total Content Views</h3>
                <div className="text-3xl font-extrabold text-netflix-red mb-1">
                  {(stats.contentViews || 0).toLocaleString()}
                </div>
                <p className="text-xs text-gray-400">
                  Aggregated across all streaming sessions and video plays.
                </p>
              </div>
              
              <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-2">Subscription Conversion</h3>
                <div className="text-3xl font-extrabold text-emerald-400 mb-1">
                  {stats.totalUsers > 0
                    ? `${Math.round(((stats.activeSubscriptions || 0) / stats.totalUsers) * 100)}%`
                    : '100%'}
                </div>
                <p className="text-xs text-gray-400">
                  Active premium/free subscriptions relative to total registered accounts.
                </p>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="bg-gray-800/40 rounded-xl p-8 border border-gray-700/60 text-center">
            <h3 className="text-xl font-semibold text-white capitalize mb-2">{activeTab} Management</h3>
            <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
              Configuration and monitoring for {activeTab} is synchronized with the production backend.
            </p>
            <Button variant="outline" onClick={() => setActiveTab('overview')}>
              Back to Overview
            </Button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-netflix-black flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800">
        <h2 className="text-xl font-bold text-netflix-red">StreamFlix Admin</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(true)}
          className="text-white hover:bg-gray-800"
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                Admin Dashboard
              </h1>
              <p className="text-gray-400 text-sm md:text-base">
                Welcome back, {user?.name || 'Administrator'}. Real platform data synchronized from PostgreSQL.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStats}
                disabled={statsLoading}
                className="border-gray-700 bg-gray-800/80 hover:bg-gray-700 text-gray-200"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
                Sync Real Data
              </Button>
            </div>
          </div>

          {/* Content */}
          {renderContent()}
        </div>
      </main>

      {/* Add Content Modal */}
      {isAddContentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative">
            <button
              onClick={() => setIsAddContentOpen(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-bold text-white mb-1">Add Content to Catalog</h3>
            <p className="text-xs text-gray-400 mb-5">
              Enter content details to register a new title directly into the database.
            </p>

            <form onSubmit={handleCreateContent} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">Title *</label>
                <Input
                  required
                  placeholder="e.g. Inception"
                  value={newContent.title}
                  onChange={(e) => setNewContent({ ...newContent, title: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1">Type</label>
                  <select
                    value={newContent.type}
                    onChange={(e) => setNewContent({ ...newContent, type: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-netflix-red"
                  >
                    <option value="MOVIE">Movie</option>
                    <option value="SERIES">Series</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1">Genre</label>
                  <Input
                    placeholder="e.g. Sci-Fi, Drama"
                    value={newContent.genre}
                    onChange={(e) => setNewContent({ ...newContent, genre: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1">Duration (mins)</label>
                  <Input
                    type="number"
                    placeholder="120"
                    value={newContent.duration}
                    onChange={(e) => setNewContent({ ...newContent, duration: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-300 block mb-1">Rating (0-10)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="8.5"
                    value={newContent.rating}
                    onChange={(e) => setNewContent({ ...newContent, rating: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-300 block mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Short synopsis..."
                  value={newContent.description}
                  onChange={(e) => setNewContent({ ...newContent, description: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-md p-2.5 text-sm text-white focus:outline-none focus:border-netflix-red"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAddContentOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="netflix"
                  disabled={addingContent}
                >
                  {addingContent ? 'Saving...' : 'Add Content'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
