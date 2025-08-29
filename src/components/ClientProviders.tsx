'use client'

import { AuthProvider } from '@/lib/auth'

export default function ClientProviders({ children }: { children: React.ReactNode }) {
  // Add more client providers here if you need (e.g., ThemeProvider)
  return <AuthProvider>{children}</AuthProvider>
}
