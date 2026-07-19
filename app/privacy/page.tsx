import { SiteFooter } from "../../components/site-footer";
import Link from "next/link";

export const metadata = {
  title: "Privacy | Sprityful",
  description: "How Sprityful handles account, generation, and advertising data.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <section className="legal-shell shell">
        <Link className="brand legal-brand" href="/" aria-label="Sprityful home">Sprityful</Link>
        <p className="eyebrow"><span /> Privacy</p>
        <h1>Your privacy,<br /><em>in plain English.</em></h1>
        <p className="legal-updated">Last updated: July 19, 2026</p>

        <div className="legal-copy">
          <p>Sprityful is operated by YamCham0. This page explains what data is used when you visit the site, create an account, generate sprites, or see advertising.</p>

          <h2>What we use</h2>
          <p>When you create an account, Supabase processes your email address, sign-in details, and account identifier. We use that identifier only to run the sign-in experience and enforce the three-generation daily limit.</p>
          <p>When you generate a sprite, your character brief and selected settings are sent to Cloudflare Workers AI to create the image. The image is returned to your browser for export; Sprityful does not publish a gallery or keep generated images in its own storage.</p>
          <p>Vercel hosts the site and may process routine technical request information needed to deliver it securely and reliably.</p>

          <h2>Advertising and cookies</h2>
          <p>If advertising is enabled, Google AdSense may use cookies and similar technologies to deliver and measure ads. Google&apos;s consent message is configured in AdSense for visitors in regions where consent is required. You can review Google&apos;s data practices and controls through the links provided in that message.</p>
          <p>Sprityful also uses a session cookie to keep a signed-in user authenticated. Essential session cookies are not used to personalise advertising.</p>

          <h2>Choices and questions</h2>
          <p>You can sign out at any time. For a question about your account or a request concerning your information, contact the project owner through the <a href="https://github.com/YamCham0/Sprityful/issues">Sprityful GitHub issue tracker</a>.</p>

          <h2>Changes</h2>
          <p>We may update this page as Sprityful changes. The latest version will always be available here.</p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
