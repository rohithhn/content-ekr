---
name: enkrypt-frontend-design
description: >
  Production-grade, brand-consistent frontend design skill for Enkrypt AI.
  Triggers when building any UI artifact for Enkrypt AI — dashboards, landing pages,
  marketing components, social visuals, product screens, or any branded interface.
  Enforces Enkrypt AI brand gradient, typography, logo handling (light/dark mode),
  and icon system while giving Claude full creative latitude on layout, bg patterns,
  motion, and spatial composition — as long as contrast and readability are preserved.
---

## Unified source (Content Studio + designer + API)

Do **not** invent alternate logo URLs or gradients for Enkrypt when this repo is in use.

| Layer | Where it lives |
|-------|----------------|
| **Brand record** | Content Studio → Brands → Brand Editor (`logos.primary`, `logos.dark`, colors, Inter, etc.) |
| **Default lockup PNGs** | `content-studio/public/brand/enkrypt-logo-light-bg.png` (dark wordmark on **light** surfaces) and `enkrypt-logo-dark-bg.png` (light wordmark on **dark** surfaces) |
| **Shared constants** | `content-studio/lib/brand/enkrypt-defaults.js` — **single module**: logo URLs, gradient hex, designer semantic colors, `createDefaultEnkryptBrand()`, `createBrandEditorEmptyDefaults()`, `BRAND_EDITOR_LOGO` copy for the Brand Editor UI, `createEnkryptNoTemplateTheme()` for the designer “No template” row, `ENKRYPT_PREVIEW_GRADIENT_STOPS` for canvas export. Landing template and `studioBrandBridge` import from here. |
| **Designer embed** | Uses Brand Editor snapshot: white export → `logos.primary`; dark/transparent canvas → prefer `logos.dark` |
| **Claude / landing API** | Bundled copy: `content-studio/lib/prompts/enkrypt-frontend-design-SKILL.md` (keep in sync with this file) |

**Brand JSON mapping (never invert):**

- **`logos.primary`** — Lockup for **light / white** UI (`data-theme="light"`, light sections, designer white background). Default file: `enkrypt-logo-light-bg.png`.
- **`logos.dark`** — Lockup for **dark** UI (`data-theme="dark"`, dark hero). Default file: `enkrypt-logo-dark-bg.png`.

---

## For Claude, ChatGPT, or other external assistants

When working in the **content-engine** monorepo, follow this skill end-to-end. Content Studio’s **Landing** channel loads this document automatically via the text API (no manual paste). Landing HTML feature tiles must use **Lucide**: `<i data-lucide="PascalCaseName" aria-hidden="true"></i>` inside `.feature-icon`; the shell in `landing-template.js` loads Lucide UMD and calls `createIcons()`.

---

# Enkrypt AI Frontend Design Skill

You are designing a **production-grade, brand-consistent** frontend artifact for **Enkrypt AI** — a premium AI security platform. Every pixel must feel intentional: modern, minimal, trustworthy, and visually premium.

---

## Brand gradient — single source of truth

```
LINEAR GRADIENT: #FF7404 (0%) → #FF3BA2 (100%)
Direction: Left → Right (horizontal) by default.
           Adjust angle for decorative/background uses (e.g., 135deg for diagonal accents).
```

### Use gradient for

- Primary CTA buttons
- Key highlight badges, pills, tags, emphasis text
- Important icons / accent shapes
- Active states, selected indicators
- Decorative geometric shapes / brand accents

### Never

- Use any other gradient (purple, blue, rainbow, etc.)
- Use the gradient as a full-page background flood
- Let gradient blend into a similarly-toned background
- Use gradient on text that sits on a gradient bg (always white text on gradient)

---

## Logo usage — light & dark mode

Enkrypt AI has **two logo variants**. In Content Studio they are prefilled from `public/brand/`; elsewhere use the same paths or the brand’s uploaded URLs.

| UI / surface | Variant | Brand Editor field | Default asset |
|--------------|---------|-------------------|---------------|
| Light / white backgrounds | **Dark** wordmark | `logos.primary` | `enkrypt-logo-light-bg.png` |
| Dark backgrounds | **Light / white** wordmark | `logos.dark` | `enkrypt-logo-dark-bg.png` |

### Implementation pattern

```css
/* Theme: light surface → primary lockup; dark surface → dark-field lockup (light glyph) */
:root[data-theme="light"] #logo { content: url('/brand/enkrypt-logo-light-bg.png'); }
:root[data-theme="dark"] #logo { content: url('/brand/enkrypt-logo-dark-bg.png'); }
```

```html
<img id="logo" src="/brand/enkrypt-logo-light-bg.png" alt="Enkrypt AI" />
<script>
  const logoForLightSurface = '/brand/enkrypt-logo-light-bg.png';
  const logoForDarkSurface = '/brand/enkrypt-logo-dark-bg.png';
  const logo = document.getElementById('logo');
  const applyTheme = (dark) => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    if (logo) logo.src = dark ? logoForDarkSurface : logoForLightSurface;
  };
</script>
```

If only one URL exists in Brand Editor, keep contrast rules and note the missing variant.

---

## Color system

```css
:root {
  /* Brand */
  --brand-gradient: linear-gradient(90deg, #FF7404 0%, #FF3BA2 100%);
  --brand-start: #FF7404;
  --brand-end: #FF3BA2;

  /* Light Mode */
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

## Typography — Inter

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

* { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }

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

## CTA — primary focus

```css
.cta-primary {
  background: linear-gradient(90deg, #FF7404 0%, #FF3BA2 100%);
  color: #FFFFFF;
  font-family: 'Inter', sans-serif;
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

.cta-primary::after {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0);
  transition: background 0.15s ease;
}

.cta-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(255, 116, 4, 0.40), 0 2px 6px rgba(0,0,0,0.12);
  filter: brightness(1.05);
}

.cta-primary:hover::after {
  background: rgba(255,255,255,0.06);
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

In Content Studio landing sections, primary CTA uses class **`cta-btn`** (same gradient — do not invent other brand gradients).

---

## Icon system

- **Style:** Lucide (preferred in this repo — matches `lucide-react`), Heroicons, or equivalent outline/minimal icons.
- **Stroke:** ~1.5–2px, consistent.
- **Sizes:** 16px inline, 20px standard, 24px feature, 32px hero accent.
- **On gradient:** white `#FFFFFF` only.
- **Light mode surfaces:** `#555555` / `#888888`; **dark mode:** `#A0A0AA` / `#6B6B78`.
- **Never:** 3D icons, emoji as structural icons, heavy filled sets, mixed stroke weights.

### Landing page HTML (exported from Content Studio)

Inside each **`.feature-icon`**, use only:

```html
<div class="feature-icon"><i data-lucide="Shield" aria-hidden="true"></i></div>
```

`data-lucide` values are **PascalCase** Lucide names (see https://lucide.dev/icons ). The animated shell loads Lucide UMD and runs `createIcons()`.

---

## Layout and spatial rules

**Encouraged:** asymmetric grids, diagonal sections, overlap, bold negative space or controlled density, subtle noise/mesh, bento grids, split heroes, glass cards on dark with brand border accents, low-opacity brand orbs, grid-breaking heroes.

**Non-negotiable contrast**

- Never dark-on-dark or light-on-light body text.
- Never brand orange/pink UI that disappears into similar backgrounds.
- Target **WCAG AA** (~4.5:1 text, ~3:1 UI).

**Quick reference**

- Light bg: text `#111` / secondary `#555`.
- Dark bg: text `#F2F2F4` / secondary `#A0A0AA`.
- Gradient band: text and icons `#FFFFFF` only.

---

## Motion and interaction

```css
--transition-fast: 0.12s ease;
--transition-base: 0.20s ease;
--transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: fadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes gradientShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.gradient-animated {
  background: linear-gradient(90deg, #FF7404, #FF3BA2, #FF7404);
  background-size: 200% 100%;
  animation: gradientShift 3s ease infinite;
}
```

---

## Light / dark mode toggle (logos stay in sync)

```javascript
const root = document.documentElement;
const logo = document.getElementById('logo');
const logoForLightSurface = '/brand/enkrypt-logo-light-bg.png';
const logoForDarkSurface = '/brand/enkrypt-logo-dark-bg.png';
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
let isDark = localStorage.getItem('enkrypt-theme')
  ? localStorage.getItem('enkrypt-theme') === 'dark'
  : prefersDark;

function applyTheme() {
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  if (logo) logo.src = isDark ? logoForDarkSurface : logoForLightSurface;
  localStorage.setItem('enkrypt-theme', isDark ? 'dark' : 'light');
}

document.getElementById('themeToggle')?.addEventListener('click', () => {
  isDark = !isDark;
  applyTheme();
});

applyTheme();
```

Map URLs from **Brand Editor** when integrating Content Studio: `LIGHT_SURFACE_LOGO` → `logos.primary`, `DARK_SURFACE_LOGO` → `logos.dark`.

---

## Component patterns

### Badge / pill

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

### Card + gradient border accent

```css
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card-accent {
  border: 1px solid transparent;
  background:
    linear-gradient(var(--surface), var(--surface)) padding-box,
    linear-gradient(90deg, #FF7404, #FF3BA2) border-box;
}
```

### Input

```css
.input {
  background: var(--bg-secondary);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  padding: 11px 14px;
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  transition: border-color 0.15s ease;
  width: 100%;
}

.input:focus {
  outline: none;
  border-color: #FF7404;
  box-shadow: 0 0 0 3px rgba(255, 116, 4, 0.12);
}
```

---

## Pre-flight checklist

- [ ] Brand gradient is only `#FF7404` → `#FF3BA2` (no substitute gradients).
- [ ] **Light surface → `logos.primary` (light-bg PNG); dark surface → `logos.dark` (dark-bg PNG).**
- [ ] Text/background contrast passes WCAG AA.
- [ ] Primary CTA uses full gradient + shadow + hover.
- [ ] Inter loaded and applied.
- [ ] Theme toggle updates `data-theme` and logo `src`.
- [ ] Icons consistent stroke/weight; landing `.feature-icon` uses `data-lucide` only.
- [ ] Responsive where applicable.

---

## Design direction options

Pick **one** and execute fully:

1. **Glassmorphic dark** — deep bg, frosted cards, gradient orbs, light logo (`logos.dark` asset).
2. **Editorial light** — white space, sharp type, dark logo (`logos.primary` asset), gradient accent.
3. **Bento dashboard** — information grid, gradient for highlights.
4. **Split gradient hero** — half neutral / half gradient, asymmetric type.
5. **Minimal terminal** — dark + monospace touches, single gradient focal.
6. **Magazine grid** — overlap, editorial type, gradient as overlay.

---

## Quick start HTML shell

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Enkrypt AI</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      transition: background 0.2s ease, color 0.2s ease;
    }
  </style>
</head>
<body>
  <!-- content -->
  <script>/* theme + logo sync using paths above */</script>
</body>
</html>
```

---

## Out of scope

- Non-Enkrypt brands (use their tokens).
- AI **generated social bitmaps** where the pipeline forbids drawing the logo — this skill targets **UI and marketing HTML/CSS**, not that rule.
- Replacing product data models; map logos to `logos.primary` / `logos.dark` only.

---

## Bundled copy (sync)

When you edit this file, update **`content-studio/lib/prompts/enkrypt-frontend-design-SKILL.md`** (same contents) so `/api/generate/text` stays aligned.

```bash
cp .cursor/skills/enkrypt-frontend-design/SKILL.md content-studio/lib/prompts/enkrypt-frontend-design-SKILL.md
```
