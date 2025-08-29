'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export default function BusinessImageUploader({
  businessId,
  currentUrl,
  onChange
}: { businessId: string; currentUrl?: string | null; onChange?: (url: string) => void }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>('')

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErr(''); setBusy(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const key = `${businessId}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('business-images').upload(key, file, {
        cacheControl: '3600',
        upsert: true,
      })
      if (upErr) throw upErr
      const { data } = supabase.storage.from('business-images').getPublicUrl(key)
      const url = data.publicUrl
      // save to DB
      const { error: dbErr } = await supabase.from('businesses').update({ image_url: url }).eq('id', businessId)
      if (dbErr) throw dbErr
      onChange?.(url)
    } catch (e: any) {
      setErr(e.message || 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-lg overflow-hidden border bg-gray-50">
          {currentUrl
            ? <img src={currentUrl} alt="" className="h-full w-full object-cover" />
            : <div className="grid h-full w-full place-items-center text-gray-400 text-sm">No image</div>}
        </div>
        <label className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50">
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
          {busy ? 'Uploading…' : 'Upload image'}
        </label>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}
