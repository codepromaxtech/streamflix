'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { isValidEmail } from '@/lib/utils'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const { login } = useAuth()
  const { toast } = useToast()

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    
    try {
      const result = await login(email, password)
      
      if (result.success) {
        toast({
          title: 'Welcome back!',
          description: 'You have been successfully logged in.',
        })
      } else {
        toast({
          title: 'Login failed',
          description: result.error || 'Please check your credentials and try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Login failed',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-netflix-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="text-netflix-red text-4xl font-bold">
            StreamFlix
          </Link>
        </div>

        {/* Login Form */}
        <div className="bg-black/70 backdrop-blur-sm rounded-lg p-8 border border-gray-800">
          <h1 className="text-white text-2xl font-bold mb-6 text-center">
            Sign In
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`bg-gray-800 border-gray-600 text-white placeholder-gray-400 ${
                  errors.email ? 'border-red-500' : ''
                }`}
              />
              {errors.email && (
                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`bg-gray-800 border-gray-600 text-white placeholder-gray-400 pr-10 ${
                  errors.password ? 'border-red-500' : ''
                }`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              {errors.password && (
                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="netflix"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Forgot Password */}
          <div className="text-center mt-4">
            <Link
              href="/auth/forgot-password"
              className="text-gray-400 hover:text-white text-sm"
            >
              Forgot your password?
            </Link>
          </div>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="px-4 text-gray-400 text-sm">OR</span>
            <div className="flex-1 border-t border-gray-600"></div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-gray-400 text-sm">
              New to StreamFlix?{' '}
              <Link
                href="/auth/register"
                className="text-white hover:text-netflix-red font-semibold"
              >
                Sign up now
              </Link>
            </p>
          </div>

          {/* Demo Accounts */}
          <div className="mt-6 p-4 bg-gray-800/50 rounded border border-gray-700">
            <p className="text-gray-300 text-sm font-semibold mb-2">Demo Accounts:</p>
            <div className="space-y-1 text-xs text-gray-400">
              <p>Free User: demo@streamflix.com / password123</p>
              <p>Premium User: premium@streamflix.com / password123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>
            This page is protected by Google reCAPTCHA to ensure you're not a bot.{' '}
            <Link href="/privacy" className="text-blue-400 hover:underline">
              Learn more
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
