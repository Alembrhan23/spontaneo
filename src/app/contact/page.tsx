export const metadata = { title: 'Contact • Nowio' }

export default function ContactPage({
  searchParams,
}: {
  searchParams?: { sent?: string }
}) {
  const sent = searchParams?.sent

  return (
    <div className="bg-gradient-to-b from-indigo-50 via-white to-white">
      {/* Hero */}
      <section className="border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Contact Nowio</h1>
          <p className="mt-3 max-w-2xl text-white/90">
            Venues, partners, feedback—say hi. We usually reply within a day.
          </p>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Success / error banner */}
        {sent === '1' && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
            Thanks! We got your message.
          </div>
        )}
        {sent === '0' && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
            Sorry—something went wrong. Please try again or email <a className="underline" href="mailto:hello@nowio.app">hello@nowio.app</a>.
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          {/* Quick cards */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">Email</div>
              <a href="mailto:hello@nowio.app" className="mt-1 block text-lg font-semibold text-gray-900 hover:underline">
                support@nowio.app
              </a>
              <p className="mt-2 text-sm text-gray-600">Best for general questions & venue inquiries.</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">DM</div>
              <p className="mt-1 text-lg font-semibold text-gray-900">Instagram / X</p>
              <p className="mt-2 text-sm text-gray-600">
                Prefer socials? DM us @nowio (coming soon). Email is still fastest.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm text-gray-500">Denver</div>
              <p className="mt-1 text-lg font-semibold text-gray-900">RiNo • LoHi • Five Points</p>
              <p className="mt-2 text-sm text-gray-600">
                We’re currently piloting in these neighborhoods.
              </p>
            </div>
          </div>

          {/* Form -> posts to your API route */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Send a message</h2>
            <p className="mt-1 text-sm text-gray-600">We’ll reply to your email.</p>

            <form action="/api/contact" method="POST" className="mt-6 space-y-4">
              {/* Honeypot field (hidden) */}
              <input type="text" name="company" className="hidden" tabIndex={-1} autoComplete="off" />

              <div>
                <label className="text-sm text-gray-700">Name</label>
                <input name="name" required className="mt-1 w-full rounded-lg border p-2.5" />
              </div>
              <div>
                <label className="text-sm text-gray-700">Email</label>
                <input type="email" name="email" required className="mt-1 w-full rounded-lg border p-2.5" />
              </div>
              <div>
                <label className="text-sm text-gray-700">Message</label>
                <textarea name="message" rows={5} required className="mt-1 w-full rounded-lg border p-2.5" />
              </div>

              <button className="w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700">
                Send
              </button>

              <p className="text-xs text-gray-500">
                Prefer email? <a className="underline" href="mailto:hello@nowio.app">support@nowio.app</a>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
