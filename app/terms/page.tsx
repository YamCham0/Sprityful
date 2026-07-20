import { SiteFooter } from "../../components/site-footer";
import Link from "next/link";

export const metadata = {
  title: "Terms | Sprityful",
  description: "Terms for using the Sprityful sprite generator.",
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <section className="legal-shell shell">
        <Link className="brand legal-brand" href="/" aria-label="Sprityful home">Sprityful</Link>
        <p className="eyebrow"><span /> Terms</p>
        <h1>Make things<br /><em>responsibly.</em></h1>
        <p className="legal-updated">Last updated: July 19, 2026</p>

        <div className="legal-copy">
          <p>Sprityful is a browser-based tool for creating original game-sprite concepts. By using it, you agree to use it lawfully and with respect for other people&apos;s rights.</p>

          <h2>Use of the generator</h2>
          <p>Do not submit prompts that are unlawful, harmful, deceptive, or designed to infringe someone else&apos;s intellectual-property, privacy, or publicity rights. You are responsible for the prompts you submit and for deciding whether a generated asset is suitable for your project.</p>
          <p>Each signed-in account can generate one sprite sheet per UTC day. This limit protects the shared free generation pool and may change if the service changes.</p>

          <h2>Availability</h2>
          <p>Sprityful is provided as available. Generation providers, hosting services, or account services can occasionally be unavailable, and results may vary. Do not rely on the service as the only copy of work that matters to you—download exports you want to keep.</p>

          <h2>Accounts</h2>
          <p>Keep your sign-in details private. We may restrict access that appears to abuse the service, interfere with other users, or violate these terms.</p>

          <h2>Feedback and contact</h2>
          <p>Questions, bug reports, and feedback can be shared through the <a href="https://github.com/YamCham0/Sprityful/issues">Sprityful GitHub issue tracker</a>.</p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
