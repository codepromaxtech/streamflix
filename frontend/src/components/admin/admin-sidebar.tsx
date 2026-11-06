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
  Bell,
  Radio,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

import { X } from 'lucide-react'

interface AdminSidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  isOpen?: boolean
  onClose?: () => void
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
    id: 'scraping',
    label: 'Scraper & Ingest',
    icon: Radio,
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

export function AdminSidebar({ activeTab, onTabChange, isOpen, onClose }: AdminSidebarProps) {
  const sidebarContent = (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 p-6 flex flex-col h-full min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-netflix-red">StreamFlix Admin</h2>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="space-y-2 flex-1 overflow-y-auto">
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
              onClick={() => {
                onTabChange(item.id)
                onClose?.()
              }}
            >
              <Icon className="h-4 w-4 mr-3" />
              {item.label}
            </Button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto pt-6 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          StreamFlix Admin v1.0
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop static sidebar */}
      <div className="hidden md:block">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}

