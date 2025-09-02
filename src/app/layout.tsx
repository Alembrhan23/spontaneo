import './globals.css'
import { Inter } from 'next/font/google'
import ClientProviders from '@/components/ClientProviders'
import ClientChrome from '@/components/ClientChrome'
import SmoothHashScroll from '@/components/SmoothHashScroll'
import AppNavGuard from '@/components/AppNavGuard'
import BrandBar from '@/components/BrandBar' // ⬅️ add

const inter = Inter({ subsets: ['latin'] })

export const metadata = { title: 'Spontaneo', description: 'Spontaneous plans in Denver' }
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
