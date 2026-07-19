"use client";

import { useEffect, useState } from "react";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState("Finishing your sign-in…");

  useEffect(() => {
    async function completeSignIn() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const authError = hash.get("error_description");

      if (authError || !accessToken) {
        setMessage(authError || "That sign-in link is invalid or has expired. Please request another one.");
        return;
      }

      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });
        const data = (await response.json()) as { error?: string };

        if (!response.ok) throw new Error(data.error || "We could not complete your sign-in.");

        window.location.replace("/?signed_in=1#studio");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "We could not complete your sign-in.");
      }
    }

    void completeSignIn();
  }, []);

  return (
    <main className="auth-page">
      <section className="auth-card" aria-live="polite">
        <p>{message}</p>
      </section>
    </main>
  );
}
