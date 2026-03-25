# HTML Video Builder — Component Library

Complete CSS for all reusable UI components used in the video builder pattern.

---

## Base Setup (Always Include)

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700;800&display=swap');

:root {
  --bg: #010409;
  --surface: #0d1117;
  --border: #21262d;
  --text: #c9d1d9;
  --muted: #6e7681;
  --blue: #58a6ff;
  --green: #7ee787;
  --red: #ff7b72;
  --purple: #d2a8ff;
  --pink: #f778ba;
  --yellow: #e3b341;
  --mono: 'JetBrains Mono', monospace;
  --sans: 'Space Grotesk', sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  overflow: hidden;
  width: 1280px;
  height: 720px;
}
```

---

## Scene Container

```css
.scene {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.97);
  transition: opacity 0.8s ease, transform 0.8s ease;
  padding: 48px;
}
.scene.active {
  opacity: 1;
  transform: scale(1);
}
```

---

## Hero Typography

```css
/* Animated gradient title */
.hero-title {
  font-size: 72px;
  font-weight: 800;
  letter-spacing: -3px;
  line-height: 1;
  background: linear-gradient(135deg, var(--blue) 0%, var(--green) 40%, var(--purple) 80%, var(--pink) 100%);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: gradShift 5s ease infinite;
  text-align: center;
}

/* Subtitle / tagline */
.subtitle {
  font-family: var(--mono);
  font-size: 18px;
  color: var(--muted);
  margin-top: 20px;
  text-align: center;
  letter-spacing: 0.5px;
}

/* Hero emoji / icon */
.hero-emoji {
  font-size: 96px;
  margin-bottom: 24px;
  animation: heroFloat 3s ease-in-out infinite;
  filter: drop-shadow(0 0 40px rgba(88,166,255,0.2));
}
```

---

## Scene Label (Top-Right Corner)

```css
.scene-label {
  position: absolute;
  top: 28px;
  right: 32px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--border);
  letter-spacing: 2px;
  text-transform: uppercase;
}
```

---

## Stat Cards

```css
.stat-row {
  display: flex;
  gap: 48px;
  margin-top: 40px;
}
.stat {
  text-align: center;
}
.stat-number {
  font-family: var(--mono);
  font-size: 56px;
  font-weight: 800;
  color: var(--red);
  line-height: 1;
}
.stat-number.green { color: var(--green); }
.stat-number.blue { color: var(--blue); }
.stat-number.purple { color: var(--purple); }
.stat-label {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--muted);
  margin-top: 8px;
  letter-spacing: 1px;
  text-transform: uppercase;
}
```

---

## Terminal / Code Block

```css
.terminal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  width: 100%;
  max-width: 900px;
}
.terminal-bar {
  background: #161b22;
  border-bottom: 1px solid var(--border);
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.terminal-dots {
  display: flex;
  gap: 6px;
}
.terminal-dots span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.dot-r { background: #ff5f57; }
.dot-y { background: #febc2e; }
.dot-g { background: #28c840; }
.terminal-title {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
}
.terminal-body {
  padding: 20px;
  font-family: var(--mono);
  font-size: 15px;
  line-height: 1.7;
  min-height: 180px;
  white-space: pre-wrap;
}
.terminal-body.red { color: var(--red); }
.terminal-body.green { color: var(--green); }
.terminal-body.blue { color: var(--blue); }
```

---

## Badges

```css
.badge {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 6px;
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
}
.badge-critical { background: var(--red); color: #fff; }
.badge-blocked  { background: var(--green); color: #000; }
.badge-warning  { background: var(--yellow); color: #000; }
.badge-info     { background: var(--blue); color: #000; }
```

---

## Detection / Feature Cards

```css
/* Used for "what we caught" style cards */
.detect-grid {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 1100px;
  margin-top: 20px;
}
.detect-card {
  flex: 1;
  background: rgba(218, 54, 51, 0.06);
  border: 1px solid rgba(218, 54, 51, 0.25);
  border-radius: 12px;
  padding: 16px;
}
/* Green variant for "protected" cards */
.detect-card.green {
  background: rgba(126, 231, 135, 0.06);
  border-color: rgba(126, 231, 135, 0.25);
}
.detect-type {
  font-family: var(--mono);
  font-size: 13px;
  font-weight: 700;
  color: var(--red);
  margin-bottom: 6px;
}
.detect-card.green .detect-type { color: var(--green); }
.detect-detail {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--muted);
  line-height: 1.5;
}
.detect-conf {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--blue);
  margin-top: 8px;
  font-weight: 600;
}
```

---

## CTA Button

```css
.cta-btn {
  display: inline-block;
  margin-top: 32px;
  padding: 16px 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--blue), var(--green));
  color: #000;
  font-family: var(--mono);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-decoration: none;
  animation: ctaPulse 2s ease-in-out infinite;
}
```

---

## Split Layout (Side-by-Side)

```css
.split {
  display: flex;
  gap: 20px;
  width: 100%;
  max-width: 1100px;
}
.split > div { flex: 1; }
```

---

## Brand Tag (Bottom Attribution)

```css
.brand-tag {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--muted);
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.brand-tag span { color: var(--blue); }
```

---

## Progress Bar

```css
.progress-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--blue), var(--green), var(--purple));
  transition: width 0.8s ease;
  z-index: 100;
  width: 0%;
}
```

---

## Reveal System

```css
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease, transform 0.6s ease;
}
.reveal.show {
  opacity: 1;
  transform: translateY(0);
}
/* Stagger delays */
.reveal-d1 { transition-delay: 0.2s; }
.reveal-d2 { transition-delay: 0.4s; }
.reveal-d3 { transition-delay: 0.6s; }
.reveal-d4 { transition-delay: 0.8s; }
.reveal-d5 { transition-delay: 1.0s; }
```

---

## Typing Cursor

```css
.cursor {
  display: inline-block;
  width: 2px;
  height: 1em;
  background: var(--blue);
  margin-left: 2px;
  animation: blink 0.8s step-end infinite;
  vertical-align: text-bottom;
}
@keyframes blink { 50% { opacity: 0; } }
```

---

## Scan Circle / Spinner

```css
.scan-circle {
  width: 80px;
  height: 80px;
  border: 3px solid var(--blue);
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 0.8s linear infinite;
  margin-bottom: 20px;
}
```
