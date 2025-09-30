'use client'

import { ApolloProvider } from '@apollo/client'
import { apolloClient } from '@/lib/apollo-client'
import { AuthProvider } from '@/contexts/auth-context'
import { VideoPlayerProvider } from '@/contexts/video-player-context'
import { ThemeProvider } from 'next-themes'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <ApolloProvider client={apolloClient}>
        <AuthProvider>
          <VideoPlayerProvider>
            {children}
          </VideoPlayerProvider>
        </AuthProvider>
      </ApolloProvider>
    </ThemeProvider>
  )
}
