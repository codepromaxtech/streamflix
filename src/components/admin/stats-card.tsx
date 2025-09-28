'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  change: number
  icon: LucideIcon
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red'
}

const colorClasses = {
  blue: 'text-blue-500 bg-blue-500/10',
  green: 'text-green-500 bg-green-500/10',
  yellow: 'text-yellow-500 bg-yellow-500/10',
  purple: 'text-purple-500 bg-purple-500/10',
  red: 'text-red-500 bg-red-500/10',
}

export function StatsCard({ title, value, change, icon: Icon, color }: StatsCardProps) {
  const isPositive = change > 0
  const isNegative = change < 0

  return (
    <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        
        <div className={`flex items-center text-sm ${
          isPositive ? 'text-green-500' : isNegative ? 'text-red-500' : 'text-gray-400'
        }`}>
          {isPositive && <TrendingUp className="h-4 w-4 mr-1" />}
          {isNegative && <TrendingDown className="h-4 w-4 mr-1" />}
          {Math.abs(change)}%
        </div>
      </div>
      
      <div>
        <h3 className="text-2xl font-bold text-white mb-1">{value}</h3>
        <p className="text-gray-400 text-sm">{title}</p>
      </div>
    </div>
  )
}
