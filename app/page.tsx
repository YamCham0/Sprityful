import Image from "next/image";

const showcaseSpriteUrl = "/showcase/nova-runner-spritesheet.png";

function SparkleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.95 6.05L20 10l-6.05 1.95L12 18l-1.95-6.05L4 10l6.05-1.95L12 2Z" fill="currentColor" /><path d="M19 16l.74 2.26L22 19l-2.26.74L19 22l-.74-2.26L16 19l2.26-.74L19 16Z" fill="currentColor" /></svg>;
}

function ArrowIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function DownloadIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18v2h14v-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function GridIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" /><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.7" /></svg>;
}

export default function Home() {
  return (
    <main>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <nav className="nav shell" aria-label="Main navigation">
        <a className="brand" href="#top" aria-label="Sprityful home"><span className="brand-mark"><Image src="/blue-fire-sprite.png" alt="" width={30} height={30} /></span>Sprityful</a>
        <div className="nav-links"><a href="#how-it-works">How it works</a><a href="#showcase">Showcase</a></div>
        <a className="button button-small" href="/studio#sign-in">Sign in <ArrowIcon /></a>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy"><div className="eyebrow"><span /> Prompt to playable assets</div><h1>Give your game a<br /><em>real cast.</em></h1><p>Sprityful turns a character idea into original pixel-art animation sheets you can actually use. Sign in, describe the hero, and take the PNG with you.</p><div className="hero-actions"><a className="button button-primary" href="/studio"><SparkleIcon /> Open the sprite studio</a><a className="text-link" href="#showcase">See a real output <ArrowIcon /></a></div><div className="trust-row"><div className="stacked-avatars" aria-hidden="true"><i>✦</i><i>⌁</i><i>◒</i></div><span>Made for tiny teams with big worlds.</span></div></div>
        <div className="hero-art" aria-label="Example generated pixel art sprite sheet"><div className="hero-art-topline"><span>CHARACTER / NOVA</span><span>4 FRAMES</span></div><div className="grid-noise" /><Image className="hero-sheet" src={showcaseSpriteUrl} alt="Original space ranger pixel-art animation sprite sheet" width={1792} height={896} priority /><div className="stat-card stat-card-one"><b>4</b><span>animation poses</span></div><div className="stat-card stat-card-two"><b>PNG</b><span>ready to export</span></div><div className="art-orbit orbit-a" /><div className="art-orbit orbit-b" /></div>
      </section>

      <section className="strip shell" id="how-it-works" aria-label="How Sprityful works"><div><span className="strip-icon"><GridIcon /></span><p><b>1. Describe</b> Bring us the character, prop, and mood.</p></div><div><span className="strip-icon"><SparkleIcon /></span><p><b>2. Generate</b> Choose the first movement and frame count.</p></div><div><span className="strip-icon"><DownloadIcon /></span><p><b>3. Export</b> Take a chroma-key PNG and sheet metadata.</p></div></section>

      <section className="showcase shell" id="showcase"><div className="showcase-copy"><div className="eyebrow"><span /> Made for lively worlds</div><h2>One character.<br /><em>A whole new game.</em></h2><p>Preview an export-ready action sheet, then open the studio when you are ready to make your own.</p><a className="button button-dark" href="/studio">Start creating <ArrowIcon /></a></div><div className="showcase-window"><div className="window-bar"><span /><span /><span /><b>preview / nova-runner.png</b></div><div className="checker"><Image src={showcaseSpriteUrl} alt="Pixel art character action-sheet showcase" width={1792} height={896} loading="eager" /></div><div className="window-footer"><span>4 character poses</span><span>export-ready sheet</span></div></div></section>

      <footer className="footer shell"><a className="brand" href="#top"><span className="brand-mark"><Image src="/blue-fire-sprite.png" alt="" width={30} height={30} /></span>Sprityful</a><p>By YamCham0</p><a className="text-link" href="/studio">Open studio <ArrowIcon /></a></footer>
    </main>
  );
}
