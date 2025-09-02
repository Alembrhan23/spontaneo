export const metadata = { title: 'Terms • Nowio' }

export default function TermsPage() {
  const lastUpdated = new Date().toISOString().slice(0,10)
  return (
    <div className="bg-gradient-to-b from-violet-50 via-white to-white">
      {/* Hero */}
      <section className="border-b border-violet-100 bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <h1 className="text-3xl sm:text-4xl font-bold">Terms of Use</h1>
          <p className="mt-3 max-w-3xl text-white/90">
            Plain-English rules so everyone has a good time.
          </p>
        </div>
      </section>

      {/* Body */}
      <main className="mx-auto max-w-4xl px-6 py-10">
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <section className="space-y-6 text-gray-800">
            <p>
              Welcome to Nowio. By using our website or app, you agree to these terms.
              If you don’t agree, please don’t use the service.
            </p>

            <div>
              <h2 className="text-xl font-semibold">1) Basics</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
                <li>You must be 18+ and follow local laws.</li>
                <li>Be respectful; no harassment, hate, or illegal activity.</li>
                <li>We may remove content or suspend accounts that break these rules.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold">2) Safety</h2>
              <p className="mt-2 text-gray-700">
                Meet at your own discretion. Choose public places, tell a friend, and use common sense.
                Nowio does not conduct background checks unless explicitly stated.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold">3) Accounts & Content</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-gray-700">
                <li>You’re responsible for your account and anything you post.</li>
                <li>Don’t post others’ private info without consent.</li>
                <li>We can modify or discontinue features at any time.</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-semibold">4) Payments</h2>
              <p className="mt-2 text-gray-700">
                Any paid features will be clearly labeled. Fees are non-refundable unless required by law.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold">5) Liability</h2>
              <p className="mt-2 text-gray-700">
                Nowio is provided “as is.” To the extent permitted by law, we are not liable for
                indirect, incidental, or consequential damages.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-semibold">Contact</h2>
              <p className="mt-2 text-gray-700">
                Questions? <a className="underline" href="mailto:hello@nowio.app">hello@nowio.app</a>
              </p>
            </div>

            <p className="text-xs text-gray-500">Last updated: {lastUpdated}</p>
          </section>
        </article>
      </main>
    </div>
  )
}
