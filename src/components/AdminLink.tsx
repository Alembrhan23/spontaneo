'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'  // <-- use @supabase/ssr browser client

export default function AdminLink() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setShow(false); return }
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      setShow(!!data?.is_admin)
    })()
  }, [])

  if (!show) return null
  return <Link href="/admin" className="px-3 py-1 text-sm hover:underline">Admin</Link>
}
