'use client'

import { useState } from 'react'
import { Bell, X, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'

// Mock notifications - in production this would come from your API
const mockNotifications = [
  {
    id: '1',
    title: 'New Episode Available',
    message: 'Stranger Things Season 5, Episode 1 is now available to watch.',
    type: 'content',
    isRead: false,
    createdAt: '2024-01-15T10:30:00Z',
  },
  {
    id: '2',
    title: 'Payment Successful',
    message: 'Your Premium subscription has been renewed for another month.',
    type: 'payment',
    isRead: false,
    createdAt: '2024-01-14T15:45:00Z',
  },
  {
    id: '3',
    title: 'Welcome to StreamFlix!',
    message: 'Thanks for joining! Explore thousands of movies and shows.',
    type: 'system',
    isRead: true,
    createdAt: '2024-01-10T09:00:00Z',
  },
]

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState(mockNotifications)

  const unreadCount = notifications.filter(n => !n.isRead).length

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, isRead: true }))
    )
  }

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'content':
        return '🎬'
      case 'payment':
        return '💳'
      case 'system':
        return '🔔'
      default:
        return '📢'
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="text-white hover:text-gray-300 relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-netflix-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-80 bg-black/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-white font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-netflix-red hover:text-netflix-red/80 text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-gray-800 hover:bg-white/5 transition-colors ${
                      !notification.isRead ? 'bg-netflix-red/10' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <h4 className={`text-sm font-medium ${
                            notification.isRead ? 'text-gray-300' : 'text-white'
                          }`}>
                            {notification.title}
                          </h4>
                          
                          <div className="flex items-center space-x-1 ml-2">
                            {!notification.isRead && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => markAsRead(notification.id)}
                                className="h-6 w-6 text-gray-400 hover:text-white"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeNotification(notification.id)}
                              className="h-6 w-6 text-gray-400 hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <p className={`text-xs mt-1 ${
                          notification.isRead ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-gray-600 mt-1">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-700">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-gray-400 hover:text-white text-xs"
                >
                  View All Notifications
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
