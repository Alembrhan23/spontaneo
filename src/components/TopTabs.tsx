'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/discover',     label: 'Discover' },
  { href: '/happening',    label: 'Happening' },
  { href: '/plans',        label: 'My Plans' },
  { href: '/neighborhood', label: 'Neighborhood' },
] as const

export default function TopTabs() {
  const pathname = usePathname() || '/'
  const activeHref =
    pathname === '/' ? '/discover' : (TABS.find(t => pathname.startsWith(t.href))?.href ?? '/discover')

  return (
    <div className="bg-white sticky top-14 z-30 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex gap-8">
          {TABS.map(t => {
            const isActive = activeHref === t.href
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`py-3 text-sm md:text-base border-b-2 ${
                  isActive
                    ? 'text-indigo-600 border-indigo-600'
                    : 'text-gray-700 border-transparent hover:text-gray-900 hover:border-gray-200'
                }`}
              >
                {t.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
