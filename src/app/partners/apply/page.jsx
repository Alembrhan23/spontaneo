'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function PartnerApplyPage() {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());

    const { error } = await supabase.from('partner_submissions').insert({
      name: payload.name,
      neighborhood: payload.neighborhood,
      category: payload.category || null,
      contact_name: payload.contact_name || null,
      contact_email: payload.contact_email || null,
      contact_phone: payload.contact_phone || null,
      website_url: payload.website_url || null,
      happenings_text: payload.happenings_text || null,
      perks_text: payload.perks_text || null,
    });

    if (error) setErr(error.message);
    else setOk(true);
    setLoading(false);
  }

  if (ok) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold">Thanks!</h1>
        <p className="mt-3">We’ll review and confirm your free 30-day pilot shortly.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Apply to Nowio (Free Pilot)</h1>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4">
        <input name="name" placeholder="Business name" required className="border p-2 rounded" />
        <select name="neighborhood" required className="border p-2 rounded">
          <option value="">Neighborhood</option>
          <option>Five Points</option>
          <option>RiNo</option>
          <option>LoHi</option>
        </select>
        <input name="category" placeholder="Category (brewery, cafe…)" className="border p-2 rounded" />
        <input name="website_url" placeholder="Website or IG" className="border p-2 rounded" />
        <input name="contact_name" placeholder="Manager name" className="border p-2 rounded" />
        <input name="contact_email" placeholder="Manager email" className="border p-2 rounded" />
        <input name="contact_phone" placeholder="Manager phone" className="border p-2 rounded" />
        <textarea name="happenings_text" placeholder="Weekly happenings (trivia, live set, HH…)" className="border p-2 rounded" />
        <textarea name="perks_text" placeholder="Any group perks? (optional)" className="border p-2 rounded" />
        {err && <p className="text-red-500 text-sm">{err}</p>}
        <button disabled={loading} className="rounded px-4 py-2 border">
          {loading ? 'Submitting…' : 'Submit'}
        </button>
      </form>
    </main>
  );
}
