"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";

const samples = [
  "A tiny brass automaton librarian with a glowing amber eye and an oversized key",
  "A mossy forest guardian carrying a lantern made of moonlight",
  "A rebel sky courier in a coral flight jacket with a paper map",
];

const styleOptions = ["16-bit adventure", "Cozy fantasy", "Neon arcade", "Pocket horror"];
const actionOptions = ["Idle + run", "Walk cycle", "Attack combo", "Spell cast"];
const frameOptions = [4, 6, 8];

type Generation = {
  image: string;
  createdAt: string;
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

export default function Home() {
  const [prompt, setPrompt] = useState(samples[0]);
  const [style, setStyle] = useState(styleOptions[0]);
  const [action, setAction] = useState(actionOptions[0]);
  const [frames, setFrames] = useState(4);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [status, setStatus] = useState<"idle" | "working" | "error">("idle");
  const [error, setError] = useState("");

  const metadata = useMemo(
    () => ({
      name: "framefoundry-sprite-sheet",
      prompt,
      style,
      animation: action,
      frameCount: frames,
      layout: { columns: frames, rows: 1, cellWidth: 256, cellHeight: 256 },
      fps: action === "Idle + run" ? 8 : 10,
      transparentBackground: true,
    }),
    [action, frames, prompt, style],
  );

  function jumpToStudio() {
    document.getElementById("studio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      setGeneration({ image: data.image, createdAt: data.createdAt });
      setStatus("idle");
    } catch (requestError) {
      setStatus("error");
      setError(requestError instanceof Error ? requestError.message : "Generation did not complete.");
    }
  }

  function downloadImage() {
    if (!generation) return;
    const link = document.createElement("a");
    link.href = generation.image;
    link.download = "framefoundry-spritesheet.png";
    link.click();
  }

  function downloadMetadata() {
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "framefoundry-spritesheet.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="FrameFoundry home">
          <span className="brand-mark"><SparkleIcon /></span>
          FrameFoundry
        </a>
        <div className="nav-links">
          <a href="#process">How it works</a>
          <a href="#showcase">Showcase</a>
          <a href="#studio">Studio</a>
        </div>
        <button className="button button-small" onClick={jumpToStudio}>
          Make a sprite <ArrowIcon />
        </button>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span /> Prompt to playable assets</div>
          <h1>Give your game a<br /><em>real cast.</em></h1>
          <p>
            FrameFoundry turns a character idea into original pixel-art animation sheets you can actually use. Describe the hero, choose a motion, and take the PNG with you.
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
            src="/showcase/nova-runner-spritesheet.png"
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
        <div><span className="strip-icon"><DownloadIcon /></span><p><b>Engine friendly</b> PNG plus starter sheet metadata in one click.</p></div>
      </section>

      <section className="process shell" id="process">
        <div className="section-heading"><div className="eyebrow"><span /> A small, useful loop</div><h2>From spark to sprite<br />in <em>three moves.</em></h2></div>
        <div className="steps">
          <article className="step-card"><span className="step-number">01</span><div className="step-icon">✎</div><h3>Describe the character</h3><p>Give us the silhouette, their strange little prop, and the mood of your game.</p><div className="mini-prompt">“A turnip knight with a dented helmet…”</div></article>
          <article className="step-card"><span className="step-number">02</span><div className="step-icon">✦</div><h3>Choose a movement</h3><p>Pick the motion your scene needs first. Every output is composed as a usable sequence.</p><div className="mini-timeline"><i /><i /><i /><i /></div></article>
          <article className="step-card"><span className="step-number">03</span><div className="step-icon">↓</div><h3>Drop it into your build</h3><p>Download the transparent PNG and a matching JSON starter file for your pipeline.</p><div className="mini-file"><b>sprite-sheet</b><span>.png</span></div></article>
        </div>
      </section>

      <section className="showcase shell" id="showcase">
        <div className="showcase-copy"><div className="eyebrow"><span /> Built for lively worlds</div><h2>It begins with a<br /><em>single character.</em></h2><p>Then you give them a walk, a spell, a hurt pose, an absurd victory dance. Start with the one your game has been missing.</p><button className="button button-dark" onClick={jumpToStudio}>Make one now <ArrowIcon /></button></div>
        <div className="showcase-window"><div className="window-bar"><span /><span /><span /><b>preview / nova-runner.png</b></div><div className="checker"><Image src="/showcase/nova-runner-spritesheet.png" alt="Pixel art character action-sheet showcase" width={1792} height={896} /></div><div className="window-footer"><span>transparent background</span><span>1536 × 1024</span></div></div>
      </section>

      <section className="studio shell" id="studio">
        <div className="studio-intro"><div className="eyebrow"><span /> The sprite studio</div><h2>Let’s make<br /><em>something playable.</em></h2><p>Use the real generator below. Your image is created on demand, and stays in your browser until you download it.</p><div className="studio-note"><SparkleIcon /> Your prompt is sent securely from the server—your API key never reaches the browser.</div></div>
        <form className="generator" onSubmit={generate}>
          <label className="field-label" htmlFor="character">Character brief</label>
          <textarea id="character" value={prompt} onChange={(event) => setPrompt(event.target.value)} maxLength={480} rows={4} placeholder="A quiet cloud mechanic with moon boots..." />
          <div className="sample-row"><span>Try a spark:</span>{samples.map((sample) => <button type="button" className="sample" key={sample} onClick={() => setPrompt(sample)}>{sample.split(" ").slice(0, 4).join(" ")}…</button>)}</div>
          <div className="controls-grid">
            <label><span>Art style</span><select value={style} onChange={(event) => setStyle(event.target.value)}>{styleOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <label><span>First animation</span><select value={action} onChange={(event) => setAction(event.target.value)}>{actionOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
            <fieldset><legend>Frames</legend><div className="segment-control">{frameOptions.map((option) => <button type="button" className={frames === option ? "selected" : ""} key={option} onClick={() => setFrames(option)}>{option}</button>)}</div></fieldset>
          </div>
          <button className="button button-generate" disabled={status === "working"} type="submit">{status === "working" ? <><span className="spinner" /> Rendering your sprites…</> : <><SparkleIcon /> Generate sprite sheet <ArrowIcon /></>}</button>
          {error && <p className="form-error" role="alert">{error}</p>}
          <p className="fine-print">By generating, you agree not to request content that violates our usage rules.</p>
        </form>
      </section>

      <section className="result shell" aria-live="polite">
        {generation ? <div className="result-card"><div className="result-top"><div><span className="status-dot" /> Ready to take into your game</div><span>{new Date(generation.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div><div className="result-image checker"><img src={generation.image} alt={`Generated ${action} sprite sheet for ${prompt}`} /></div><div className="result-bottom"><div><b>{frames} frames</b><span>{style} · {action}</span></div><div className="download-actions"><button type="button" onClick={downloadMetadata}>JSON</button><button type="button" onClick={downloadImage}><DownloadIcon /> PNG</button></div></div></div> : <div className="empty-result"><div className="empty-stars">✦ ✧ · ✦</div><h3>Your next character appears here.</h3><p>Fill in a brief above and the studio will return an original, downloadable sprite sheet.</p></div>}
      </section>

      <footer className="footer shell"><a className="brand" href="#top"><span className="brand-mark"><SparkleIcon /></span>FrameFoundry</a><p>Tools for the people who still care about the little pixels.</p><a className="text-link" href="#top">Back to top <ArrowIcon /></a></footer>
    </main>
  );
}
