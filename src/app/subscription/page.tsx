'use client'

import { useState } from 'react'
import { Check, Crown, Zap, Shield, Download, Tv, Users, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useToast } from '@/hooks/use-toast'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    period: 'month',
    description: 'Perfect for casual viewers',
    features: [
      'Limited content library',
      'Watch with ads',
      'SD quality (480p)',
      '1 device at a time',
      'Mobile and tablet access',
    ],
    limitations: [
      'Ads during playback',
      'Limited offline downloads',
      'No premium content',
    ],
    icon: Tv,
    color: 'gray',
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 12.99,
    currency: 'USD',
    period: 'month',
    description: 'The complete streaming experience',
    features: [
      'Full content library',
      'No ads, ever',
      'Ultra HD (4K) + HDR',
      '4 devices simultaneously',
      'All devices supported',
      'Unlimited downloads',
      'Premium exclusive content',
      'Early access to new releases',
    ],
    icon: Crown,
    color: 'netflix-red',
    popular: true,
  },
]

const paymentMethods = [
  {
    id: 'stripe',
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, American Express',
    icon: '💳',
    available: true,
  },
  {
    id: 'sslcommerz',
    name: 'SSLCommerz',
    description: 'bKash, Nagad, Rocket, Bank Transfer',
    icon: '🏦',
    available: true,
    region: 'Bangladesh',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Pay with your PayPal account',
    icon: '🅿️',
    available: true,
  },
]

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState('premium')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('stripe')
  const [isProcessing, setIsProcessing] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const handleSubscribe = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to subscribe to a plan.',
        variant: 'destructive',
      })
      return
    }

    const plan = plans.find(p => p.id === selectedPlan)
    if (!plan || plan.price === 0) {
      toast({
        title: 'Invalid Plan',
        description: 'Please select a valid subscription plan.',
        variant: 'destructive',
      })
      return
    }

    setIsProcessing(true)

    try {
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
        },
        body: JSON.stringify({
          amount: plan.price,
          currency: plan.currency,
          paymentMethod: selectedPaymentMethod,
          subscriptionType: 'PREMIUM',
          returnUrl: `${window.location.origin}/subscription/success`,
          cancelUrl: `${window.location.origin}/subscription/cancel`,
        }),
      })

      const result = await response.json()

      if (result.success) {
        if (result.paymentUrl) {
          // Redirect to payment gateway (SSLCommerz, PayPal)
          window.location.href = result.paymentUrl
        } else if (result.clientSecret) {
          // Handle Stripe payment (would need Stripe Elements integration)
          toast({
            title: 'Payment Processing',
            description: 'Redirecting to secure payment...',
          })
          // Implement Stripe payment flow here
        }
      } else {
        toast({
          title: 'Payment Failed',
          description: result.error || 'Unable to process payment. Please try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Payment Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-netflix-black">
      <Header />
      
      <main className="pt-20 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Enjoy unlimited access to thousands of movies and TV shows. 
              Cancel anytime.
            </p>
          </div>

          {/* Current Subscription Status */}
          {user && (
            <div className="bg-gray-800/50 rounded-lg p-6 mb-8 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold mb-1">Current Plan</h3>
                  <p className="text-gray-300">
                    {user.subscription.type === 'premium' ? (
                      <span className="flex items-center">
                        <Crown className="h-4 w-4 text-yellow-500 mr-2" />
                        Premium Plan
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <Tv className="h-4 w-4 text-gray-400 mr-2" />
                        Free Plan
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                    user.subscription.status === 'active'
                      ? 'bg-green-600 text-green-100'
                      : 'bg-gray-600 text-gray-100'
                  }`}>
                    {user.subscription.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Plans */}
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {plans.map((plan) => {
              const Icon = plan.icon
              const isSelected = selectedPlan === plan.id
              const isCurrent = user?.subscription.type === plan.id

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-lg border-2 p-8 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-netflix-red bg-netflix-red/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  } ${plan.popular ? 'ring-2 ring-netflix-red ring-opacity-50' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="bg-netflix-red text-white px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        Current Plan
                      </span>
                    </div>
                  )}

                  <div className="flex items-center mb-4">
                    <Icon className={`h-8 w-8 mr-3 ${
                      plan.color === 'netflix-red' ? 'text-netflix-red' : 'text-gray-400'
                    }`} />
                    <div>
                      <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                      <p className="text-gray-400">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline">
                      <span className="text-4xl font-bold text-white">
                        ${plan.price}
                      </span>
                      <span className="text-gray-400 ml-2">/{plan.period}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {plan.limitations && (
                    <div className="space-y-2 pt-4 border-t border-gray-700">
                      <p className="text-sm font-semibold text-gray-400 mb-2">Limitations:</p>
                      {plan.limitations.map((limitation, index) => (
                        <div key={index} className="flex items-center">
                          <span className="text-red-400 mr-3">×</span>
                          <span className="text-gray-400 text-sm">{limitation}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Payment Methods */}
          {selectedPlan !== 'free' && (
            <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700 mb-8">
              <h3 className="text-xl font-bold text-white mb-6">Payment Method</h3>
              
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedPaymentMethod === method.id
                        ? 'border-netflix-red bg-netflix-red/10'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                    } ${!method.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => method.available && setSelectedPaymentMethod(method.id)}
                  >
                    <div className="flex items-center mb-2">
                      <span className="text-2xl mr-3">{method.icon}</span>
                      <div>
                        <h4 className="text-white font-semibold">{method.name}</h4>
                        {method.region && (
                          <span className="text-xs bg-blue-600 text-blue-100 px-2 py-1 rounded">
                            {method.region}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm">{method.description}</p>
                  </div>
                ))}
              </div>

              <Button
                onClick={handleSubscribe}
                disabled={isProcessing || selectedPlan === 'free'}
                className="w-full bg-netflix-red hover:bg-netflix-red/90 text-white font-semibold py-3"
              >
                {isProcessing ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  `Subscribe to ${plans.find(p => p.id === selectedPlan)?.name} - $${plans.find(p => p.id === selectedPlan)?.price}/month`
                )}
              </Button>
            </div>
          )}

          {/* Features Comparison */}
          <div className="bg-gray-800/30 rounded-lg p-8 border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-6 text-center">
              Why Choose Premium?
            </h3>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <Shield className="h-12 w-12 text-netflix-red mx-auto mb-4" />
                <h4 className="text-white font-semibold mb-2">Ad-Free Experience</h4>
                <p className="text-gray-400 text-sm">
                  Enjoy uninterrupted streaming without any advertisements
                </p>
              </div>
              
              <div className="text-center">
                <Download className="h-12 w-12 text-netflix-red mx-auto mb-4" />
                <h4 className="text-white font-semibold mb-2">Offline Downloads</h4>
                <p className="text-gray-400 text-sm">
                  Download content to watch anywhere, even without internet
                </p>
              </div>
              
              <div className="text-center">
                <Star className="h-12 w-12 text-netflix-red mx-auto mb-4" />
                <h4 className="text-white font-semibold mb-2">Premium Content</h4>
                <p className="text-gray-400 text-sm">
                  Access exclusive shows and movies not available on free plan
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
