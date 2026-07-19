"use client";

import Image from "next/image";
import { type FormEvent, useEffect, useMemo, useState } from "react";

const samples = [
  "A tiny brass automaton librarian with a glowing amber eye and an oversized key",
  "A mossy forest guardian carrying a lantern made of moonlight",
  "A rebel sky courier in a coral flight jacket with a paper map",
];

const styleOptions = ["16-bit adventure", "Cozy fantasy", "Neon arcade", "Pocket horror"];
const actionOptions = ["Idle + run", "Walk cycle", "Attack combo", "Spell cast"];
const frameOptions = [4, 6, 8];

type GenerationQuota = {
  limit: number;
  used: number;
  remaining: number;
};

type Generation = {
  image: string;
  createdAt: string;
  quota: GenerationQuota;
};

type SignedInUser = {
  id: string;
  email: string | null;
};

type SupabaseAuthResponse = {
  access_token?: string;
  session?: { access_token?: string };
  error?: string;
  error_description?: string;
  message?: string;
  msg?: string;
};

function SparkleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M12 2l1.95 6.05L20 10l-6.05 1.95L12 18l-1.95-6.05L4 10l6.05-1.95L12 2Z" fill="currentColor" />
      <path d="M19 16l.74 2.26L22 19l-2.26.74L19 22l-.74-2.26L16 19l2.26-.74L19 16Z" fill="currentColor" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18v2h14v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M21.35 12.24c0-.72-.06-1.22-.2-1.74H12v3.35h5.37a4.6 4.6 0 0 1-1.99 3.02v2.17h3.22c1.88-1.74 2.75-4.3 2.75-6.8Z" fill="currentColor" />
      <path d="M12 21.7c2.62 0 4.82-.87 6.42-2.66l-3.22-2.17c-.87.58-1.98.92-3.2.92-2.53 0-4.68-1.7-5.45-4.01H3.23v2.23A9.7 9.7 0 0 0 12 21.7Z" fill="currentColor" />
      <path d="M6.55 13.78a5.85 5.85 0 0 1 0-3.56V7.99H3.23a9.72 9.72 0 0 0 0 8.02l3.32-2.23Z" fill="currentColor" />
      <path d="M12 6.21c1.46 0 2.77.5 3.8 1.48l2.85-2.8C16.8 3.17 14.61 2.3 12 2.3a9.7 9.7 0 0 0-8.77 5.69l3.32 2.23C7.32 7.91 9.47 6.21 12 6.21Z" fill="currentColor" />
    </svg>
  );
}

export function SpriteStudio() {
  const [prompt, setPrompt] = useState(samples[0]);
  const [style, setStyle] = useState(styleOptions[0]);
  const [action, setAction] = useState(actionOptions[0]);
  const [frames, setFrames] = useState(4);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState("");
  const [user, setUser] = useState<SignedInUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [quota, setQuota] = useState<GenerationQuota | null>(null);

  const metadata = useMemo(
    () => ({
      name: "sprityful-sprite-sheet",
      prompt,
      style,
      animation: action,
      frameCount: frames,
      layout: { columns: frames, rows: 1, cellWidth: 256, cellHeight: 256 },
      fps: action === "Idle + run" ? 8 : 10,
      transparentBackground: true,
      sourceFormat: "jpeg",
      exportFormat: "png",
      backgroundRemoval: "Client-side chroma key (#00ff00)",
    }),
    [action, frames, prompt, style],
  );

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { user?: SignedInUser };
          if (active && data.user?.id) setUser(data.user);
        }
      } finally {
        if (active) setAuthReady(true);
      }
    }

    if (new URLSearchParams(window.location.search).get("signed_in") === "1") {
      setAuthMessage("You are signed in. Your seven daily generations are ready.");
      window.history.replaceState({}, "", `${window.location.pathname}#generator`);
    }

    void loadSession();
    return () => {
      active = false;
    };
  }, []);

  async function authenticate(kind: "signIn" | "signUp") {
    setAuthMessage("");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) {
      setAuthMessage("Sign-in is not configured yet. Please try again once the project is connected.");
      return;
    }

    const normalizedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setAuthMessage("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setAuthMessage("Use a password with at least 8 characters.");
      return;
    }

    setAuthBusy(true);
    try {
      const endpoint = new URL(kind === "signIn" ? "/auth/v1/token" : "/auth/v1/signup", supabaseUrl);
      if (kind === "signIn") endpoint.searchParams.set("grant_type", "password");
      else endpoint.searchParams.set("redirect_to", `${window.location.origin}/auth/callback`);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { apikey: publishableKey, "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });
      const data = (await response.json().catch(() => ({}))) as SupabaseAuthResponse;
      if (!response.ok) throw new Error(data.error_description || data.msg || data.message || data.error || "We could not complete that request.");

      const accessToken = data.access_token || data.session?.access_token;
      if (!accessToken) {
        setAuthMessage("Account created. Check your email to confirm it, then sign in with your password.");
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });
      const sessionData = (await sessionResponse.json().catch(() => ({}))) as { user?: SignedInUser; error?: string };
      if (!sessionResponse.ok || !sessionData.user?.id) throw new Error(sessionData.error || "We could not complete your sign-in.");

      setUser(sessionData.user);
      setPassword("");
      setAuthMessage(kind === "signUp" ? "Account created. Your seven daily generations are ready." : "You are signed in. Your seven daily generations are ready.");
      window.setTimeout(() => jumpTo("generator"), 0);
    } catch (requestError) {
      setAuthMessage(requestError instanceof Error ? requestError.message : "We could not complete your sign-in.");
    } finally {
      setAuthBusy(false);
    }
  }

  function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void authenticate("signIn");
  }

  function signInWithGoogle() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!supabaseUrl || !publishableKey) {
      setAuthMessage("Sign-in is not configured yet. Please try again once the project is connected.");
      return;
    }

    const endpoint = new URL("/auth/v1/authorize", supabaseUrl);
    endpoint.searchParams.set("provider", "google");
    endpoint.searchParams.set("redirect_to", `${window.location.origin}/auth/callback`);
    window.location.assign(endpoint.toString());
  }

  async function signOut() {
    await fetch("/api/auth/session", { method: "DELETE" });
    setUser(null);
    setQuota(null);
    setAuthMessage("You are signed out.");
    jumpTo("sign-in");
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setError("Sign in with email and password or Google first. Anonymous generation is disabled.");
      jumpTo("sign-in");
      return;
    }
    setError("");
    setStatus("working");
    setGeneration(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, action, frames }),
      });
      const data = (await response.json()) as Generation & { error?: string };
      if (!response.ok || !data.image) throw new Error(data.error || "Generation did not complete.");
      setGeneration({ image: data.image, createdAt: data.createdAt, quota: data.quota });
      setQuota(data.quota);
      setStatus("idle");
    } catch (requestError) {
      setStatus("error");
      setError(requestError instanceof Error ? requestError.message : "Generation did not complete.");
    }
  }

  function downloadImage() {
    if (!generation) return;
    const source = new window.Image();
    source.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = source.naturalWidth;
      canvas.height = source.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      context.drawImage(source, 0, 0);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < pixels.data.length; index += 4) {
        const red = pixels.data[index];
        const green = pixels.data[index + 1];
        const blue = pixels.data[index + 2];
        const greenDominant = green > 105 && green > red * 1.28 && green > blue * 1.28;
        if (greenDominant) {
          const matte = Math.min(1, Math.max(0, (green - Math.max(red, blue) * 1.28) / 90));
          pixels.data[index + 3] = Math.round(255 * (1 - matte));
        }
      }
      context.putImageData(pixels, 0, 0);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "sprityful-spritesheet.png";
        link.click();
        URL.revokeObjectURL(link.href);
      }, "image/png");
    };
    source.src = generation.image;
  }

  function downloadMetadata() {
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sprityful-spritesheet.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main className="studio-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="/" aria-label="Sprityful home"><span className="brand-mark"><Image src="/blue-fire-sprite.png" alt="" width={30} height={30} /></span>Sprityful</a>
        <div className="nav-links"><a href="/#how-it-works">How it works</a><a href="/#showcase">Showcase</a></div>
        {user ? <button className="button button-small" onClick={signOut} type="button">Sign out</button> : <button className="button button-small" onClick={() => jumpTo("sign-in")} type="button">Sign in <ArrowIcon /></button>}
      </nav>

      <section className="studio-page-hero shell" aria-labelledby="studio-title">
        <div className="studio-hero-copy">
          <div className="eyebrow"><span /> Your sprite studio</div>
          <h1 id="studio-title">Build a cast<br /><em>worth playing.</em></h1>
          <p>Sign in once, then turn your character briefs into game-ready sprite sheets. Every verified account receives seven generations each day.</p>
          <a className="text-link studio-backlink" href="/"><ArrowIcon /> Back to the overview</a>
        </div>

        <section className="studio-access" id="sign-in" aria-labelledby="access-title">
          {user ? <div className="auth-state"><b id="access-title">Signed in{user.email ? ` as ${user.email}` : ""}</b><span>{quota ? `${quota.remaining} of ${quota.limit} generations remain today.` : "Seven generations are available each UTC day."}</span><button className="button button-auth-secondary auth-signout" type="button" onClick={signOut}>Sign out</button></div> : <div className="auth-panel"><b id="access-title">Sign in to create</b><p>Use email and password, or continue with Google. Your free daily generations unlock as soon as you are signed in.</p><form onSubmit={signInWithPassword}><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="At least 8 characters" required /><div className="auth-actions"><button className="button button-auth" type="submit" disabled={authBusy || !authReady}>{authBusy ? "Please wait..." : "Sign in"}</button><button className="button button-auth-secondary" type="button" onClick={() => void authenticate("signUp")} disabled={authBusy || !authReady}>Create account</button></div></form><div className="auth-divider"><span />or<span /></div><button className="button button-google" type="button" onClick={signInWithGoogle} disabled={!authReady}><GoogleIcon /> Continue with Google</button></div>}
          {authMessage && <p className="auth-message" role="status">{authMessage}</p>}
        </section>
      </section>

      <section className="workspace shell" id="generator" aria-labelledby="generator-title">
        <div className="workspace-intro"><div className="eyebrow"><span /> Ready when you are</div><h2 id="generator-title">Describe the hero.<br /><em>We make the sheet.</em></h2><p>Your image is created on demand and stays in your browser until you export it.</p></div>
        <form className="generator" onSubmit={generate}>
          <label className="field-label" htmlFor="character">Character brief</label>
          <textarea id="character" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={480} rows={4} placeholder="A quiet cloud mechanic with moon boots..." />
          <div className="sample-row"><span>Try a spark:</span>{samples.map((sample) => <button type="button" className="sample" key={sample} onClick={() => setPrompt(sample)}>{sample.split(" ").slice(0, 4).join(" ")}...</button>)}</div>
          <div className="controls-grid"><label><span>Art style</span><select value={style} onChange={(event) => setStyle(event.target.value)}>{styleOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>First animation</span><select value={action} onChange={(event) => setAction(event.target.value)}>{actionOptions.map((option) => <option key={option}>{option}</option>)}</select></label><fieldset><legend>Frames</legend><div className="segment-control">{frameOptions.map((option) => <button type="button" className={frames === option ? "selected" : ""} key={option} onClick={() => setFrames(option)}>{option}</button>)}</div></fieldset></div>
          <button className="button button-generate" disabled={status === "working" || !user || !authReady} type="submit">{status === "working" ? <><span className="spinner" /> Rendering your sprites...</> : !authReady ? "Checking sign-in..." : !user ? "Sign in above to generate" : <><SparkleIcon /> Generate sprite sheet <ArrowIcon /></>}</button>
          {error && <p className="form-error" role="alert">{error}</p>}
          <p className="fine-print">By generating, you agree not to request content that violates our usage rules.</p>
        </form>
      </section>

      <section className="result shell" aria-live="polite">
        {generation ? <div className="result-card"><div className="result-top"><div><span className="status-dot" /> Chroma key ready for export</div><span>{new Date(generation.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><div className="result-image checker"><img src={generation.image} alt={`Generated ${action} sprite sheet for ${prompt}`} /></div><div className="result-bottom"><div><b>{frames} frames</b><span>{style} · {action}</span></div><div className="download-actions"><button type="button" onClick={downloadMetadata}>JSON</button><button type="button" onClick={downloadImage}><DownloadIcon /> PNG</button></div></div></div> : <div className="empty-result"><div className="empty-stars">✦ ✧ · ✦</div><h3>Your next character appears here.</h3><p>Fill in a brief above and the studio will return an original, exportable sprite sheet.</p></div>}
      </section>

      <footer className="footer shell"><a className="brand" href="/"><span className="brand-mark"><Image src="/blue-fire-sprite.png" alt="" width={30} height={30} /></span>Sprityful</a><p>By YamCham0</p><a className="text-link" href="#sign-in">Back to sign in <ArrowIcon /></a></footer>
    </main>
  );
}
