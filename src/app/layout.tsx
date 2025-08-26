import './globals.css'
import Navbar from '@/components/NavBar'
import TopTabs from '@/components/TopTabs'
import { Inter } from 'next/font/google'
const inter = Inter({ subsets: ['latin'] })

export const metadata = { title: 'Spontaneo', description: 'Spontaneous plans in Denver' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50`}>
        <Navbar />
        <TopTabs />
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {children}
        </main>
      </body>
    </html>
  )
}
