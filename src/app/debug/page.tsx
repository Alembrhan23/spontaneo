import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export default async function DebugPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o: any) => cookieStore.set({ name: n, value: v, ...o }),
        remove: (n, o: any) => cookieStore.set({ name: n, value: "", ...o }),
      },
    }
  )

  // Get all perks with better error handling
  const { data: allPerks, error: perksError } = await supabase
    .from('business_perks_view')
    .select('*')
    .limit(50)

  // Get businesses
  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .limit(50)

  if (perksError) {
    console.error('Perks error:', perksError)
  }
  if (bizError) {
    console.error('Businesses error:', bizError)
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Database Debug</h1>

      {perksError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error loading perks:</strong> {perksError.message}
        </div>
      )}

      {bizError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error loading businesses:</strong> {bizError.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Businesses */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Businesses ({businesses?.length || 0})</h2>
          {businesses?.map((business) => (
            <div key={business.id} className="bg-white p-4 rounded-lg shadow mb-3">
              <h3 className="font-bold">{business.name}</h3>
              <p>Category: {business.category || 'None'}</p>
              <p>Vibe: {business.vibe_tags?.join(', ') || 'None'}</p>
              <p>Amenities: {business.amenities?.join(', ') || 'None'}</p>
            </div>
          ))}
        </div>

        {/* Perks */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Perks ({allPerks?.length || 0})</h2>
          {allPerks?.map((perk, index) => (
            <div key={perk.id || `perk-${index}`} className="bg-white p-4 rounded-lg shadow mb-3">
              <h3 className="font-bold">{perk.perk_title || 'No title'}</h3>
              <p>Type: {perk.perk_type || 'None'}</p>
              <p>Business: {perk.business_name || 'Unknown'}</p>
              <p>Category: {perk.business_category || 'None'}</p>
              <p>Active Now: {perk.is_active_now ? 'Yes' : 'No'}</p>
              <p>Days: {perk.perk_days?.join(', ') || 'None'}</p>
              <p>Time: {perk.perk_start_time} - {perk.perk_end_time}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Raw Data View */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Raw Data Analysis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold">Perk Types</h3>
            <pre className="text-sm">
              {JSON.stringify(
                allPerks?.reduce((acc, perk) => {
                  const type = perk.perk_type || 'NULL';
                  acc[type] = (acc[type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>),
                null,
                2
              )}
            </pre>
          </div>

          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold">Business Categories</h3>
            <pre className="text-sm">
              {JSON.stringify(
                businesses?.reduce((acc, biz) => {
                  const category = biz.category || 'NULL';
                  acc[category] = (acc[category] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>),
                null,
                2
              )}
            </pre>
          </div>

          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-semibold">Active Now Status</h3>
            <pre className="text-sm">
              {JSON.stringify(
                allPerks?.reduce((acc, perk) => {
                  const status = perk.is_active_now ? 'active' : 'inactive';
                  acc[status] = (acc[status] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>),
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}