---
name: html-video-builder
description: >
  Create cinematic, screen-recordable HTML "videos" — self-contained single-file HTML presentations
  that auto-advance through scenes like a video, with rich animations, typewriter effects, staggered
  reveals, and a dark premium aesthetic. Use this skill when the user wants to create a product demo
  video, explainer video, marketing video, or animated presentation that can be screen-recorded. Also
  trigger when asked to build "animated HTML slides", "HTML video", "scene-based animation", 
  "auto-playing presentation", or any promotional/demo content with cinematic transitions.
  Always use this skill for Enkrypt AI product demos, marketing explainers, or any video-format
  deliverable — even if the user just says "make a video about X" without specifying HTML.
---

# HTML Video Builder Skill

Build a **single-file HTML "video"** — fixed at 1280×720px, auto-advancing through scenes, 
screen-recordable. No frameworks, no dependencies, pure HTML/CSS/JS.

## When to Use This Skill

- "Make a video about X"
- "Create a product demo for Y"
- "Build an animated explainer for Z"
- "HTML slides that auto-play"
- Any Enkrypt AI marketing / product demo content
- Screen-recordable animated presentations

---

## Architecture: The Scene Sequencer Pattern

```
body (1280×720, overflow:hidden)
 ├── .grid-bg          ← animated CSS grid (persistent bg layer)
 ├── .orb ×3           ← ambient glow blobs (persistent bg layer)
 ├── .progress-bar     ← bottom progress strip
 └── .scene ×N         ← all scenes stacked absolutely, one active at a time
```

Each `<div class="scene" id="sN">` is `position:absolute; inset:0`. Only `.active` is visible. 
The JS timer cycles through them like video frames.

---

## 5 Animation Layers (Always Include All 5)

### Layer 1: Scene Transitions
```css
.scene {
  position: absolute; inset: 0;
  opacity: 0; transform: scale(0.97);
  transition: opacity 0.8s ease, transform 0.8s ease;
}
.scene.active { opacity: 1; transform: scale(1); }
```

### Layer 2: Staggered Reveals (Elements within a scene)
```css
.reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.6s ease, transform 0.6s ease; }
.reveal.show { opacity: 1; transform: translateY(0); }
.reveal-d1 { transition-delay: 0.2s; }
.reveal-d2 { transition-delay: 0.4s; }
.reveal-d3 { transition-delay: 0.6s; }
.reveal-d4 { transition-delay: 0.8s; }
.reveal-d5 { transition-delay: 1.0s; }
```
JS triggers `.show` 200ms after scene becomes active:
```js
setTimeout(() => el.querySelectorAll('.reveal').forEach(r => r.classList.add('show')), 200);
```

### Layer 3: Background Ambiance (Always-on)
```css
/* Drifting grid */
.grid-bg {
  position: fixed; inset: 0; opacity: 0.025;
  background-image: linear-gradient(var(--blue) 1px, transparent 1px),
                    linear-gradient(90deg, var(--blue) 1px, transparent 1px);
  background-size: 48px 48px;
  animation: gridDrift 25s linear infinite;
}
@keyframes gridDrift { to { background-position: 48px 48px; } }

/* Glow orbs */
.orb { position: fixed; border-radius: 50%; filter: blur(100px); pointer-events: none;
  animation: orbFloat 12s ease-in-out infinite alternate; }
.orb-1 { width:400px; height:400px; background:rgba(88,166,255,0.08); top:-100px; left:-100px; }
.orb-2 { width:350px; height:350px; background:rgba(218,54,51,0.06); bottom:-80px; right:-80px; animation-delay:-6s; }
.orb-3 { width:300px; height:300px; background:rgba(126,231,135,0.05); top:50%; left:50%;
         transform:translate(-50%,-50%); animation-delay:-3s; }
@keyframes orbFloat {
  0% { transform: translate(0,0) scale(1); }
  100% { transform: translate(30px,-20px) scale(1.15); }
}
```

### Layer 4: Typewriter Effect
```js
function typeText(elementId, text, color) {
  const el = document.getElementById(elementId);
  el.textContent = '';
  if (color) el.style.color = color;
  let i = 0;
  const iv = setInterval(() => {
    el.textContent = text.slice(0, ++i);
    if (i >= text.length) clearInterval(iv);
  }, 18); // ~55 chars/sec — feels natural
}
```
Call inside the scene sequencer's `if (idx === N)` block.

### Layer 5: Element Micro-Animations
```css
/* Animated gradient text */
.hero-title {
  background: linear-gradient(135deg, var(--blue) 0%, var(--green) 40%, var(--purple) 80%, var(--pink) 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradShift 5s ease infinite;
}
@keyframes gradShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

/* Floating emoji / logo */
@keyframes lobsterBob {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25%       { transform: translateY(-12px) rotate(-3deg); }
  75%       { transform: translateY(-8px) rotate(3deg); }
}

/* CTA pulse ring */
@keyframes ctaPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(88,166,255,0.4); }
  50%       { box-shadow: 0 0 0 12px rgba(88,166,255,0); }
}

/* Scan spinner */
.scan-circle {
  width:80px; height:80px; border:3px solid var(--blue);
  border-radius:50%; border-top-color:transparent;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
```

---

## Scene Sequencer JS (Core Engine)

The scenes array and durations are **fully dynamic** — populate them based on however many scenes the content needs. No fixed length.

```js
// scenes and durations are CONTENT-DRIVEN — as many as needed
const scenes = ['s1','s2', /* ... sN */];
const durations = [4000, 5000, /* one value per scene, tuned to content density */];
let current = 0;
let autoplay = true;

function showScene(idx) {
  scenes.forEach((id, i) => {
    const el = document.getElementById(id);
    el.classList.toggle('active', i === idx);
    if (i === idx) {
      setTimeout(() => el.querySelectorAll('.reveal').forEach(r => r.classList.add('show')), 200);
    } else {
      el.querySelectorAll('.reveal').forEach(r => r.classList.remove('show'));
    }
  });
  // Progress bar
  document.getElementById('progress').style.width = `${((idx+1)/scenes.length)*100}%`;

  // Scene-specific side effects — add as many as needed
  // if (idx === N) typeText('terminal-id', 'your text here', 'var(--red)');
  // if (idx === M) runScanSteps();
  // if (idx === P) countUp('stat-id', 36, 1200, '%');
}

function advance() {
  current = (current + 1) % scenes.length;
  showScene(current);
  if (autoplay) setTimeout(advance, durations[current]);
}

// Keyboard controls for manual stepping / screen recording
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === ' ') {
    autoplay = false; current = Math.min(current+1, scenes.length-1); showScene(current);
  }
  if (e.key === 'ArrowLeft') {
    autoplay = false; current = Math.max(current-1, 0); showScene(current);
  }
  if (e.key === 'a') { autoplay = true; setTimeout(advance, durations[current]); }
});

// Start
showScene(0);
setTimeout(advance, durations[0]);
```

---

## Design System (Dark Premium)

### Colors (CSS vars)
```css
:root {
  --bg: #010409;        /* deepest background */
  --surface: #0d1117;   /* card/terminal bg */
  --border: #21262d;    /* subtle borders */
  --text: #c9d1d9;      /* body text */
  --muted: #6e7681;     /* secondary text */
  --blue: #58a6ff;      /* primary accent */
  --green: #7ee787;     /* success/protected */
  --red: #ff7b72;       /* danger/attack */
  --purple: #d2a8ff;    /* highlight */
  --pink: #f778ba;      /* accent */
  --yellow: #e3b341;    /* warning */
}
```
Inspired by GitHub Dark. Palette is battle-tested for dark cybersecurity aesthetic.

### Typography
```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
--mono: 'JetBrains Mono', monospace;  /* data, terminals, badges, labels */
--sans: 'Space Grotesk', sans-serif;  /* headings, body, hero text */
```

### Common Components → see references/components.md

---

## Creative Freedom — Go Beyond the Template

The ClawPatrol video is a starting point, not a ceiling. The scene sequencer pattern supports any visual treatment. Push it:

### Background Variations
- **Particle field** — canvas-based floating dots with JS
- **Hexagon grid** — SVG pattern instead of square grid
- **Noise / grain** — CSS filter or SVG feTurbulence for film grain
- **Radial pulse** — expanding ring animations from center (great for "scanning")
- **Code rain** — Matrix-style falling characters on canvas
- **Geometric shapes** — rotating polygons as persistent bg layer

### Scene Layout Variations
- **Full-bleed visual + overlay** — full scene filled with bg, text on top
- **3-column comparison** — 3 equal panels side by side
- **Timeline horizontal** — dots on a line, revealing sequentially
- **Chat bubbles** — conversation format, bubbles appear one by one
- **Network graph** — SVG nodes and edges with animated connection paths
- **Progress / gauge** — animated arc or bar filling up
- **Diff view** — red/green line-by-line code comparison (before/after)
- **Split hero** — text left, animated visual right

### Animation Ideas Beyond the Defaults
- **Morphing SVG shapes** — path `d` attribute interpolation
- **Particle burst** — exploding dots on a key reveal moment
- **Glitch effect** — text clip/translate offset for cyberpunk feel
- **Wipe transition** — `clip-path` animating instead of opacity for scene change
- **Number morphing** — digits rolling like a slot machine
- **Draw-on SVG** — `stroke-dashoffset` animation to "draw" a diagram path live
- **Typewriter with delete** — type, pause, backspace, retype (for demo corrections)
- **Parallax layers** — bg element moves at different speed during transition

### Color Palette Flexibility
Default dark palette suits security/dev content. Adapt freely:
- **Light / product UI** — white bg, dark text, colorful accents
- **Brand match** — pull directly from the product's actual brand colors
- **Single neon accent** — pure black + pure white + one electric color
- **Deep space** — `background: linear-gradient(135deg, #050510, #1a0a2e)`

**The rule: never let the template constrain the story. If the content needs a new component, layout, or animation — build it from scratch.**

---

## Reusable Scene Templates

### Title Scene
```html
<div class="scene" id="s1">
  <div class="hero-emoji">🦞</div>
  <div class="hero-title">Product Name</div>
  <div class="subtitle">Tagline goes here.</div>
  <div class="brand-tag">Built by <span>Company</span> · tagline</div>
</div>
```

### Stats Scene
```html
<div class="scene" id="s3">
  <div class="scene-label">By The Numbers</div>
  <div class="stat-row">
    <div class="stat reveal">
      <div class="stat-number red">36%</div>
      <div class="stat-label">description<br>line 2</div>
    </div>
    <!-- more stats with reveal-d1, reveal-d2 -->
  </div>
</div>
```

### Terminal Scene (Typewriter)
```html
<div class="terminal reveal reveal-d2">
  <div class="terminal-bar">
    <div class="terminal-dots">
      <span class="dot-r"></span><span class="dot-y"></span><span class="dot-g"></span>
    </div>
    <div class="terminal-title">title here</div>
  </div>
  <div class="terminal-body" id="terminal-text-id"></div>
</div>
```
Then in JS sequencer: `if (idx === N) typeText('terminal-text-id', 'text...');`

### Scan/Loading Scene
```html
<div class="scene" id="sN">
  <div class="scan-circle"></div>
  <div>Scanning...</div>
  <div id="scan-step">Tokenizing input...</div>
</div>
```
```js
function runScanSteps() {
  const steps = ['Tokenizing input...', 'Pattern matching...', 'Verdict: BLOCKED ✓'];
  steps.forEach((s,i) => setTimeout(() => { document.getElementById('scan-step').textContent = s; }, i*550));
}
```

### Grid Cards Scene (Attack vectors, features, etc.)
```html
<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px; width:100%; max-width:900px;">
  <div class="reveal" style="background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:18px; text-align:center;">
    <div style="font-size:32px; margin-bottom:8px;">📧</div>
    <div style="font-weight:700; font-size:14px;">Feature Name</div>
    <div style="color:var(--muted); font-size:11px; font-family:var(--mono); margin-top:4px;">subtitle detail</div>
  </div>
  <!-- add reveal-d1, reveal-d2, etc. for stagger -->
</div>
```

### CTA Scene
```html
<div class="scene" id="s9">
  <div class="hero-emoji">🛡️</div>
  <div class="hero-title" style="font-size:56px;">Your CTA Title</div>
  <div class="subtitle">Supporting line.</div>
  <a class="cta-btn" href="#">Try It →</a>
</div>
```

---

## Scene Planning — Content Drives Everything

**There is no scene count limit.** The number of scenes, their duration, layout, and animation style should all be derived from what the content needs to say — not from a template count. A tight product teaser might be 4 scenes. A full feature walkthrough could be 15–20. A comparison demo might need 3 parallel scenes followed by 6 detail scenes. Follow the narrative.

### Planning Questions (answer these before writing code)
1. **What is the story arc?** Map it out: hook → problem → proof → solution → CTA (or whatever arc fits)
2. **How many beats does the story need?** Each distinct idea, stat, demo step, or reveal = one scene
3. **What does each scene need to *do*?** Just display? Type something out? Step through stages? Flash danger? Compare two states?
4. **How long does each scene need to breathe?** Fast punchy facts = 3–4s. Demo walkthroughs = 5–7s. Complex comparisons = 6–8s. Pure impact moments = 2–3s.
5. **What's the visual personality?** Dark terminal? Bright product UI? Split before/after? Data-heavy grid? Cinematic hero moments?
6. **Which scenes need interactive animations?** (typewriter, scan steps, count-up numbers, progress steppers, animated paths)

### Scene Archetypes — Mix Freely
| Archetype | Best For | Typical Duration |
|---|---|---|
| **Hero / Title** | Opening, section intros | 3–5s |
| **Problem Statement** | 1–2 punchy sentences with staggered reveal | 4–5s |
| **Stats / Numbers** | 2–4 big metrics, count-up animation | 4–6s |
| **Terminal / Code** | Attack demos, API calls, CLI output — typewriter effect | 5–7s |
| **Before / After Split** | Comparing unprotected vs protected, old vs new | 5–7s |
| **Scan / Loading** | Transition between demo states, building suspense | 2–4s |
| **Detection Cards** | Listing catches, features, results — staggered grid | 5–7s |
| **Feature Grid** | 6–12 items in a card grid, cascade reveal | 5–8s |
| **Timeline / Steps** | Sequential process, onboarding, how-it-works | 5–8s |
| **Quote / Testimonial** | Social proof, bold statement | 3–5s |
| **Diagram / Flow** | Architecture, data flow, system map (use SVG inline) | 6–8s |
| **CTA / Closing** | Final ask, logo, link | 4–6s |

### Timing Philosophy
- **Dense content** (lots of text, complex terminal output) → longer scene duration
- **Impact moments** (single stat, single quote, single emoji) → shorter, punchier
- **Transition scenes** (scan, loading) → shortest (2–3s)
- **Demo walkthroughs** → err on the side of longer, viewer needs time to read
- Build the `durations[]` array to match the content rhythm, not a fixed formula

## Output Format

Always produce a single self-contained `.html` file, 1280×720px, with:
- All CSS inline in `<style>`
- All JS inline in `<script>` at bottom
- No external dependencies except Google Fonts CDN
- Keyboard controls: ← → Space (manual step), `a` (resume autoplay)
- Progress bar at bottom

## Reference Files

- `references/components.md` — Full CSS for all reusable components (terminal, badges, stat cards, CTA button, detect cards, split layout)
- `references/animation-library.md` — All named `@keyframes` with usage notes
