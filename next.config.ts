// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Either use domains:
    // domains: ['api.dicebear.com', 'i.pravatar.cc', 'lh3.googleusercontent.com', '<YOUR-PROJECT-REF>.supabase.co'],

    // or remotePatterns (handles any supabase subdomain):
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // (optional OAuth avatars)
      { protocol: 'https', hostname: '**.supabase.co' },            // Supabase Storage public URLs
    ],
  },
}

export default nextConfig
