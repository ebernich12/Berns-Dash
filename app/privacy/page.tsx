export const metadata = { title: "Privacy Policy — Berns Dashboard" };

export default function PrivacyPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 text-sm leading-relaxed">
      <h1 className="text-2xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-400 mb-8">Last updated: April 24, 2026</p>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">1. Overview</h2>
        <p>
          This Privacy Policy describes how Berns Dashboard (&ldquo;the App&rdquo;), operated by Ethan Bernich,
          handles information when you use bernsapp.com.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">2. Information We Collect</h2>
        <p className="mb-2">
          When you authorize the App via TikTok Login Kit, the App accesses the following TikTok data
          on your behalf:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Basic profile information (open ID, display name, avatar) — via <code>user.info.basic</code></li>
          <li>Statistical data (follower count, like count, following count, video count) — via <code>user.info.stats</code></li>
          <li>List of public videos — via <code>video.list</code></li>
        </ul>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">3. How We Use This Information</h2>
        <p>
          TikTok data is used solely to display personal analytics to the account owner within the App.
          The data is stored privately on the App&apos;s server and is not shared with, sold to, or
          disclosed to any third party.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">4. Data Storage and Security</h2>
        <p>
          Retrieved data is stored in a private PostgreSQL database hosted on Oracle Cloud Infrastructure.
          Access to this data is restricted to the App owner. We take reasonable steps to protect stored
          data, but no system is completely secure.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">5. Data Retention</h2>
        <p>
          TikTok data snapshots are retained only as long as needed for the App&apos;s analytics features.
          You may request deletion of your data at any time by contacting us.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">6. Third-Party Services</h2>
        <p>
          The App integrates with TikTok for Developers. Your use of TikTok is governed by{" "}
          <a
            href="https://www.tiktok.com/legal/privacy-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            TikTok&apos;s Privacy Policy
          </a>
          .
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">7. Your Rights</h2>
        <p>
          You may revoke the App&apos;s access to your TikTok account at any time through TikTok&apos;s
          app settings. To request deletion of any stored data, contact us below.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">8. Changes to This Policy</h2>
        <p>
          This policy may be updated periodically. The &ldquo;Last updated&rdquo; date at the top reflects
          the most recent revision.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-2">9. Contact</h2>
        <p>
          For privacy-related questions or data deletion requests, contact{" "}
          <a href="mailto:plashjoe@gmail.com" className="underline">
            plashjoe@gmail.com
          </a>
          .
        </p>
      </section>
    </main>
  );
}
