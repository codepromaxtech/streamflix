'use client'

import { useState, useEffect } from 'react'

// Secure token management using httpOnly cookies
class SecureAuthManager {
  private static instance: SecureAuthManager
  private refreshTimer: NodeJS.Timeout | null = null

  static getInstance(): SecureAuthManager {
    if (!SecureAuthManager.instance) {
      SecureAuthManager.instance = new SecureAuthManager()
    }
    return SecureAuthManager.instance
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        const data = await response.json()
        this.startTokenRefresh()
        return { success: true }
      } else {
        const error = await response.json()
        return { success: false, error: error.message }
      }
    } catch (error) {
      return { success: false, error: 'Login failed' }
    }
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      this.stopTokenRefresh()
    }
  }

  async getCurrentUser() {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.ok) {
        return await response.json()
      }
      return null
    } catch (error) {
      console.error('Get user error:', error)
      return null
    }
  }

  private async refreshToken(): Promise<boolean> {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      return response.ok
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }

  private startTokenRefresh(): void {
    // Refresh token every 14 minutes (access token expires in 15 minutes)
    this.refreshTimer = setInterval(async () => {
      const success = await this.refreshToken()
      if (!success) {
        this.stopTokenRefresh()
        // Redirect to login or show session expired message
        window.location.href = '/auth/login'
      }
    }, 14 * 60 * 1000)
  }

  private stopTokenRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }
}

export const secureAuth = SecureAuthManager.getInstance()
