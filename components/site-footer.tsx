import Image from "next/image";
import Link from "next/link";

type SiteFooterProps = {
  actionHref?: string;
  actionLabel?: string;
};

export function SiteFooter({ actionHref = "/studio", actionLabel = "Open studio" }: SiteFooterProps) {
  return (
    <footer className="footer shell">
      <Link className="brand" href="/" aria-label="Sprityful home">
        <span className="brand-mark"><Image src="/blue-fire-sprite.png" alt="" width={30} height={30} /></span>
        Sprityful
      </Link>
      <p>By YamCham0</p>
      <div className="footer-links">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link className="text-link" href={actionHref}>{actionLabel}</Link>
      </div>
    </footer>
  );
}
