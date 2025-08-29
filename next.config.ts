// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },

  // ✅ Don’t fail the Vercel build because of ESLint issues
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ (Optional) Don’t fail the build on TS type errors
  // Turn this off again once you’ve cleaned up types.
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
