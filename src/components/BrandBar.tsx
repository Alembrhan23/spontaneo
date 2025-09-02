import Link from 'next/link'

export default function BrandBar() {
  return (
    <header className="bg-white/90 backdrop-blur border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          Nowio
        </Link>
        {/* (Optional) quick link back to app home */}
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
          Home
        </Link>
      </div>
    </header>
  )
}
