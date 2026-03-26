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

# Enkrypt AI Frontend Design Skill

You are designing a **production-grade, brand-consistent** frontend artifact for **Enkrypt AI** — a premium AI security platform. Every pixel must feel intentional: modern, minimal, trustworthy, and visually premium.

---

## BRAND GRADIENT — THE SINGLE SOURCE OF TRUTH

```
LINEAR GRADIENT: #FF7404 (0%) → #FF3BA2 (100%)
Direction: Left → Right (horizontal) by default.
           Adjust angle for decorative/background uses (e.g., 135deg for diagonal accents).
```

### USE GRADIENT FOR:
- Primary CTA buttons
- Key highlight badges, pills, tags, emphasis text
- Important icons / accent shapes
- Active states, selected indicators
- Decorative geometric shapes / brand accents

### NEVER:
- Use any other gradient (purple, blue, rainbow, etc.)
- Use the gradient as a full-page background flood
- Let gradient blend into a similarly-toned background
- Use gradient on text that sits on a gradient bg (always white text on gradient)

---

## LOGO USAGE — LIGHT & DARK MODE

**Content Studio / API landing pages:** Ignore placeholder filenames in this section if they conflict — use the **two exact URLs** in the system prompt’s **RUNTIME ASSETS** table only. The table maps Brand Editor **`logos.primary`** (light theme) and **`logos.dark`** (dark theme).

| Page theme (`data-theme`) | Brand Editor field | Lockup (contrast rule) |
|---------------------------|-------------------|-------------------------|
| `light` | `logos.primary` | **Dark-colored** wordmark on **white / light** header & surfaces |
| `dark` | `logos.dark` | **Light / white** wordmark on **dark** header & surfaces |

### Implementation pattern (semantic variable names — paste RUNTIME URLs)

```css
/* light theme surface → primary lockup; dark theme → dark-field lockup */
:root[data-theme="light"] #logo { content: var(--logo-for-light-theme); }
:root[data-theme="dark"] #logo { content: var(--logo-for-dark-theme); }
```

```html
<img id="logo" src="" alt="Brand" />
<script>
  /* Paste exact URLs from RUNTIME ASSETS — first = light theme, second = dark theme */
  const logoUrlWhenThemeIsLight = 'PASTE_LOGOS_PRIMARY_URL';
  const logoUrlWhenThemeIsDark = 'PASTE_LOGOS_DARK_URL';
  const logo = document.getElementById('logo');
  const applyTheme = (isDark) => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    if (logo) logo.src = isDark ? logoUrlWhenThemeIsDark : logoUrlWhenThemeIsLight;
  };
</script>
```

**Do not** name files `logo-light.svg` / `logo-dark.svg` unless those names match the contrast rule above (easy to invert by mistake).

**If only one URL exists** in Brand Editor, keep contrast rules and note the missing variant.

---

## COLOR SYSTEM

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

## TYPOGRAPHY — INTER SYSTEM

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

* { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; }

/* TYPE SCALE */
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

## CTA BUTTON DESIGN — PRIMARY FOCUS

The CTA is the most important element. Make it undeniably clickable.

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

/* Secondary/ghost CTA */
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

## ICON SYSTEM

```
Style: Lucide Icons, Heroicons, or equivalent outline/minimal icons
Stroke width: 1.5px (consistent across all icons)
Size: 16px (inline), 20px (standard), 24px (feature), 32px (hero accent)

Primary icons (on CTA, highlights):
  → Use white (#FFFFFF) when on gradient background
  → Use gradient color when on light/dark bg with gradient accent

Secondary icons:
  → Light mode: #555555 or #888888
  → Dark mode: #A0A0AA or #6B6B78

NEVER use: 3D icons, emoji-style icons, filled heavy icons, inconsistent stroke widths
```

---

## LAYOUT & SPATIAL RULES

Claude has **full creative latitude** on layout. Go bold. But follow these constraints:

### ENCOURAGED:
- Asymmetric grids, diagonal sections, overlapping elements
- Bold negative space or controlled density — pick an extreme
- Layered backgrounds: subtle noise textures, mesh gradients, geometric shapes as accents
- Grid-breaking hero elements, large typographic lockups
- Glassmorphism cards on dark backgrounds (with brand-colored borders)
- Animated gradient orbs/blobs as background atmosphere (use brand colors at low opacity)
- Bento grid layouts for feature displays
- Split compositions with brand gradient as the visual anchor

### CONTRAST RULES (NON-NEGOTIABLE):
- NEVER: Dark text on dark bg (#111 text on #0D0D0F bg)
- NEVER: Light text on light bg (#F2F2F4 text on #FFFFFF)
- NEVER: Orange/pink brand elements on orange/pink backgrounds
- NEVER: Gradient elements that disappear into the background
- ALWAYS: Test every element for WCAG AA contrast (4.5:1 for text, 3:1 for UI)

### Contrast Quick Reference:
```
Light bg (#FFF / #F7F7F8):
  → Primary text: #111111
  → Secondary text: #555555
  → Brand gradient elements: clearly visible

Dark bg (#0D0D0F / #141417):
  → Primary text: #F2F2F4
  → Secondary text: #A0A0AA
  → Brand gradient elements: clearly visible

Gradient bg (#FF7404 → #FF3BA2):
  → Text: #FFFFFF only
  → Icons: #FFFFFF only
```

---

## MOTION & INTERACTION GUIDELINES

```css
/* Smooth, purposeful transitions — not flashy */
--transition-fast: 0.12s ease;
--transition-base: 0.20s ease;
--transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);

/* Page load: staggered reveal */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-in {
  animation: fadeUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
}

/* Gradient shimmer for loading/emphasis */
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

## LIGHT / DARK MODE TOGGLE PATTERN

```html
<button id="themeToggle" aria-label="Toggle theme">
  <!-- Sun/Moon icon -->
</button>

<script>
  const root = document.documentElement;
  const logo = document.getElementById('logo');
  const logoUrlWhenThemeIsLight = 'PASTE_FROM_RUNTIME_LOGOS_PRIMARY';
  const logoUrlWhenThemeIsDark = 'PASTE_FROM_RUNTIME_LOGOS_DARK';

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let isDark = localStorage.getItem('enkrypt-theme') 
    ? localStorage.getItem('enkrypt-theme') === 'dark' 
    : prefersDark;

  const applyTheme = () => {
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    /* isDark → logos.dark URL (light glyph). !isDark → logos.primary URL (dark glyph). Use RUNTIME ASSETS URLs. */
    if (logo) logo.src = isDark ? logoUrlWhenThemeIsDark : logoUrlWhenThemeIsLight;
    localStorage.setItem('enkrypt-theme', isDark ? 'dark' : 'light');
  };

  document.getElementById('themeToggle').addEventListener('click', () => {
    isDark = !isDark;
    applyTheme();
  });

  applyTheme();
</script>
```

(Replace placeholder logo filenames with the **exact URLs** given in the API runtime block.)

---

## COMPONENT PATTERNS

### Badge / Pill (Brand Highlight)
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

### Card (Surface)
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

/* Gradient accent card */
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

## PRE-FLIGHT CHECKLIST

Before finalizing any artifact, verify:

- [ ] Brand gradient is ONLY `linear-gradient(90deg, #FF7404, #FF3BA2)` — no other gradients
- [ ] Logo uses correct variant for the mode (dark logo on light bg, light logo on dark bg)
- [ ] All text-on-background combinations pass contrast
- [ ] CTA button uses full gradient with shadow + hover state
- [ ] Inter font is loaded and applied everywhere
- [ ] Dark mode works and swaps logo correctly
- [ ] No random/decorative gradients that aren't the brand gradient
- [ ] Icons are consistent stroke width throughout
- [ ] Mobile responsive (if applicable)

---

## DESIGN DIRECTION OPTIONS

When Claude has freedom to choose a direction, pick ONE and execute fully:

1. **Glassmorphic Dark** — Deep dark bg, frosted glass cards, gradient orb atmosphere, light logo
2. **Editorial Light** — Crisp white, bold typography, large negative space, dark logo, gradient as sharp accent
3. **Bento Dashboard** — Dense information grid, mixed card sizes, brand gradient as status/highlight system
4. **Split Gradient Hero** — Half white / half gradient section, asymmetric layout, dramatic type
5. **Minimal Terminal** — Dark bg with monospace accents, gradient used as a single focal highlight
6. **Magazine Grid** — Overlapping asymmetric columns, editorial typography, brand gradient as photography overlay

---

## QUICK START TEMPLATE

```html
<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Enkrypt AI</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    /* Paste full CSS variable block + component styles here */
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
  <!-- Your artifact content -->
  <script>
    /* Theme toggle script — use RUNTIME ASSETS logo URLs from the API */
  </script>
</body>
</html>
```
