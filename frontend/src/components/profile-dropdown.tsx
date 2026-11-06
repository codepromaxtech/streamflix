'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User, Settings, CreditCard, LogOut, ChevronDown, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

export function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const { user, logout } = useAuth()

  if (!user) return null

  const isPremium = user?.subscription?.type === 'premium' || user?.role === 'ADMIN'

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
              alt={user.name || 'User'}
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
              <p className="text-white font-semibold">{user.name || 'User'}</p>
              <p className="text-gray-400 text-sm">{user.email}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                  isPremium
                    ? 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/40'
                    : 'bg-gray-700 text-gray-200'
                }`}>
                  {isPremium ? 'Premium' : 'Free'}
                </span>
                {user.role === 'ADMIN' && (
                  <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded bg-red-600/30 text-red-300 border border-red-500/40">
                    Admin
                  </span>
                )}
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="flex items-center px-4 py-2 text-netflix-red font-medium hover:bg-white/10 transition-colors"
                  onClick={() => setIsOpen(false)}
                >
                  <Shield className="h-4 w-4 mr-3" />
                  Admin Dashboard
                </Link>
              )}
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
