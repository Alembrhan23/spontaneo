// scripts/repair-two-covers.mjs
import fs from 'node:fs'
import path from 'node:path'
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const BUCKET = 'business-images'

// ← adjust these local filenames if yours differ
const files = [
  {
    nameMatch: /spangalang/i,
    local: './assets/spangalang-brewery-cover-fit.jpg',
    storagePath: 'spangalang/cover.jpg',
  },
  {
    nameMatch: /cervantes/i,
    local: './assets/cervantes-masterpiece-ballroom-cover-fit.jpg',
    storagePath: 'cervantes/cover.jpg',
  },
]

function contentTypeFor(p) {
  const ext = path.extname(p).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.svg') return 'image/svg+xml'
  return 'image/jpeg'
}

for (const f of files) {
  if (!fs.existsSync(f.local)) {
    console.error('Missing local file:', f.local)
    continue
  }
  const bytes = fs.readFileSync(f.local)
  const up = await supabase.storage.from(BUCKET).upload(f.storagePath, bytes, {
    contentType: contentTypeFor(f.local),
    upsert: true, // recreate if missing
  })
  if (up.error) { console.error('Upload error:', f.storagePath, up.error.message); continue }

  // Update DB row by name (adjust if you prefer by slug/id)
  const { data: biz } = await supabase
    .from('businesses')
    .select('id,name')
    .ilike('name', `%${f.nameMatch.source.replace(/\\|\/|i/g, '')}%`)
    .limit(1)

  const id = biz?.[0]?.id
  if (!id) { console.warn('Could not find business row for', f.storagePath); continue }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(f.storagePath)
  await supabase.from('businesses').update({
    image_path: f.storagePath,
    image_url: pub?.publicUrl ?? null
  }).eq('id', id)

  console.log('✔ repaired', f.storagePath)
}
