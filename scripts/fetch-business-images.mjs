import 'dotenv/config'
import fs from 'node:fs/promises'
import path from 'node:path'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
const BUCKET = process.env.STORAGE_BUCKET || 'business-images'
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

const OUT = path.join(process.cwd(), 'business_images')
await fs.mkdir(OUT, { recursive: true })

// Load list
const sites = JSON.parse(await fs.readFile('./sites.json', 'utf8'))

// tiny helper
const abs = (url, base) => {
  try { return new URL(url, base).href } catch { return null }
}

async function getHero(url) {
  const res = await fetch(url, { redirect: 'follow' })
  const html = await res.text()
  const $ = cheerio.load(html)

  const candidates = [
    $('meta[property="og:image"]').attr('content'),
    $('meta[name="twitter:image"]').attr('content'),
    $('link[rel="image_src"]').attr('href'),
    $('img[src]').first().attr('src'),
  ].filter(Boolean)

  // return first absolute image we can make sense of
  for (const c of candidates) {
    const full = abs(c, res.url)
    if (full && /^https?:\/\//.test(full)) return full
  }
  return null
}

async function downloadToBuffer(url) {
  const r = await fetch(url, { redirect: 'follow' })
  if (!r.ok) throw new Error(`image fetch failed: ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

async function upsertBusinessImage({ name, slug, site }) {
  try {
    const hero = await getHero(site)
    if (!hero) { console.warn(`No hero image for ${name}`); return }

    const buf = await downloadToBuffer(hero)
    const jpg = await sharp(buf).resize({ width: 1600 }).jpeg({ quality: 82 }).toBuffer()

    const key = `mvp/${slug}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, jpg, {
      contentType: 'image/jpeg',
      upsert: true,
      cacheControl: '3600'
    })
    if (upErr) throw upErr

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key)
    const image_url = pub?.publicUrl || null

    // Update businesses row by name (assumes unique)
    const { error: updErr } = await supabase
      .from('businesses')
      .update({ image_key: key, image_url })
      .eq('name', name)
    if (updErr) throw updErr

    console.log(`✓ ${name} → ${key}`)
  } catch (e) {
    console.error(`× ${name}:`, e.message)
  }
}

for (const row of sites) {
  await upsertBusinessImage(row)
}
console.log('Done.')
