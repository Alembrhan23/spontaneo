'use client'

import dynamic from 'next/dynamic'

const NavBar  = dynamic(() => import('@/components/NavBar'),  { ssr: false })
const TopTabs = dynamic(() => import('@/components/TopTabs'), { ssr: false })

export default function ClientChrome() {
  return (
    <>
      <NavBar />
      <TopTabs />
    </>
  )
}
