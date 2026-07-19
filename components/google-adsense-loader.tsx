"use client";

import Script from "next/script";

function getAdSenseClient() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return client && /^ca-pub-\d+$/.test(client) ? client : null;
}

export function GoogleAdSenseLoader() {
  const client = getAdSenseClient();

  if (!client) return null;

  return (
    <Script
      async
      crossOrigin="anonymous"
      id="google-adsense"
      onLoad={() => window.dispatchEvent(new Event("sprityful:adsense-ready"))}
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      strategy="afterInteractive"
    />
  );
}
