'use client'

import { useState } from 'react'
import { Edit, Ban, Mail, MoreHorizontal, Crown, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN' | 'MODERATOR'
  subscription: 'free' | 'premium'
  status: 'active' | 'inactive' | 'banned'
  joinedAt: string
  lastActive: string
  totalWatchTime: number
}

interface UserTableProps {
  searchQuery: string
}

// Mock data - in production this would come from your API
const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'USER',
    subscription: 'premium',
    status: 'active',
    joinedAt: '2024-01-15',
    lastActive: '2024-01-20',
    totalWatchTime: 1250,
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'USER',
    subscription: 'free',
    status: 'active',
    joinedAt: '2024-01-10',
    lastActive: '2024-01-19',
    totalWatchTime: 680,
  },
  {
    id: '3',
    name: 'Mike Johnson',
    email: 'mike.johnson@example.com',
    role: 'MODERATOR',
    subscription: 'premium',
    status: 'active',
    joinedAt: '2023-12-05',
    lastActive: '2024-01-20',
    totalWatchTime: 2100,
  },
  {
    id: '4',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@example.com',
    role: 'USER',
    subscription: 'free',
    status: 'inactive',
    joinedAt: '2024-01-08',
    lastActive: '2024-01-12',
    totalWatchTime: 320,
  },
]

const getStatusBadge = (status: string) => {
  const styles = {
    active: 'bg-green-600 text-green-100',
    inactive: 'bg-gray-600 text-gray-100',
    banned: 'bg-red-600 text-red-100',
  }

  return (
    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return <Shield className="h-4 w-4 text-red-500" />
    case 'MODERATOR':
      return <Shield className="h-4 w-4 text-blue-500" />
    default:
      return null
  }
}

const formatWatchTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

export function UserTable({ searchQuery }: UserTableProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  const filteredUsers = mockUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    setSelectedUsers(
      selectedUsers.length === filteredUsers.length
        ? []
        : filteredUsers.map(user => user.id)
    )
  }

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
              onChange={handleSelectAll}
              className="h-4 w-4 text-netflix-red bg-gray-700 border-gray-600 rounded focus:ring-netflix-red"
            />
            <span className="text-sm text-gray-400">
              {selectedUsers.length > 0 ? `${selectedUsers.length} selected` : `${filteredUsers.length} users`}
            </span>
          </div>
          
          {selectedUsers.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
              <Button variant="destructive" size="sm">
                <Ban className="h-4 w-4 mr-2" />
                Ban Users
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Subscription
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Watch Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Last Active
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-800/30">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="h-4 w-4 text-netflix-red bg-gray-700 border-gray-600 rounded focus:ring-netflix-red mr-4"
                    />
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-netflix-red flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">{user.name}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getRoleIcon(user.role)}
                    <span className="ml-2 text-gray-300">{user.role}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.subscription === 'premium' && (
                      <Crown className="h-4 w-4 text-yellow-500 mr-2" />
                    )}
                    <span className={`capitalize ${
                      user.subscription === 'premium' ? 'text-yellow-400' : 'text-gray-300'
                    }`}>
                      {user.subscription}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(user.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                  {formatWatchTime(user.totalWatchTime)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                  {new Date(user.joinedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-300">
                  {new Date(user.lastActive).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <Button variant="ghost" size="sm">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300">
                      <Ban className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing 1 to {filteredUsers.length} of {filteredUsers.length} results
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
