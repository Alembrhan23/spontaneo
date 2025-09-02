export const metadata = { title: 'Privacy • Nowio' }

export default function PrivacyPage() {
  const lastUpdated = new Date().toISOString().slice(0,10)
  return (
    <div className="bg-gradient-to-b from-fuchsia-50 via-white to-white">
      {/* Hero */}
      <section className="border-b border-fuchsia-100 bg-gradient-to-r from-fuchsia-600 to-rose-600 text-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h1 className="text-3xl sm:text-4xl font-bold">Privacy Policy</h1>
          <p className="mt-3 max-w-3xl text-white/90">
            We collect only what we need to run Nowio. No selling of personal data.
          </p>
        </div>
      </section>

      {/* Body */}
      <main className="mx-auto max-w-4xl px-6 py-10">
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <section className="space-y-6 text-gray-800">
            <div>
              <h2 className="text-xl font-semibold">What we collect</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
                <li>Account info (name, email, neighborhood, profile details).</li>
                <li>Basic usage data (pages viewed, device info).</li>
                <li>UTM tags from printed flyers (e.g., “rino”) so we know what worked.</li>
                <li>Content you post (plans, messages) to operate the service.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold">How we use it</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
                <li>Run Nowio, show relevant plans, prevent abuse.</li>
                <li>Measure campaigns and improve features.</li>
                <li>Send essential notifications you opt into.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold">Sharing</h2>
              <p className="mt-2 text-gray-700">
                We don’t sell personal data. We use trusted processors (hosting, analytics, payments)
                under contract and only for operating Nowio.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold">Your choices</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
                <li>Delete your account to remove your profile.</li>
                <li>For access or deletion requests, email <a className="underline" href="mailto:privacy@nowio.app">privacy@nowio.app</a>.</li>
              </ul>
            </div>

            <p className="text-xs text-gray-500">Last updated: {lastUpdated}</p>
          </section>
        </article>
      </main>
    </div>
  )
}
