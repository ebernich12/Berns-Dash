export const metadata = { title: "Terms of Service — Berns Dashboard" };

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
      <p className="text-gray-400 mb-8">Last updated: April 24, 2026</p>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">1. Overview</h2>
        <p>
          Berns Dashboard (&ldquo;the App&rdquo;) is a personal productivity dashboard built and operated
          by Ethan Bernich. By accessing or using the App at bernsapp.com, you agree to these Terms of Service.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">2. Use of the App</h2>
        <p>
          This App is intended for personal use by its owner. Unauthorized access or use of the App is prohibited.
          You agree not to misuse, reverse-engineer, or interfere with the App or its services.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">3. TikTok Integration</h2>
        <p>
          The App integrates with TikTok&apos;s API via TikTok Login Kit to retrieve account analytics
          (profile information, follower/like counts, and public video data) for the account owner&apos;s
          personal use. This data is not shared with third parties.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">4. Intellectual Property</h2>
        <p>
          All content and code within the App are owned by Ethan Bernich unless otherwise noted. Third-party
          data (TikTok, Google, etc.) remains the property of their respective owners.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">5. Disclaimer</h2>
        <p>
          The App is provided &ldquo;as is&rdquo; without warranties of any kind. The owner is not liable for any
          damages arising from the use or inability to use the App.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">6. Changes</h2>
        <p>
          These terms may be updated at any time. Continued use of the App constitutes acceptance of the
          revised terms.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">7. Contact</h2>
        <p>
          Questions about these terms can be directed to{" "}
          <a href="mailto:plashjoe@gmail.com" className="underline">
            plashjoe@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
