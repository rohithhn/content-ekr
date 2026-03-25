# HTML Video Builder — Animation Library

All `@keyframes` used in the video builder pattern, with usage context.

---

## Background / Ambient

### gridDrift — Slow grid pan (always-on bg)
```css
@keyframes gridDrift {
  to { background-position: 48px 48px; }
}
/* Usage: animation: gridDrift 25s linear infinite; */
/* On: .grid-bg element with CSS grid background-image */
```

### orbFloat — Breathing glow blobs
```css
@keyframes orbFloat {
  0%   { transform: translate(0, 0) scale(1); }
  100% { transform: translate(30px, -20px) scale(1.15); }
}
/* Usage: animation: orbFloat 12s ease-in-out infinite alternate; */
/* Vary animation-delay per orb: 0s, -6s, -3s */
```

---

## Typography

### gradShift — Animated gradient text
```css
@keyframes gradShift {
  0%   { background-position: 0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}
/* Usage: animation: gradShift 5s ease infinite; */
/* Requires background-size: 200% 200% on the element */
/* Pair with: -webkit-background-clip: text; -webkit-text-fill-color: transparent; */
```

---

## Hero / Character

### heroFloat — Gentle floating emoji / icon
```css
@keyframes heroFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25%       { transform: translateY(-12px) rotate(-3deg); }
  75%       { transform: translateY(-8px) rotate(3deg); }
}
/* Usage: animation: heroFloat 3s ease-in-out infinite; */
/* Add: filter: drop-shadow(0 0 40px rgba(88,166,255,0.2)); */
```

### heroPulse — Scale pulse for emphasis
```css
@keyframes heroPulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.05); }
}
/* Usage: animation: heroPulse 2s ease-in-out infinite; */
```

---

## Interactive / CTA

### ctaPulse — Ripple ring on button
```css
@keyframes ctaPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(88, 166, 255, 0.4); }
  50%       { box-shadow: 0 0 0 12px rgba(88, 166, 255, 0); }
}
/* Usage: animation: ctaPulse 2s ease-in-out infinite; */
/* Works on any element with background */
```

### shimmer — Loading skeleton shimmer
```css
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
/* Usage: 
   background: linear-gradient(90deg, var(--surface) 25%, var(--border) 50%, var(--surface) 75%);
   background-size: 200% 100%;
   animation: shimmer 1.5s linear infinite;
*/
```

---

## Data / UI

### spin — Loading spinner / scan circle
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
/* Usage: animation: spin 0.8s linear infinite; */
/* Pair with: border-top-color: transparent; for the cutout look */
```

### blink — Terminal cursor blink
```css
@keyframes blink {
  50% { opacity: 0; }
}
/* Usage: animation: blink 0.8s step-end infinite; */
/* Use step-end (not ease) for the hard blink effect */
```

### countUp — Number counter (JS-driven, no CSS needed)
```js
// Count from 0 to target over duration ms
function countUp(elementId, target, duration = 1500, suffix = '') {
  const el = document.getElementById(elementId);
  const start = performance.now();
  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.floor(eased * target) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
// Call: if (idx === 2) countUp('stat1', 36, 1200, '%');
```

---

## Reveal / Entrance

### fadeUp — Used by the .reveal system
```css
/* Built into .reveal / .reveal.show classes — see components.md */
/* This is the workhorse for all scene content entrances */
```

### slideInLeft — Alternate entrance for split layouts
```css
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-30px); }
  to   { opacity: 1; transform: translateX(0); }
}
/* Usage: animation: slideInLeft 0.6s ease forwards; */
```

### slideInRight — Paired with slideInLeft
```css
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(30px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

### scaleIn — Pop entrance for icons/badges
```css
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}
/* Usage: animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; */
/* The cubic-bezier gives a satisfying overshoot/bounce */
```

---

## Danger / Alert

### flashRed — Danger flash for attack scenes
```css
@keyframes flashRed {
  0%, 100% { background: transparent; }
  50%       { background: rgba(255, 123, 114, 0.08); }
}
/* Usage on scene: animation: flashRed 0.8s ease 2; (runs twice) */
```

### shake — Error shake
```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%       { transform: translateX(-8px); }
  40%       { transform: translateX(8px); }
  60%       { transform: translateX(-6px); }
  80%       { transform: translateX(6px); }
}
/* Usage: animation: shake 0.5s ease; */
/* Trigger via JS: el.style.animation = 'shake 0.5s ease'; */
```

---

## Animation Timing Guide

| Effect | Duration | Easing |
|---|---|---|
| Scene fade in/out | 0.8s | ease |
| Reveal elements | 0.6s | ease |
| Background drift | 25s | linear |
| Orb float | 12s | ease-in-out |
| Gradient shift | 5s | ease |
| Hero float | 3s | ease-in-out |
| CTA pulse | 2s | ease-in-out |
| Spinner | 0.8s | linear |
| Cursor blink | 0.8s | step-end |
| Count up | 1.2–1.5s | ease-out cubic |
| Typewriter char | 18ms/char | — |
| Scan step interval | 550ms/step | — |
