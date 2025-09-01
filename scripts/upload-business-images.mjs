// scripts/upload-business-images.mjs
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'   // <-- add this line
// at the very top of scripts/upload-business-images.mjs
import 'dotenv/config'
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}


if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

const BUCKET = 'business-images'          // your bucket name
const files = [
  { slug: 'spangalang',        local: './assets/spangalang.jpg',        storagePath: 'spangalang/cover.jpg' },
  { slug: 'cervantes',         local: './assets/cervantes.jpg',         storagePath: 'cervantes/cover.jpg' },
  { slug: 'marigold',          local: './assets/marigold.jpg',          storagePath: 'marigold/cover.jpg' },
  { slug: 'urban-sanctuary',   local: './assets/urban-sanctuary.jpg',   storagePath: 'urban-sanctuary/cover.jpg' },
]

function contentTypeFor(p) {
  const ext = path.extname(p).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.jpeg' || ext === '.jpg') return 'image/jpeg'
  return 'application/octet-stream'
}

for (const f of files) {
  if (!fs.existsSync(f.local)) {
    console.error(`Missing local file: ${f.local}`)
    process.exitCode = 1
    continue
  }

  const bytes = fs.readFileSync(f.local)
  const contentType = contentTypeFor(f.local)

  // 1) Upload to Storage (upsert)
  const up = await supabase.storage.from(BUCKET).upload(f.storagePath, bytes, {
    contentType,
    upsert: true,
  })
  if (up.error) {
    console.error('Upload error:', f.slug, up.error.message)
    process.exitCode = 1
    continue
  }

  // 2) Optional: get a public URL (only works if bucket is public)
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(f.storagePath)
  const publicUrl = pub?.publicUrl ?? null

  // 3) Update DB row
  const upd = await supabase
    .from('businesses')
    .update({ image_path: f.storagePath, image_url: publicUrl })
    .eq('slug', f.slug)

  if (upd.error) {
    console.error('DB update error:', f.slug, upd.error.message)
    process.exitCode = 1
  } else {
    console.log(`✔ ${f.slug} -> ${f.storagePath}${publicUrl ? ' (public URL set)' : ''}`)
  }
}
