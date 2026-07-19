"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

const samples = [
  "A tiny brass automaton librarian with a glowing amber eye and an oversized key",
  "A mossy forest guardian carrying a lantern made of moonlight",
  "A rebel sky courier in a coral flight jacket with a paper map",
];

const styleOptions = ["16-bit adventure", "Cozy fantasy", "Neon arcade", "Pocket horror"];
const actionOptions = ["Idle + run", "Walk cycle", "Attack combo", "Spell cast"];
const frameOptions = [4, 6, 8];
const showcaseSpriteUrl = "/showcase/nova-runner-spritesheet.png";

type Generation = {
  image: string;
  createdAt: string;
  quota: GenerationQuota;
};

type GenerationQuota = {
  limit: number;
  used: number;
  remaining: number;
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

function GridIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" />
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

export default function Home() {
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

  function jumpToStudio() {
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
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
        headers: {
          apikey: publishableKey,
          "Content-Type": "application/json",
        },
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
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) {
      setError("Sign in with email and password or Google first. Anonymous generation is disabled.");
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
    <main>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Sprityful home">
          <span className="brand-mark"><SparkleIcon /></span>
          Sprityful
        </a>
        <div className="nav-links">
          <a href="#process">How it works</a>
          <a href="#showcase">Showcase</a>
          <a href="#studio">Studio</a>
        </div>
        {user ? (
          <button className="button button-small" onClick={signOut} type="button">Sign out</button>
        ) : (
          <button className="button button-small" onClick={jumpToStudio} type="button">
            Sign in <ArrowIcon />
          </button>
        )}
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Prompt to playable assets</div>
          <h1>Give your game a<br /><em>real cast.</em></h1>
          <p>
            Sprityful turns a character idea into original pixel-art animation sheets you can actually use. Describe the hero, choose a motion, and take the PNG with you.
          </p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={jumpToStudio}>
              <SparkleIcon /> Generate your first sprite
            </button>
            <a className="text-link" href="#showcase">See a real output <ArrowIcon /></a>
          </div>
          <div className="trust-row">
            <div className="stacked-avatars" aria-hidden="true"><i>✦</i><i>⌁</i><i>◒</i></div>
            <span>Made for tiny teams with big worlds.</span>
          </div>
        </div>

        <div className="hero-art" aria-label="Example generated pixel art sprite sheet">
          <div className="hero-art-topline"><span>CHARACTER / NOVA</span><span>4 FRAMES</span></div>
          <div className="grid-noise" />
          <Image
            className="hero-sheet"
            src={showcaseSpriteUrl}
            alt="Original space ranger pixel-art animation sprite sheet"
            width={1792}
            height={896}
            priority
            loading="eager"
          />
          <div className="stat-card stat-card-one"><b>4</b><span>animation poses</span></div>
          <div className="stat-card stat-card-two"><b>PNG</b><span>ready to export</span></div>
          <div className="art-orbit orbit-a" /><div className="art-orbit orbit-b" />
        </div>
      </section>

      <section className="strip shell" aria-label="Product benefits">
        <div><span className="strip-icon"><GridIcon /></span><p><b>Asset-first</b> Designed around exported files, not pretty previews.</p></div>
        <div><span className="strip-icon"><SparkleIcon /></span><p><b>Original results</b> Every brief starts from your own character idea.</p></div>
        <div><span className="strip-icon"><DownloadIcon /></span><p><b>Engine friendly</b> Chroma-key PNG plus starter sheet metadata in one click.</p></div>
      </section>

      <section className="process shell" id="process">
        <div className="section-heading"><div className="eyebrow"><span /> A small, useful loop</div><h2>From spark to sprite<br />in <em>three moves.</em></h2></div>
        <div className="steps">
          <article className="step-card"><span className="step-number">01</span><div className="step-icon">✎</div><h3>Describe the character</h3><p>Give us the silhouette, their strange little prop, and the mood of your game.</p><div className="mini-prompt">“A turnip knight with a dented helmet…”</div></article>
          <article className="step-card"><span className="step-number">02</span><div className="step-icon">✦</div><h3>Choose a movement</h3><p>Pick the motion your scene needs first. Every output is composed as a usable sequence.</p><div className="mini-timeline"><i /><i /><i /><i /></div></article>
          <article className="step-card"><span className="step-number">03</span><div className="step-icon">↓</div><h3>Drop it into your build</h3><p>Export a chroma-keyed PNG and matching JSON starter file for your pipeline.</p><div className="mini-file"><b>sprite-sheet</b><span>.png</span></div></article>
        </div>
      </section>

      <section className="showcase shell" id="showcase">
        <div className="showcase-copy"><div className="eyebrow"><span /> Built for lively worlds</div><h2>It begins with a<br /><em>single character.</em></h2><p>Then you give them a walk, a spell, a hurt pose, an absurd victory dance. Start with the one your game has been missing.</p><button className="button button-dark" onClick={jumpToStudio}>Make one now <ArrowIcon /></button></div>
        <div className="showcase-window"><div className="window-bar"><span /><span /><span /><b>preview / nova-runner.png</b></div><div className="checker"><Image src={showcaseSpriteUrl} alt="Pixel art character action-sheet showcase" width={1792} height={896} loading="eager" /></div><div className="window-footer"><span>4 character poses</span><span>export-ready sheet</span></div></div>
      </section>

      <section className="studio shell" id="studio">
        <div className="studio-intro"><div className="eyebrow"><span /> The sprite studio</div><h2>Let’s make<br /><em>something playable.</em></h2><p>Use the real generator below. Your image is created on demand, and stays in your browser until you export it.</p><div className="studio-note"><SparkleIcon /> Your prompt is sent securely from the server—your Cloudflare token never reaches the browser.</div>
          {user ? <div className="auth-state"><b>Signed in{user.email ? ` as ${user.email}` : ""}</b><span>{quota ? `${quota.remaining} of ${quota.limit} generations remain today.` : "Seven generations are available each UTC day."}</span></div> : <section className="auth-panel"><b>Sign in to create</b><p>Each verified account receives seven sprite generations per UTC day.</p><form onSubmit={signInWithPassword}><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="At least 8 characters" required /><div className="auth-actions"><button className="button button-auth" type="submit" disabled={authBusy || !authReady}>{authBusy ? "Please wait…" : "Sign in"}</button><button className="button button-auth-secondary" type="button" onClick={() => void authenticate("signUp")} disabled={authBusy || !authReady}>Create account</button></div></form><div className="auth-divider"><span />or<span /></div><button className="button button-google" type="button" onClick={signInWithGoogle} disabled={!authReady}><GoogleIcon /> Continue with Google</button></section>}
          {authMessage && <p className="auth-message" role="status">{authMessage}</p>}
        </div>
        <form className="generator" onSubmit={generate}>
          <label className="field-label" htmlFor="character">Character brief</label>
          <textarea id="character" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={480} rows={4} placeholder="A quiet cloud mechanic with moon boots..." />
          <div className="sample-row"><span>Try a spark:</span>{samples.map((sample) => <button type="button" className="sample" key={sample} onClick={() => setPrompt(sample)}>{sample.split(" ").slice(0, 4).join(" ")}…</button>)}</div>
          <div className="controls-grid">
            <label><span>Art style</span><select value={style} onChange={(event) => setStyle(event.target.value)}>{styleOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span>First animation</span><select value={action} onChange={(event) => setAction(event.target.value)}>{actionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <fieldset><legend>Frames</legend><div className="segment-control">{frameOptions.map((option) => <button type="button" className={frames === option ? "selected" : ""} key={option} onClick={() => setFrames(option)}>{option}</button>)}</div></fieldset>
          </div>
          <button className="button button-generate" disabled={status === "working" || !user || !authReady} type="submit">{status === "working" ? <><span className="spinner" /> Rendering your sprites…</> : !authReady ? "Checking sign-in…" : !user ? "Sign in above to generate" : <><SparkleIcon /> Generate sprite sheet <ArrowIcon /></>}</button>
          {error && <p className="form-error" role="alert">{error}</p>}
          <p className="fine-print">By generating, you agree not to request content that violates our usage rules.</p>
        </form>
      </section>

      <section className="result shell" aria-live="polite">
          {generation ? <div className="result-card"><div className="result-top"><div><span className="status-dot" /> Chroma key ready for export</div><span>{new Date(generation.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><div className="result-image checker"><img src={generation.image} alt={`Generated ${action} sprite sheet for ${prompt}`} /></div><div className="result-bottom"><div><b>{frames} frames</b><span>{style} · {action}</span></div><div className="download-actions"><button type="button" onClick={downloadMetadata}>JSON</button><button type="button" onClick={downloadImage}><DownloadIcon /> PNG</button></div></div></div> : <div className="empty-result"><div className="empty-stars">✦ ✧ · ✦</div><h3>Your next character appears here.</h3><p>Fill in a brief above and the studio will return an original, exportable sprite sheet.</p></div>}
      </section>

      <footer className="footer shell"><a className="brand" href="#top"><span className="brand-mark"><SparkleIcon /></span>Sprityful</a><p>Tools for the people who still care about the little pixels.</p><a className="text-link" href="#top">Back to top <ArrowIcon /></a></footer>
    </main>
  );
}
