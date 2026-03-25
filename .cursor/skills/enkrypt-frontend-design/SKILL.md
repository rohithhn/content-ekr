---
name: enkrypt-frontend-design
description: >
  Production-grade Enkrypt AI branded UI for landing pages, static/HTML artifacts,
  marketing components, dashboards, and product screens. Enforces the official
  orange-to-pink gradient, Inter typography, correct light/dark logo variants, and
  outline icon rules while allowing creative layout, background patterns, motion,
  and composition when contrast and readability stay WCAG-aligned. Use when the user
  asks for Enkrypt-branded frontend, landing pages, themed artifacts, or hero/CTA design.
---

# Enkrypt AI frontend design

Design **production-grade, brand-consistent** interfaces for **Enkrypt AI** (AI security). The feel: modern, minimal, trustworthy, premium.

## Alignment with this repo (Content Studio brands)

### Bundled Enkrypt lockups (landing export)

Served from **`content-studio/public/brand/`** (use with the app origin, e.g. `https://your-deployment/brand/...`):

| File | Use |
|------|-----|
| `enkrypt-logo-dark-bg.png` | **Dark page background** — white “enkryptAI” wordmark + gradient icon |
| `enkrypt-logo-light-bg.png` | **Light page background** — dark wordmark + gradient icon |

`buildLandingPageHtml` injects the sticky header and swaps these with `data-theme` (or uses `brand.logos.dark` / `brand.logos.primary` when set). Pass `{ assetBaseUrl: window.location.origin }` in the browser so image URLs resolve in preview and blob-open flows.

### Brand JSON (`logos.primary`, `logos.dark`)

| UI background | Logo field | Typical asset |
|---------------|------------|----------------|
| Light (`data-theme="light"`, white/neutral sections) | **`logos.primary`** | Dark / full-color wordmark (reads on light) |
| Dark (`data-theme="dark"`, `#0D0D0F`-style sections) | **`logos.dark`** | **Light / white** wordmark for dark backgrounds |

**Rule:** Toggle `src` with theme — never use the light-background logo on a dark hero or vice versa. If only one URL exists, the landing template falls back to bundled Enkrypt PNGs when the brand name matches Enkrypt.

---

## Brand gradient (single source of truth)

```
LINEAR: #FF7404 (0%) → #FF3BA2 (100%)
Default direction: left → right (90deg). Use other angles only for accents (e.g. 135deg).
```

**Use for:** primary CTAs, key badges/pills/tags, emphasis chips, important icons or accent shapes, active/selected states, decorative brand geometry.

**Do not:** use other gradients (purple/blue/rainbow) as brand substitutes; flood the full viewport with brand gradient; place gradient text on gradient backgrounds; use low-contrast brand-on-brand.

**On gradient surfaces:** text and icons **#FFFFFF** only.

---

## Logo usage (light and dark)

Enkrypt ships **two logo variants**. Prefer user-supplied URLs; otherwise reference brand assets.

| Mode | Variant | When |
|------|---------|------|
| Light | Dark / primary mark | White or light neutral backgrounds |
| Dark | Light / inverted mark | Dark backgrounds (`#0D0D0F`, `#111`, etc.) |

**CSS variable pattern:**

```css
:root[data-theme="light"] {
  --logo-url: var(--brand-logo-primary); /* logos.primary */
}
:root[data-theme="dark"] {
  --logo-url: var(--brand-logo-dark);   /* logos.dark */
}
```

**HTML + JS pattern:**

```html
<img id="logo" src="" alt="Enkrypt AI" />
<script>
  const primary = 'PRIMARY_LOGO_URL'; // light bg
  const darkMode = 'DARK_LOGO_URL';   // dark bg
  function applyTheme(isDark) {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.getElementById('logo').src = isDark ? darkMode : primary;
  }
</script>
```

---

## Color system

```css
:root {
  --brand-gradient: linear-gradient(90deg, #FF7404 0%, #FF3BA2 100%);
  --brand-start: #FF7404;
  --brand-end: #FF3BA2;

  --bg-primary: #FFFFFF;
  --bg-secondary: #F7F7F8;
  --bg-tertiary: #F0F0F2;
  --surface: #FFFFFF;
  --surface-elevated: #FFFFFF;
  --border: #E8E8EC;
  --border-subtle: #F0F0F2;

  --text-primary: #111111;
  --text-secondary: #555555;
  --text-tertiary: #888888;
  --text-on-gradient: #FFFFFF;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.10);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
  --shadow-gradient: 0 4px 20px rgba(255,116,4,0.25);
}

[data-theme="dark"] {
  --bg-primary: #0D0D0F;
  --bg-secondary: #141417;
  --bg-tertiary: #1C1C20;
  --surface: #18181C;
  --surface-elevated: #222228;
  --border: #2A2A32;
  --border-subtle: #222228;

  --text-primary: #F2F2F4;
  --text-secondary: #A0A0AA;
  --text-tertiary: #6B6B78;
  --text-on-gradient: #FFFFFF;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 16px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 32px rgba(0,0,0,0.5);
  --shadow-gradient: 0 4px 24px rgba(255,59,162,0.30);
}
```

---

## Typography (Inter)

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }

.heading-xl  { font-size: 48px; font-weight: 700; line-height: 1.1; letter-spacing: -0.03em; }
.heading-lg  { font-size: 36px; font-weight: 700; line-height: 1.15; letter-spacing: -0.025em; }
.heading-md  { font-size: 28px; font-weight: 600; line-height: 1.2; letter-spacing: -0.02em; }
.heading-sm  { font-size: 22px; font-weight: 600; line-height: 1.3; }
.subheading  { font-size: 18px; font-weight: 500; line-height: 1.5; }
.body-lg     { font-size: 16px; font-weight: 400; line-height: 1.65; }
.body-sm     { font-size: 14px; font-weight: 400; line-height: 1.6; }
.caption     { font-size: 12px; font-weight: 500; line-height: 1.5; letter-spacing: 0.01em; }
.label       { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
```

---

## Primary CTA

```css
.cta-primary {
  background: linear-gradient(90deg, #FF7404 0%, #FF3BA2 100%);
  color: #FFFFFF;
  font-weight: 600;
  font-size: 15px;
  padding: 14px 28px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(255, 116, 4, 0.30), 0 1px 3px rgba(0,0,0,0.1);
  transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  position: relative;
  overflow: hidden;
}
.cta-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(255, 116, 4, 0.40), 0 2px 6px rgba(0,0,0,0.12);
  filter: brightness(1.05);
}
.cta-primary:active {
  transform: translateY(0);
  filter: brightness(0.97);
}

.cta-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 1.5px solid var(--border);
  padding: 13px 26px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 15px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.cta-secondary:hover {
  border-color: #FF7404;
  background: rgba(255, 116, 4, 0.04);
}
```

---

## Icon system

- **Style:** Lucide, Heroicons, or equivalent **outline** / minimal; stroke **1.5px**; sizes 16 / 20 / 24 / 32px by context.
- **On gradient:** white `#FFFFFF`.
- **On light:** `#555555` / `#888888`; **on dark:** `#A0A0AA` / `#6B6B78`.
- **Avoid:** 3D, emoji-as-icons, heavy filled sets, mixed stroke weights.

---

## Layout (creative latitude + hard contrast rules)

**Encouraged:** asymmetric grids, diagonal sections, overlap, strong negative space or intentional density, subtle noise/mesh accents, bento grids, split heroes, glass cards on dark with brand border accents, low-opacity brand orbs in backgrounds.

**Non-negotiable:**

- No dark-on-dark or light-on-light body text.
- No brand gradient UI that disappears into similar orange/pink backgrounds.
- Target **WCAG AA:** ~4.5:1 text, ~3:1 UI components.

**Quick contrast:**

- Light bg: text `#111` / secondary `#555`; gradient accents must read clearly.
- Dark bg: text `#F2F2F4` / secondary `#A0A0AA`.
- Gradient band: only **white** text and icons.

---

## Motion

```css
--transition-fast: 0.12s ease;
--transition-base: 0.20s ease;
--transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-in { animation: fadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both; }
```

Use purposeful, short transitions; optional subtle gradient shimmer for loading states only if it stays on-brand.

---

## Theme toggle (logos stay in sync)

```javascript
const root = document.documentElement;
const logo = document.getElementById('logo');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
let isDark = localStorage.getItem('enkrypt-theme')
  ? localStorage.getItem('enkrypt-theme') === 'dark'
  : prefersDark;

function applyTheme() {
  root.dataset.theme = isDark ? 'dark' : 'light';
  if (logo) logo.src = isDark ? DARK_MODE_LOGO_URL : LIGHT_BG_LOGO_URL;
  localStorage.setItem('enkrypt-theme', isDark ? 'dark' : 'light');
}
// Call applyTheme on load and on toggle
```

Map `LIGHT_BG_LOGO_URL` → `logos.primary`, `DARK_MODE_LOGO_URL` → `logos.dark` when sourcing from Content Studio brand data.

---

## Component snippets

**Brand pill**

```html
<span class="badge-brand">New</span>
<style>
.badge-brand {
  background: linear-gradient(90deg, #FF7404, #FF3BA2);
  color: #FFFFFF;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 100px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
</style>
```

**Card + gradient border accent**

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.card-accent {
  border: 1px solid transparent;
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    linear-gradient(90deg, #FF7404, #FF3BA2) border-box;
}
```

**Input focus ring (brand)**

```css
.input:focus {
  outline: none;
  border-color: #FF7404;
  box-shadow: 0 0 0 3px rgba(255, 116, 4, 0.12);
}
```

---

## Pre-flight checklist

- [ ] Only **#FF7404 → #FF3BA2** for brand gradient (no substitute gradients).
- [ ] **Light bg → primary logo**; **dark bg → dark-variant (light) logo**.
- [ ] Contrast checked for all text/controls.
- [ ] Primary CTA = full gradient + shadow + hover/active.
- [ ] **Inter** loaded and applied.
- [ ] Theme toggle updates **both** `data-theme` and **logo `src`**.
- [ ] Icons consistent stroke/weight.
- [ ] Responsive where the artifact is web-facing.

---

## Design directions (pick one, execute fully)

1. **Glassmorphic dark** — deep bg, frosted cards, gradient atmosphere, light logo.  
2. **Editorial light** — white space, sharp type, dark logo, gradient as accent.  
3. **Bento dashboard** — information grid, gradient for status/highlights.  
4. **Split gradient hero** — half neutral / half gradient, asymmetric type.  
5. **Minimal terminal** — dark + monospace touches, single gradient focal.  
6. **Magazine grid** — overlap, editorial type, gradient as photo overlay.

---

## Minimal HTML shell (landing / artifact)

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Enkrypt AI</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
    }
    /* + paste :root / [data-theme="dark"] tokens above */
  </style>
</head>
<body>
  <!-- content -->
  <script>/* theme + logo sync */</script>
</body>
</html>
```

---

## Out of scope

- Non-Enkrypt brands (use their tokens instead).
- AI **generated social images** where the prompt forbids drawing the logo (designer image pipeline) — this skill is for **UI and marketing frontends**, not that bitmap rule.
- Replacing product data models; only map logos to existing `logos.primary` / `logos.dark` when integrating.
