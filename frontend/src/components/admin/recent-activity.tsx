'use client'

import { Video, User, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface Activity {
  id: string
  type: 'content' | 'user' | 'payment' | 'system'
  title: string
  description: string
  timestamp: string
  status: 'success' | 'warning' | 'pending' | 'error'
}

interface RecentActivityProps {
  activities: Activity[]
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'content':
      return Video
    case 'user':
      return User
    case 'payment':
      return DollarSign
    default:
      return AlertTriangle
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return CheckCircle
    case 'warning':
      return AlertTriangle
    case 'pending':
      return Clock
    default:
      return AlertTriangle
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'text-green-500'
    case 'warning':
      return 'text-yellow-500'
    case 'pending':
      return 'text-blue-500'
    case 'error':
      return 'text-red-500'
    default:
      return 'text-gray-500'
  }
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
      
      <div className="space-y-4">
        {activities.map((activity) => {
          const ActivityIcon = getActivityIcon(activity.type)
          const StatusIcon = getStatusIcon(activity.status)
          const statusColor = getStatusColor(activity.status)

          return (
            <div key={activity.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="p-2 bg-gray-700 rounded-lg">
                  <ActivityIcon className="h-4 w-4 text-gray-300" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium text-sm">{activity.title}</h4>
                  <div className="flex items-center space-x-2">
                    <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                    <span className="text-xs text-gray-400">{activity.timestamp}</span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-1">{activity.description}</p>
              </div>
            </div>
          )
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-700">
        <button className="text-netflix-red hover:text-netflix-red/80 text-sm font-medium">
          View all activity
        </button>
      </div>
    </div>
  )
}
