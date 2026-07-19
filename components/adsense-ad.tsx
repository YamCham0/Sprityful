"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

function getAdSenseClient() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
  return client && /^ca-pub-\d+$/.test(client) ? client : null;
}

function getAdSlot() {
  const slot = process.env.NEXT_PUBLIC_ADSENSE_LANDING_SLOT?.trim();
  return slot && /^\d+$/.test(slot) ? slot : null;
}

function areAdsEnabled() {
  return process.env.NEXT_PUBLIC_ADSENSE_ENABLE_ADS === "true";
}

export function AdSenseAd() {
  const client = getAdSenseClient();
  const slot = getAdSlot();
  const isConfigured = Boolean(client && slot && areAdsEnabled());

  useEffect(() => {
    if (!isConfigured) return;

    let pushed = false;
    const requestAd = () => {
      if (pushed || !window.adsbygoogle) return;

      try {
        window.adsbygoogle.push({});
        pushed = true;
      } catch {
        // Ad blockers and an unapproved ad unit should leave the page usable.
      }
    };

    requestAd();
    window.addEventListener("sprityful:adsense-ready", requestAd);
    return () => window.removeEventListener("sprityful:adsense-ready", requestAd);
  }, [isConfigured]);

  if (!isConfigured || !client || !slot) return null;

  return (
    <aside className="ad-slot" aria-label="Advertisement">
      <span className="ad-slot-label">Advertisement</span>
      <ins
        className="adsbygoogle"
        data-ad-client={client}
        data-ad-format="auto"
        data-ad-slot={slot}
        data-full-width-responsive="true"
        style={{ display: "block" }}
      />
    </aside>
  );
}
