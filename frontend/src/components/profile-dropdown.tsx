'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, Settings, CreditCard, LogOut, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()

  if (!user) return null

  return (
    <div className="relative">
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 text-white hover:text-gray-300"
      >
        <div className="w-8 h-8 bg-netflix-red rounded flex items-center justify-center">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full rounded object-cover"
            />
          ) : (
            <User className="h-4 w-4" />
          )}
        </div>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-black/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-xl z-50">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-700">
              <p className="text-white font-semibold">{user.name}</p>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <div className="mt-1">
                <span className={`inline-block px-2 py-1 text-xs rounded ${
                  user.subscription.type === 'premium'
                    ? 'bg-yellow-600 text-yellow-100'
                    : 'bg-gray-600 text-gray-100'
                }`}>
                  {user.subscription.type === 'premium' ? 'Premium' : 'Free'}
                </span>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <Link
                href="/profile"
                className="flex items-center px-4 py-2 text-white hover:bg-white/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <User className="h-4 w-4 mr-3" />
                Manage Profiles
              </Link>
              
              <Link
                href="/account"
                className="flex items-center px-4 py-2 text-white hover:bg-white/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <Settings className="h-4 w-4 mr-3" />
                Account Settings
              </Link>
              
              <Link
                href="/subscription"
                className="flex items-center px-4 py-2 text-white hover:bg-white/10 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <CreditCard className="h-4 w-4 mr-3" />
                Subscription
              </Link>
            </div>

            {/* Logout */}
            <div className="border-t border-gray-700 py-2">
              <button
                onClick={() => {
                  logout()
                  setIsOpen(false)
                }}
                className="flex items-center w-full px-4 py-2 text-white hover:bg-white/10 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
