// scripts/upload-all-business-covers.mjs
import fs from 'node:fs'
import path from 'node:path'
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

/* ------------ config via CLI flags ------------ */
// Examples:
// node scripts/upload-all-business-covers.mjs --dir=./assets/covers --public --force
const ARG = (name, def = null) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`))
  return hit ? hit.split('=')[1] : (process.argv.includes(`--${name}`) ? true : def)
}
const DIR    = ARG('dir', './assets')         // folder with all images
const IS_PUBLIC = !!ARG('public', false)               // set if your bucket is public
const FORCE  = !!ARG('force', false)                   // overwrite image_path even if it exists
const DRY    = !!ARG('dry-run', false)                 // preview only

/* ------------ env + supabase ------------ */
const SUPABASE_URL   = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE   = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)
const BUCKET = 'business-images'

/* ------------ helpers ------------ */
const validExt = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg'])
const contentTypeFor = (p) => {
  const ext = path.extname(p).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.jpeg' || ext === '.jpg') return 'image/jpeg'
  return 'application/octet-stream'
}
const slugify = (s) => String(s ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '')
  .slice(0, 60)

// Try to reduce filename to a clean slug-ish key
const filenameKey = (base) => {
  let b = base.toLowerCase()
  b = b.replace(/\.(jpg|jpeg|png|webp|svg)$/i, '')
  b = b.replace(/-cover(-fit|-v\d+)?$/i, '') // remove "-cover", "-cover-fit", "-cover-v2"…
  return slugify(b)
}

/* 
 * Optional manual overrides for tricky matches.
 * Left side: filename (or part of it). Right side: EXACT business name in DB (preferred) OR slug.
 * Add/adjust as needed.
 */
const OVERRIDES = {
  // filenameKey : expected DB name (or slug)
  'cervantes-masterpiece-ballroom': "Cervantes' Masterpiece Ballroom",
  'the-ramble-hotel-death-co': 'The Ramble Hotel / Death & Co',
  'the-marigold-mary-gold': 'The Marigold (Mary Gold)',
  'ratio-beerworks-larimer': 'Ratio Beerworks (Larimer)',
  'avanti-food-beverage-lohi': 'Avanti Food & Beverage (LoHi)',
  'little-man-ice-cream-lohi': 'Little Man Ice Cream (LoHi)',
}

/* ------------ main ------------ */
async function main() {
  // 1) Read files
  if (!fs.existsSync(DIR)) {
    console.error(`Directory not found: ${DIR}`)
    process.exit(1)
  }
  const files = fs.readdirSync(DIR)
    .filter(f => validExt.has(path.extname(f).toLowerCase()))
    .map(f => ({ file: f, full: path.join(DIR, f), key: filenameKey(f) }))

  if (!files.length) {
    console.log(`No images found in ${DIR}`)
    return
  }

  // 2) Fetch all businesses once
  const { data: bizRows, error } = await supabase
    .from('businesses')
    .select('id,name,slug,image_path')
  if (error) {
    console.error('DB read error:', error.message); process.exit(1)
  }

  // Precompute maps for quick matching
  const bySlug = new Map()
  const bySlugifiedName = new Map()
  for (const b of bizRows) {
    const s = (b.slug || '').toLowerCase()
    if (s) bySlug.set(s, b)
    const sname = slugify(b.name || '')
    if (sname) bySlugifiedName.set(sname, b)
  }

  let uploaded = 0, skipped = 0, failed = 0

  for (const f of files) {
    const overrideTarget = OVERRIDES[f.key]
    let target = null

    // 3) Resolve business match: override → slug → slugified name → includes search
    if (overrideTarget) {
      // Try name first, then slug
      target = bizRows.find(b => (b.name || '').toLowerCase() === overrideTarget.toLowerCase())
           || bizRows.find(b => (b.slug || '').toLowerCase() === overrideTarget.toLowerCase())
    }
    if (!target) target = bySlug.get(f.key)
    if (!target) target = bySlugifiedName.get(f.key)

    if (!target) {
      // fuzzy: find any business whose slugified name includes the file key (or vice-versa)
      target = bizRows.find(b => {
        const sname = slugify(b.name || '')
        const sslug = (b.slug || '').toLowerCase()
        return sname.includes(f.key) || f.key.includes(sname) || (sslug && (sslug.includes(f.key) || f.key.includes(sslug)))
      })
    }

    if (!target) {
      console.warn(`❔ No match for "${f.file}" (key="${f.key}") — add to OVERRIDES or rename file`)
      skipped++
      continue
    }

    const ext = path.extname(f.file).toLowerCase()
    const folder = target.slug ? slugify(target.slug) : target.id
    const storagePath = `${folder}/cover${ext}`

    if (!FORCE && target.image_path && target.image_path.trim() !== '') {
      console.log(`↷ Skip (already has image_path): ${target.name} -> ${target.image_path}`)
      skipped++
      continue
    }

    if (DRY) {
      console.log(`[dry] Would upload ${f.file} -> ${storagePath} and set image_path`)
      continue
    }

    // 4) Upload sequentially
    const bytes = fs.readFileSync(f.full)
    const up = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: contentTypeFor(f.full),
      upsert: true, // safe if you re-run
    })
    if (up.error) {
      console.error(`✗ Upload error for "${target.name}":`, up.error.message)
      failed++
      continue
    }

    // 5) Optional public URL
    let publicUrl = null
    if (IS_PUBLIC) {
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
      publicUrl = pub?.publicUrl ?? null
    }

    // 6) Update DB
    const upd = await supabase
      .from('businesses')
      .update({ image_path: storagePath, image_url: publicUrl })
      .eq('id', target.id)

    if (upd.error) {
      console.error(`✗ DB update error for "${target.name}":`, upd.error.message)
      failed++
    } else {
      console.log(`✔ ${target.name} -> ${storagePath}${publicUrl ? ' (public)' : ''}`)
      uploaded++
    }
  }

  console.log(`\nDone. Uploaded: ${uploaded} · Skipped: ${skipped} · Failed: ${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
