export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  role: 'USER' | 'ADMIN' | 'MODERATOR'
  subscription: SubscriptionPlan
  watchHistory: WatchHistoryItem[]
  favorites: string[]
  profiles: UserProfile[]
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  name: string
  avatar?: string
  isKidsProfile: boolean
  language: string
  maturityRating: string
}

export interface SubscriptionPlan {
  id: string
  type: 'free' | 'premium'
  status: 'active' | 'inactive' | 'cancelled' | 'past_due'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  features: SubscriptionFeature[]
}

export interface SubscriptionFeature {
  name: string
  enabled: boolean
  limit?: number
}

export interface WatchHistoryItem {
  contentId: string
  watchedAt: string
  progress: number
  completed: boolean
}

export interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  checkAuth: () => Promise<void>
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name: string
  confirmPassword: string
}
