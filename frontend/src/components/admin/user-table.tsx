'use client'

import { useState, useEffect } from 'react'
import { Edit, Ban, Mail, MoreHorizontal, Crown, Shield, User as UserIcon, RefreshCw, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SubscriptionInfo {
  id: string
  planType: string
  status: string
}

interface UserItem {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN' | 'MODERATOR'
  isActive: boolean
  createdAt: string
  subscriptions?: SubscriptionInfo[]
}

interface UserTableProps {
  searchQuery: string
  onUsersUpdated?: () => void
}

export function UserTable({ searchQuery, onUsersUpdated }: UserTableProps) {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const getAuthHeader = (): Record<string, string> => {
    if (typeof window === 'undefined') return {}
    const token = localStorage.getItem('auth-token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/admin/users?limit=50&search=${encodeURIComponent(searchQuery || '')}`,
        {
          headers: getAuthHeader(),
          credentials: 'include',
        }
      )
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers()
    }, 250)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleToggleStatus = async (id: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        credentials: 'include',
      })
      if (res.ok) {
        const updated = await res.json()
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, isActive: updated.isActive } : u))
        )
        onUsersUpdated?.()
      }
    } catch (err) {
      console.error('Failed to toggle user status:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleToggleRole = async (user: UserItem) => {
    const newRole = user.role === 'ADMIN' ? 'USER' : 'ADMIN'
    if (!confirm(`Change role for ${user.email} to ${newRole}?`)) return
    setUpdatingId(user.id)
    try {
      const res = await fetch(`/api/admin/users/${user.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
        )
        onUsersUpdated?.()
      }
    } catch (err) {
      console.error('Failed to change user role:', err)
    } finally {
      setUpdatingId(null)
    }
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === users.length ? [] : users.map((u) => u.id)
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700/80 overflow-hidden shadow-xl">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-700/80 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={selectedUsers.length === users.length && users.length > 0}
            onChange={handleSelectAll}
            className="h-4 w-4 text-netflix-red bg-gray-700 border-gray-600 rounded focus:ring-netflix-red"
          />
          <span className="text-sm text-gray-400">
            {selectedUsers.length > 0
              ? `${selectedUsers.length} selected`
              : `${users.length} registered users in database`}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-900/60 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700/60">
            <tr>
              <th className="px-6 py-3.5">User</th>
              <th className="px-6 py-3.5">Role</th>
              <th className="px-6 py-3.5">Subscription Plan</th>
              <th className="px-6 py-3.5">Account Status</th>
              <th className="px-6 py-3.5">Joined Date</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-netflix-red" />
                    <span>Loading real users from database...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-400">
                  No users found matching &quot;{searchQuery}&quot;.
                </td>
              </tr>
            ) : (
              users.map((user) => {
                const planType = user.subscriptions?.[0]?.planType || 'FREE'
                const isPremium = planType === 'PREMIUM'
                const initials = (user.name || user.email || 'U').charAt(0).toUpperCase()

                return (
                  <tr key={user.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => handleSelectUser(user.id)}
                          className="h-4 w-4 text-netflix-red bg-gray-700 border-gray-600 rounded focus:ring-netflix-red mr-4"
                        />
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-netflix-red/20 border border-netflix-red/30 flex items-center justify-center text-netflix-red font-bold text-sm">
                            {initials}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-semibold text-white">
                              {user.name || 'Unnamed User'}
                            </div>
                            <div className="text-xs text-gray-400">{user.email}</div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleRole(user)}
                        title="Click to toggle role"
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white transition-colors"
                      >
                        {user.role === 'ADMIN' ? (
                          <>
                            <Shield className="h-3.5 w-3.5 text-netflix-red" />
                            <span className="text-netflix-red">ADMIN</span>
                          </>
                        ) : (
                          <>
                            <UserIcon className="h-3.5 w-3.5 text-gray-400" />
                            <span>USER</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                          isPremium
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-gray-700 text-gray-300 border border-gray-600'
                        }`}
                      >
                        {isPremium && <Crown className="h-3 w-3" />}
                        {planType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        disabled={updatingId === user.id}
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full cursor-pointer transition-colors ${
                          user.isActive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Suspended'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400">
                      {user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(user.id)}
                          className="text-xs text-gray-400 hover:text-white"
                        >
                          {user.isActive ? (
                            <span className="text-red-400 hover:underline">Suspend</span>
                          ) : (
                            <span className="text-emerald-400 hover:underline">Activate</span>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-700/80 flex items-center justify-between text-xs text-gray-400">
        <div>Total database users: {users.length}</div>
        <div>StreamFlix Real User Directory</div>
      </div>
    </div>
  )
}
