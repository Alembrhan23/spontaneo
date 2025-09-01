'use client'

import { useEffect } from 'react'

export default function SmoothHashScroll() {
  useEffect(() => {
    const header = () => document.querySelector('header') as HTMLElement | null
    const headerOffset = () => (header()?.getBoundingClientRect().height ?? 80) + 16 // header + breathing room

    const scrollToHash = (hash: string, smooth = true) => {
      const id = decodeURIComponent(hash.replace('#', ''))
      const el = document.getElementById(id)
      if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY - headerOffset()
      window.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
    }

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null
      if (!a || !a.hash || a.hash === '#') return
      if (!document.getElementById(a.hash.slice(1))) return
      e.preventDefault()
      scrollToHash(a.hash, true)
      history.pushState(null, '', a.hash)
    }

    document.addEventListener('click', onClick)

    // Correct initial position when landing at /#section
    if (location.hash) requestAnimationFrame(() => scrollToHash(location.hash, false))

    return () => document.removeEventListener('click', onClick)
  }, [])

  return null
}
