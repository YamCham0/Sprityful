"use client";

import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { clearStoredSpriteRuns, readStoredSpriteRuns, type StoredSpriteRun, writeStoredSpriteRuns } from "../lib/run-history";
import { SiteFooter } from "./site-footer";

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
  unlimited?: boolean;
};

type SpriteDetails = {
  prompt: string;
  style: string;
  action: string;
  frames: number;
};

type Generation = SpriteDetails & {
  image: string;
  createdAt: string;
  quota?: GenerationQuota;
};

type GenerationResponse = Generation & {
  quota: GenerationQuota;
};

type SignedInUser = {
  id: string;
  email: string | null;
  hasUnlimitedTestGenerations?: boolean;
};

type SupabaseAuthResponse = {
  access_token?: string;
  session?: { access_token?: string };
  error?: string;
  error_description?: string;
  message?: string;
  msg?: string;
};

function createRunName(prompt: string) {
  const normalizedPrompt = prompt.trim().replace(/\s+/g, " ");
  if (!normalizedPrompt) return "Untitled character";
  const words = normalizedPrompt.split(" ").slice(0, 6);
  return `${words.join(" ")}${normalizedPrompt.split(" ").length > words.length ? "..." : ""}`;
}

function createMetadata({ prompt, style, action, frames }: SpriteDetails) {
  return {
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
  };
}

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
  const [prompt, setPrompt] = useState("");
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
  const [runLog, setRunLog] = useState<StoredSpriteRun[]>([]);
  const [runLogAccountId, setRunLogAccountId] = useState<string | null>(null);

  const exportMetadata = useMemo(
    () => createMetadata(generation ?? { prompt, style, action, frames }),
    [action, frames, generation, prompt, style],
  );
  const activeWorkflowStep = generation || status === "working" ? 3 : prompt.trim() ? 2 : 1;

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  useEffect(() => {
    let active = true;
    let signedInTimer: number | undefined;

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
      signedInTimer = window.setTimeout(() => {
        if (active) setAuthMessage("You are signed in. Your three daily generations are ready.");
      }, 0);
      window.history.replaceState({}, "", `${window.location.pathname}#generator`);
    }

    void loadSession();
    return () => {
      active = false;
      if (signedInTimer !== undefined) window.clearTimeout(signedInTimer);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const accountId = user?.id;
    const loadRunHistory = window.setTimeout(() => {
      if (!accountId) {
        setRunLog([]);
        setRunLogAccountId(null);
        return;
      }

      // Do not save anything until this account's stored sheets have finished loading.
      // Otherwise an empty initial state can overwrite the account's existing history.
      setRunLogAccountId(null);
      void readStoredSpriteRuns(accountId)
        .then((runs) => {
          if (!active) return;
          setRunLog(runs);
          setRunLogAccountId(accountId);
        })
        .catch(() => {
          if (!active) return;
          setRunLog([]);
          setRunLogAccountId(accountId);
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(loadRunHistory);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || runLogAccountId !== user.id) return;
    void writeStoredSpriteRuns(user.id, runLog).catch(() => {
      // Browser storage is optional and should never block a generation or export.
    });
  }, [runLog, runLogAccountId, user]);

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
      setAuthMessage(kind === "signUp" ? "Account created. Your three daily generations are ready." : "You are signed in. Your three daily generations are ready.");
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
    const spriteDetails = { prompt, style, action, frames };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, style, action, frames }),
      });
      const data = (await response.json()) as GenerationResponse & { error?: string };
      if (!response.ok || !data.image) throw new Error(data.error || "Generation did not complete.");
      setGeneration({ ...spriteDetails, image: data.image, createdAt: data.createdAt, quota: data.quota });
      setRunLog((currentRuns) => [
        {
          ...spriteDetails,
          id: `${data.createdAt}-${Math.random().toString(36).slice(2, 8)}`,
          name: createRunName(spriteDetails.prompt),
          image: data.image,
          createdAt: data.createdAt,
        },
        ...currentRuns.filter((run) => run.prompt !== spriteDetails.prompt || run.action !== spriteDetails.action || run.style !== spriteDetails.style || run.frames !== spriteDetails.frames),
      ].slice(0, 5));
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
    const blob = new Blob([JSON.stringify(exportMetadata, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "sprityful-spritesheet.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function loadRun(run: StoredSpriteRun) {
    setPrompt(run.prompt);
    setStyle(run.style);
    setAction(run.action);
    setFrames(run.frames);
    setGeneration(run);
    setError("");
    window.setTimeout(() => jumpTo("run-review"), 0);
  }

  function clearRunHistory() {
    setRunLog([]);
    if (user) void clearStoredSpriteRuns(user.id).catch(() => undefined);
  }

  return (
    <main className="studio-page">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <nav className="nav shell" aria-label="Main navigation">
        <Link className="brand" href="/" aria-label="Sprityful home"><span className="brand-mark"><Image src="/blue-fire-sprite.png" alt="" width={30} height={30} /></span>Sprityful</Link>
        <div className="nav-links"><Link href="/#how-it-works">How it works</Link><Link href="/#showcase">Showcase</Link></div>
        {user ? <button className="button button-small" onClick={signOut} type="button">Sign out</button> : <button className="button button-small" onClick={() => jumpTo("sign-in")} type="button">Sign in <ArrowIcon /></button>}
      </nav>

      <section className="studio-masthead shell" aria-labelledby="studio-title">
        <div className="studio-masthead-copy">
          <div className="eyebrow"><span /> Sprityful studio</div>
          <h1 id="studio-title">From a character brief<br /><em>to playable motion.</em></h1>
          <p>Build one focused run at a time: define the hero, choose its first motion, then export a sprite sheet ready for your game.</p>
          <Link className="text-link studio-backlink" href="/"><ArrowIcon /> Back to the overview</Link>
        </div>

        <section className="studio-access studio-auth-card" id="sign-in" aria-labelledby="access-title">
          {user ? <div className="auth-state"><b id="access-title">Signed in{user.email ? ` as ${user.email}` : ""}</b><span>{user.hasUnlimitedTestGenerations || quota?.unlimited ? "Unlimited testing generations are enabled for this account." : quota ? `${quota.remaining} of ${quota.limit} generations remain today.` : "Three generations are available each UTC day."}</span><button className="button button-auth-secondary auth-signout" type="button" onClick={signOut}>Sign out</button></div> : <div className="auth-panel"><b id="access-title">Sign in to create</b><p>Use email and password, or continue with Google. Your free daily generations unlock as soon as you are signed in.</p><form onSubmit={signInWithPassword}><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} placeholder="At least 8 characters" required /><div className="auth-actions"><button className="button button-auth" type="submit" disabled={authBusy || !authReady}>{authBusy ? "Please wait..." : "Sign in"}</button><button className="button button-auth-secondary" type="button" onClick={() => void authenticate("signUp")} disabled={authBusy || !authReady}>Create account</button></div></form><div className="auth-divider"><span />or<span /></div><button className="button button-google" type="button" onClick={signInWithGoogle} disabled={!authReady}><GoogleIcon /> Continue with Google</button></div>}
          {authMessage && <p className="auth-message" role="status">{authMessage}</p>}
        </section>
      </section>

      <section className="studio-workflow shell" id="generator" aria-labelledby="generator-title">
        <div className="workflow-heading">
          <div>
            <div className="eyebrow"><span /> A focused run</div>
            <h2 id="generator-title">Three steps. <em>One exportable sheet.</em></h2>
          </div>
          <p>Keep the creative choices small and deliberate. Recent sheets stay only on this browser, ready to review or export again.</p>
        </div>

        <ol className="workflow-steps" aria-label="Sprite generation workflow">
          {[
            ["01", "Brief", "Describe the hero"],
            ["02", "Motion", "Choose action and frames"],
            ["03", "Export", "Generate, review, download"],
          ].map(([number, label, detail], index) => {
            const step = index + 1;
            return <li className={step === activeWorkflowStep ? "current" : step < activeWorkflowStep ? "complete" : ""} key={number} aria-current={step === activeWorkflowStep ? "step" : undefined}><span>{number}</span><div><b>{label}</b><small>{detail}</small></div></li>;
          })}
        </ol>

        <form className="generator studio-generator" onSubmit={generate}>
          <section className="form-step" aria-labelledby="brief-step-title">
            <div className="form-step-heading"><span>01</span><div><h3 id="brief-step-title">Character brief</h3><p>Give the generator the silhouette, personality, and standout details that make this run recognizable.</p></div></div>
            <div className={`floating-textarea${prompt ? " is-populated" : ""}`}>
              <textarea id="character" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={480} rows={4} />
              <label className="floating-label" htmlFor="character">Describe your character</label>
            </div>
            <div className="sample-row"><span>Try a spark:</span>{samples.map((sample) => <button type="button" className="sample" key={sample} onClick={() => setPrompt(sample)}>{sample.split(" ").slice(0, 4).join(" ")}...</button>)}</div>
          </section>

          <section className="form-step" aria-labelledby="motion-step-title">
            <div className="form-step-heading"><span>02</span><div><h3 id="motion-step-title">Motion setup</h3><p>Start with the one action that best introduces the character in-game.</p></div></div>
            <div className="controls-grid"><label><span>Art style</span><select value={style} onChange={(event) => setStyle(event.target.value)}>{styleOptions.map((option) => <option key={option}>{option}</option>)}</select></label><label><span>First animation</span><select value={action} onChange={(event) => setAction(event.target.value)}>{actionOptions.map((option) => <option key={option}>{option}</option>)}</select></label><fieldset><legend>Frames</legend><div className="segment-control">{frameOptions.map((option) => <button type="button" className={frames === option ? "selected" : ""} key={option} onClick={() => setFrames(option)}>{option}</button>)}</div></fieldset></div>
            <div className="run-summary"><span>This run will create</span><b>{frames}-frame {style} sheet</b><small>{action} is the first animation.</small></div>
          </section>

          <section className="form-step form-step-export" aria-labelledby="export-step-title">
            <div className="form-step-heading"><span>03</span><div><h3 id="export-step-title">Generate and review</h3><p>Review the output, then download a PNG with green removed and matching sprite metadata.</p></div></div>
            <button className="button button-generate" disabled={status === "working" || !prompt.trim() || !user || !authReady} type="submit">{status === "working" ? <><span className="spinner" /> Rendering your sprites...</> : !authReady ? "Checking sign-in..." : !user ? "Sign in above to generate" : !prompt.trim() ? "Describe a character to generate" : <><SparkleIcon /> Generate this run <ArrowIcon /></>}</button>
            {error && <p className="form-error" role="alert">{error}</p>}
            <p className="fine-print">By generating, you agree not to request content that violates our usage rules.</p>
          </section>
        </form>
      </section>

      <section className="run-review shell" id="run-review" aria-live="polite" aria-labelledby="review-title">
        <div className="run-review-heading"><div><div className="eyebrow"><span /> Run review</div><h2 id="review-title">{generation ? <>Your sheet is <em>ready.</em></> : <>The review desk <em>is waiting.</em></>}</h2></div><p>{generation ? "Inspect the result, then take both files with you." : "Your generated sheet, PNG export, and matching JSON will appear here."}</p></div>
        <div className="run-review-grid">
          {generation ? (
            <div className="result-card">
              <div className="result-top"><div><span className="status-dot" /> Chroma key ready for export</div><span>{new Date(generation.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
              <div className="result-image checker">
                {/* The image is an in-memory generated data URL and must retain its natural pixels for the export canvas. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={generation.image} alt={`Generated ${generation.action} sprite sheet for ${generation.prompt}`} />
              </div>
              <div className="result-bottom"><div><b>{generation.frames} frames</b><span>{generation.style} &middot; {generation.action}</span></div><div className="download-actions"><button type="button" onClick={downloadMetadata}>JSON</button><button type="button" onClick={downloadImage}><DownloadIcon /> PNG</button></div></div>
            </div>
          ) : <div className="empty-result"><div className="empty-stars">✦ ✧ · ✦</div><h3>Your next character appears here.</h3><p>Finish the brief above and the studio will return an original, exportable sprite sheet.</p></div>}

          <aside className="run-log" aria-label="Recent sheets on this browser">
            <div className="run-log-heading"><div><b>Recent sheets</b><span>Only on this browser</span></div>{runLog.length > 0 && <button type="button" onClick={clearRunHistory}>Clear</button>}</div>
            {runLog.length > 0 ? <div className="run-log-list">{runLog.map((run) => <button className="run-log-item" type="button" onClick={() => loadRun(run)} key={run.id}><span>{run.name}</span><small>{run.frames} frames · {run.action}</small></button>)}</div> : <p>When you generate a sheet, its image, brief, and settings stay here on this browser for later review and export.</p>}
          </aside>
        </div>
      </section>

      <SiteFooter actionHref="#sign-in" actionLabel="Back to sign in" />
    </main>
  );
}
