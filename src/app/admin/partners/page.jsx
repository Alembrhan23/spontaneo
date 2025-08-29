'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

const ADMIN_EMAILS = ['alembrhan23@gmail.com']; // simple MVP gate

export default function AdminPartners() {
  const [me, setMe] = useState(null);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setMe(user);
      const { data } = await supabase
        .from('partner_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      setSubs(data || []);
      setLoading(false);
    })();
  }, []);

  async function approve(id) {
    setMsg('');
    const res = await fetch('/api/partners/approve', { method: 'POST', body: JSON.stringify({ id }) });
    const json = await res.json();
    if (!res.ok) return setMsg(json.error || 'Failed');
    setMsg('Approved!');
    setSubs(s => s.map(x => x.id === id ? { ...x, status: 'approved', business_id: json.business?.id } : x));
  }

  async function reject(id) {
    setMsg('');
    const { error } = await supabase.from('partner_submissions').update({ status: 'rejected' }).eq('id', id);
    if (error) setMsg(error.message); else setMsg('Rejected.');
    setSubs(s => s.map(x => x.id === id ? { ...x, status: 'rejected' } : x));
  }

  if (!me) return <div className="p-6">Sign in to view.</div>;
  if (!ADMIN_EMAILS.includes(me.email)) return <div className="p-6">Not authorized.</div>;
  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Partner Submissions</h1>
      {msg && <p className="text-sm mb-3">{msg}</p>}
      <div className="space-y-4">
        {subs.map(s => (
          <div key={s.id} className="border rounded p-4">
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm opacity-70">
                  {s.neighborhood} · {s.category || '—'}
                </div>
                <div className="text-sm mt-1">{s.contact_name} · {s.contact_email} · {s.contact_phone}</div>
              </div>
              <span className="text-xs px-2 py-1 rounded border self-start">{s.status}</span>
            </div>
            {s.happenings_text && <p className="mt-2 text-sm">{s.happenings_text}</p>}
            {s.perks_text && <p className="mt-1 text-xs opacity-70">Perks: {s.perks_text}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => approve(s.id)} className="px-3 py-1 border rounded">Approve</button>
              <button onClick={() => reject(s.id)} className="px-3 py-1 border rounded">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
