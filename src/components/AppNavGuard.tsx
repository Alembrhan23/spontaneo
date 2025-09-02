// components/AppNavGuard.tsx
'use client'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

// Add '/pricing' here 👇
const HIDE_ON = ['/contact', '/legal/terms', '/legal/privacy', '/pricing']

export default function AppNavGuard({
  children,
  fallback
}: {
  children: ReactNode
  fallback?: ReactNode
}) {
  const pathname = usePathname()
  const hide = HIDE_ON.some((p) => pathname.startsWith(p))
  return hide ? <>{fallback ?? null}</> : <>{children}</>
}
