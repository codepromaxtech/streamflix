'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { User, AuthContextType } from '@/types/auth'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function normalizeUser(userData: any): User | null {
  if (!userData) return null

  let subscription = userData.subscription
  if (!subscription && Array.isArray(userData.subscriptions) && userData.subscriptions.length > 0) {
    const activeSub =
      userData.subscriptions.find((s: any) => s.status === 'ACTIVE') ||
      userData.subscriptions[0]
    subscription = {
      id: activeSub.id || 'sub-1',
      type: (activeSub.planType?.toLowerCase() === 'premium' || userData.role === 'ADMIN'
        ? 'premium'
        : 'free') as 'free' | 'premium',
      status: (activeSub.status?.toLowerCase() || 'active') as any,
      currentPeriodStart: activeSub.currentPeriodStart || new Date().toISOString(),
      currentPeriodEnd: activeSub.currentPeriodEnd || new Date().toISOString(),
      cancelAtPeriodEnd: activeSub.cancelAtPeriodEnd || false,
      features: [],
    }
  } else if (!subscription) {
    subscription = {
      id: 'sub-default',
      type: userData.role === 'ADMIN' ? 'premium' : 'free',
      status: 'active',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date().toISOString(),
      cancelAtPeriodEnd: false,
      features: [],
    }
  }

  return {
    ...userData,
    name: userData.name || userData.email?.split('@')[0] || 'User',
    subscription,
    watchHistory: userData.watchHistory || [],
    favorites: userData.favorites || [],
    profiles: userData.profiles || [],
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const refreshToken = localStorage.getItem('refresh-token')

      // If no token stored, still attempt cookie-based authentication
      const response = await fetch('/api/auth/me', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      })

      if (response.ok) {
        const userData = await response.json()
        setUser(normalizeUser(userData))
      } else if (response.status === 401) {
        // Attempt silent refresh using refresh token or HTTP-only cookie
        try {
          const refreshRes = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              refreshToken: refreshToken || undefined,
            }),
          })

          if (refreshRes.ok) {
            const refreshData = await refreshRes.json()
            const newToken = refreshData.accessToken || refreshData.token
            if (newToken) {
              localStorage.setItem('auth-token', newToken)
            }
            if (refreshData.refreshToken) {
              localStorage.setItem('refresh-token', refreshData.refreshToken)
            }
            if (refreshData.user) {
              setUser(normalizeUser(refreshData.user))
              setLoading(false)
              return
            }
          }
        } catch (e) {
          console.warn('Silent refresh attempt failed:', e)
        }

        // If refresh also failed, clear invalid state
        localStorage.removeItem('auth-token')
        localStorage.removeItem('refresh-token')
        setUser(null)
      } else {
        localStorage.removeItem('auth-token')
        localStorage.removeItem('refresh-token')
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('auth-token')
      localStorage.removeItem('refresh-token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        const user = normalizeUser(data.user)
        const token = data.accessToken || data.token
        if (token) {
          localStorage.setItem('auth-token', token)
        }
        if (data.refreshToken) {
          localStorage.setItem('refresh-token', data.refreshToken)
        }
        setUser(user)
        router.push(user?.role === 'ADMIN' ? '/admin' : '/')
        return { success: true }
      } else {
        const error = await response.json().catch(() => ({ message: 'Login failed' }))
        return { success: false, error: error.message || 'Login failed' }
      }
    } catch (error) {
      return { success: false, error: 'Login failed' }
    }
  }

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      })

      if (response.ok) {
        const data = await response.json()
        const user = normalizeUser(data.user)
        const token = data.accessToken || data.token
        if (token) {
          localStorage.setItem('auth-token', token)
        }
        if (data.refreshToken) {
          localStorage.setItem('refresh-token', data.refreshToken)
        }
        setUser(user)
        router.push('/')
        return { success: true }
      } else {
        const error = await response.json().catch(() => ({ message: 'Registration failed' }))
        return { success: false, error: error.message || 'Registration failed' }
      }
    } catch (error) {
      return { success: false, error: 'Registration failed' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(() => null)
    } finally {
      localStorage.removeItem('auth-token')
      localStorage.removeItem('refresh-token')
      setUser(null)
      router.push('/auth/login')
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    checkAuth,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
