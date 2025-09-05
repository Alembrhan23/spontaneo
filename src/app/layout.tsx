import './globals.css'
import { Inter } from 'next/font/google'
import ClientProviders from '@/components/ClientProviders'
import ClientChrome from '@/components/ClientChrome'
import SmoothHashScroll from '@/components/SmoothHashScroll'
import AppNavGuard from '@/components/AppNavGuard'
import BrandBar from '@/components/BrandBar' // ⬅️ add


import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nowio.app'),

  applicationName: 'Nowio',
  title: {
    default: 'Nowio',
    template: '%s • Nowio',
  },

  // 🔄 New brand description (no First Friday)
  description:
    'Nowio is a social platform for micro-plans — create or join quick activities, meet new people nearby, and unlock local perks.',

  keywords: [
    'Nowio',
    'micro plans',
    'meet people',
    'things to do',
    'events',
    'perks',
    'hangouts',
    'activities',
  ],

  openGraph: {
    siteName: 'Nowio',
    title: 'Nowio',
    description:
      'Create or join micro-plans, meet new people, and unlock local perks.',
    url: 'https://nowio.app',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Nowio' }],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Nowio',
    description:
      'Create or join micro-plans, meet new people, and unlock local perks.',
    images: ['/og.png'],
  },

  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/apple-touch-icon.png' }],
  },

  manifest: '/site.webmanifest',
}



const inter = Inter({ subsets: ['latin'] })

// export const metadata = { title: 'Nowio', description: 'Spontaneous plans in Denver' }
// (Optional) switch to Nowio:
// export const metadata = { title: 'Nowio', description: 'Have fun now, with real people.' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <ClientProviders>
          {/* Show full chrome on app pages, else show brand-only header */}
          <AppNavGuard fallback={<BrandBar />}>
            <ClientChrome />
          </AppNavGuard>

          <SmoothHashScroll />

          <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {children}
          </main>
        </ClientProviders>
      </body>
    </html>
  )
}
