'use client'

import { 
  LayoutDashboard, 
  Video, 
  Users, 
  TrendingUp, 
  Settings, 
  DollarSign,
  MessageSquare,
  Shield,
  Upload,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const menuItems = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
  },
  {
    id: 'content',
    label: 'Content',
    icon: Video,
  },
  {
    id: 'users',
    label: 'Users',
    icon: Users,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: TrendingUp,
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: DollarSign,
  },
  {
    id: 'ads',
    label: 'Advertisements',
    icon: MessageSquare,
  },
  {
    id: 'uploads',
    label: 'Uploads',
    icon: Upload,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
  },
]

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6">
      {/* Logo */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-netflix-red">StreamFlix Admin</h2>
      </div>

      {/* Navigation */}
      <nav className="space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <Button
              key={item.id}
              variant="ghost"
              className={`w-full justify-start ${
                isActive 
                  ? 'bg-netflix-red text-white hover:bg-netflix-red/90' 
                  : 'text-gray-300 hover:text-white hover:bg-gray-800'
              }`}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className="h-4 w-4 mr-3" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-8">
        <div className="text-xs text-gray-500">
          StreamFlix Admin v1.0
        </div>
      </div>
    </aside>
  )
}
