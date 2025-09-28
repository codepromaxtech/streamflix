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
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { AdminSidebar } from '@/components/admin/admin-sidebar'
import { StatsCard } from '@/components/admin/stats-card'
import { RecentActivity } from '@/components/admin/recent-activity'
import { ContentTable } from '@/components/admin/content-table'
import { UserTable } from '@/components/admin/user-table'

// Mock data - in production this would come from your API
const mockStats = {
  totalUsers: 15420,
  totalContent: 2847,
  totalRevenue: 89650,
  activeSubscriptions: 8930,
  monthlyGrowth: {
    users: 12.5,
    content: 8.3,
    revenue: 15.7,
    subscriptions: 9.2,
  }
}

const mockRecentActivity = [
  {
    id: '1',
    type: 'content',
    title: 'New movie uploaded',
    description: 'The Batman (2022) has been uploaded and is pending approval',
    timestamp: '2 minutes ago',
    status: 'pending',
  },
  {
    id: '2',
    type: 'user',
    title: 'Premium subscription',
    description: 'John Doe upgraded to Premium plan',
    timestamp: '15 minutes ago',
    status: 'success',
  },
  {
    id: '3',
    type: 'payment',
    title: 'Payment received',
    description: '$12.99 payment processed via Stripe',
    timestamp: '1 hour ago',
    status: 'success',
  },
  {
    id: '4',
    type: 'content',
    title: 'Content reported',
    description: 'User reported inappropriate content in "Action Movie"',
    timestamp: '2 hours ago',
    status: 'warning',
  },
]

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useAuth()

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      window.location.href = '/'
    }
  }, [user])

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-netflix-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Users"
                value={mockStats.totalUsers.toLocaleString()}
                change={mockStats.monthlyGrowth.users}
                icon={Users}
                color="blue"
              />
              <StatsCard
                title="Total Content"
                value={mockStats.totalContent.toLocaleString()}
                change={mockStats.monthlyGrowth.content}
                icon={Video}
                color="green"
              />
              <StatsCard
                title="Monthly Revenue"
                value={`$${mockStats.totalRevenue.toLocaleString()}`}
                change={mockStats.monthlyGrowth.revenue}
                icon={DollarSign}
                color="yellow"
              />
              <StatsCard
                title="Active Subscriptions"
                value={mockStats.activeSubscriptions.toLocaleString()}
                change={mockStats.monthlyGrowth.subscriptions}
                icon={TrendingUp}
                color="purple"
              />
            </div>

            {/* Recent Activity */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <RecentActivity activities={mockRecentActivity} />
              </div>
              
              {/* Quick Actions */}
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="ghost"
                    onClick={() => setActiveTab('content')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Content
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="ghost"
                    onClick={() => setActiveTab('users')}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="ghost"
                    onClick={() => setActiveTab('analytics')}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )

      case 'content':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Content Management</h2>
              <Button variant="netflix" className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Add Content
              </Button>
            </div>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <Button variant="outline" className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            
            <ContentTable searchQuery={searchQuery} />
          </div>
        )

      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">User Management</h2>
              <div className="flex gap-2">
                <Button variant="outline">Export Users</Button>
                <Button variant="netflix">Send Notification</Button>
              </div>
            </div>
            
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
              </div>
              <Button variant="outline" className="flex items-center">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            
            <UserTable searchQuery={searchQuery} />
          </div>
        )

      case 'analytics':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white">Analytics & Reports</h2>
            
            {/* Analytics content would go here */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">User Engagement</h3>
                <div className="h-64 flex items-center justify-center text-gray-400">
                  Chart placeholder - implement with Chart.js or similar
                </div>
              </div>
              
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Revenue Trends</h3>
                <div className="h-64 flex items-center justify-center text-gray-400">
                  Chart placeholder - implement with Chart.js or similar
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-netflix-black flex">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Admin Dashboard
            </h1>
            <p className="text-gray-400">
              Welcome back, {user.name}. Here's what's happening with your platform.
            </p>
          </div>

          {/* Content */}
          {renderContent()}
        </div>
      </main>
    </div>
  )
}
