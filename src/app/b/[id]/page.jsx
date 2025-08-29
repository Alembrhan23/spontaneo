import { createClient } from '@supabase/supabase-js';

export const revalidate = 60;

export default async function BizDetail({ params }) {
  const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const { data: biz } = await supa.from('businesses').select('*').eq('id', params.id).single();
  if (!biz) return <div className="p-6">Not found</div>;
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="text-3xl font-bold">{biz.name}</h1>
      <p className="opacity-70">{biz.neighborhood} · {biz.category || '—'}</p>
      {biz.incentive_offer && <p className="mt-3">Offer: {biz.incentive_offer}</p>}
      <a href="/discover" className="inline-block mt-6 border rounded px-4 py-2">See tonight’s plans</a>
    </main>
  );
}
