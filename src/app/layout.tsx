import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'StreamFlix - Premium Streaming Platform',
  description: 'Watch unlimited movies, TV shows, and exclusive content. Stream anywhere, anytime.',
  keywords: 'streaming, movies, tv shows, entertainment, netflix, video on demand',
  authors: [{ name: 'StreamFlix Team' }],
  openGraph: {
    title: 'StreamFlix - Premium Streaming Platform',
    description: 'Watch unlimited movies, TV shows, and exclusive content',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StreamFlix - Premium Streaming Platform',
    description: 'Watch unlimited movies, TV shows, and exclusive content',
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  robots: 'index, follow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-netflix-black text-white antialiased`}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
