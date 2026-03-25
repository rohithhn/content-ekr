/**
 * Landing Page HTML Template
 *
 * Wraps AI-generated landing page sections in a self-contained HTML document
 * with CSS animations, IntersectionObserver-based scroll reveals, brand theming,
 * animated counters, and responsive layout.
 *
 * Visual shell follows Enkrypt AI marketing skill: gradient #FF7404 → #FF3BA2, Inter,
 * header logo swaps with light/dark theme toggle.
 */

const ENKRYPT_BRAND_GRADIENT = "linear-gradient(90deg, #FF7404 0%, #FF3BA2 100%)";
const ENKRYPT_ORANGE = "#FF7404";
const ENKRYPT_PINK = "#FF3BA2";

/**
 * Official Enkrypt lockups in `public/brand/` (white wordmark on dark bg; dark wordmark on light bg).
 * Pass `assetBaseUrl: window.location.origin` from the browser so previews and downloads resolve images.
 */
export const ENKRYPT_DEFAULT_LANDING_LOGOS = {
  forDarkBackground: "/brand/enkrypt-logo-dark-bg.png",
  forLightBackground: "/brand/enkrypt-logo-light-bg.png",
};

function resolveLandingAssetUrl(path, assetBaseUrl) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:")) return path;
  const base = (assetBaseUrl || "").replace(/\/$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeAttr(s) {
  if (s == null || s === "") return "";
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function buildCSS(brand) {
  const sc = brand?.colors?.secondary || "#14B8A6";
  const ac = brand?.colors?.accent || "#F59E0B";
  const bg = brand?.colors?.background || "#0C0D14";
  const sf = brand?.colors?.surface || "#1A1B23";
  const th = brand?.colors?.text_heading || "#F1F1F4";
  const tb = brand?.colors?.text_body || "#C4C6D0";
  const br = brand?.layout?.border_radius_md || "12px";
  const mw = brand?.layout?.max_width || "1200px";

  /* Landing shell: canonical Enkrypt marketing gradient (not brand purple/teal). */
  const gradientCSS = ENKRYPT_BRAND_GRADIENT;
  const pc = ENKRYPT_ORANGE;

  return `
    :root {
      --color-primary: ${pc};
      --color-secondary: ${sc};
      --color-accent: ${ac};
      --color-bg: ${bg};
      --color-surface: ${sf};
      --color-heading: ${th};
      --color-body: ${tb};
      --font-heading: 'Inter', system-ui, sans-serif;
      --font-body: 'Inter', system-ui, sans-serif;
      --radius: ${br};
      --max-width: ${mw};
      --gradient: ${gradientCSS};
    }

    html[data-theme="light"] {
      --color-bg: #FFFFFF;
      --color-surface: #F7F7F8;
      --color-heading: #111111;
      --color-body: #555555;
    }

    html[data-theme="light"] .pain-card,
    html[data-theme="light"] .feature-card,
    html[data-theme="light"] .testimonial-card {
      background: #FFFFFF;
      border-color: #E8E8EC;
    }

    html[data-theme="light"] .logo-placeholder {
      background: #F0F0F2;
      color: #555555;
      border: 1px solid #E8E8EC;
    }

    html[data-theme="light"] .faq-item {
      border-bottom-color: #E8E8EC;
    }

    html[data-theme="light"] .cta-secondary {
      border-color: #E8E8EC !important;
      color: #111111 !important;
    }

    html[data-theme="light"] .cta-secondary:hover {
      border-color: ${ENKRYPT_ORANGE} !important;
      background: rgba(255, 116, 4, 0.06) !important;
      color: #111111 !important;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html { scroll-behavior: smooth; }

    body {
      font-family: var(--font-body);
      background: var(--color-bg);
      color: var(--color-body);
      line-height: 1.7;
      overflow-x: hidden;
    }

    section {
      padding: 80px 24px;
      max-width: var(--max-width);
      margin: 0 auto;
    }

    h1, h2, h3 {
      font-family: var(--font-heading);
      color: var(--color-heading);
      line-height: 1.2;
    }

    h1 { font-size: clamp(2.2rem, 5vw, 3.8rem); font-weight: 800; margin-bottom: 20px; }
    h2 { font-size: clamp(1.6rem, 3vw, 2.4rem); font-weight: 700; margin-bottom: 16px; }
    h3 { font-size: clamp(1.1rem, 2vw, 1.4rem); font-weight: 600; margin-bottom: 8px; }
    p { margin-bottom: 12px; }

    /* ─── CTA Buttons ──────────────────────────────── */
    .cta-btn {
      display: inline-block;
      padding: 16px 36px;
      background: var(--gradient);
      color: #FFFFFF;
      font-family: var(--font-heading);
      font-size: 1.05rem;
      font-weight: 700;
      border-radius: var(--radius);
      text-decoration: none;
      transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease, filter 0.2s ease;
      box-shadow: 0 4px 20px rgba(255, 116, 4, 0.32), 0 2px 8px rgba(255, 59, 162, 0.15);
      cursor: pointer;
    }
    .cta-btn:hover {
      transform: translateY(-3px) scale(1.03);
      box-shadow: 0 8px 32px rgba(255, 116, 4, 0.45), 0 4px 16px rgba(255, 59, 162, 0.2);
      filter: brightness(1.05);
    }
    .cta-secondary {
      background: transparent;
      border: 2px solid rgba(255, 255, 255, 0.22);
      color: var(--color-heading);
      box-shadow: none;
    }
    .cta-secondary:hover {
      border-color: ${ENKRYPT_ORANGE};
      background: rgba(255, 116, 4, 0.08);
      color: var(--color-heading);
    }

    /* ─── Hero ─────────────────────────────────────── */
    .lp-hero {
      text-align: center;
      padding: 120px 24px 80px;
      position: relative;
    }
    .lp-hero::before {
      content: '';
      position: absolute;
      top: -50%;
      left: 50%;
      transform: translateX(-50%);
      width: 800px;
      height: 800px;
      background: radial-gradient(circle, rgba(255, 116, 4, 0.14) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 0;
    }
    .lp-hero > * { position: relative; z-index: 1; }
    .lp-hero .subheadline {
      font-size: clamp(1.05rem, 2vw, 1.3rem);
      max-width: 640px;
      margin: 0 auto 32px;
      opacity: 0.85;
    }
    .lp-hero .social-proof {
      margin-top: 24px;
      font-size: 0.9rem;
      opacity: 0.6;
    }

    /* ─── Logo Bar ─────────────────────────────────── */
    .lp-logos { text-align: center; padding: 40px 24px; }
    .lp-logos .logo-bar-label { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 2px; opacity: 0.5; margin-bottom: 24px; }
    .logo-bar { display: flex; justify-content: center; gap: 40px; flex-wrap: wrap; align-items: center; }
    .logo-placeholder {
      padding: 12px 24px;
      border-radius: 8px;
      background: var(--color-surface);
      color: var(--color-body);
      font-size: 0.9rem;
      font-weight: 600;
      opacity: 0.5;
    }

    /* ─── Problems ─────────────────────────────────── */
    .lp-problems { text-align: center; }
    .pain-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 40px; }
    .pain-card {
      padding: 32px;
      border-radius: var(--radius);
      background: var(--color-surface);
      border: 1px solid rgba(255,255,255,0.06);
      text-align: left;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    .pain-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.3); }

    /* ─── Features ─────────────────────────────────── */
    .lp-features { text-align: center; }
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 28px; margin-top: 40px; }
    .feature-card {
      padding: 32px;
      border-radius: var(--radius);
      background: var(--color-surface);
      border: 1px solid rgba(255,255,255,0.06);
      text-align: left;
      transition: transform 0.3s ease, border-color 0.3s ease;
    }
    .feature-card:hover { transform: translateY(-4px); border-color: var(--color-primary); }
    .feature-icon {
      width: 48px; height: 48px;
      border-radius: 12px;
      background: var(--gradient);
      display: flex; align-items: center; justify-content: center;
      font-size: 1.4rem;
      margin-bottom: 16px;
      color: white;
    }

    /* ─── How It Works ─────────────────────────────── */
    .lp-how-it-works { text-align: center; }
    .steps-row { display: flex; gap: 32px; margin-top: 48px; flex-wrap: wrap; justify-content: center; }
    .step {
      flex: 1; min-width: 220px; max-width: 340px;
      text-align: center;
      position: relative;
    }
    .step-number {
      width: 56px; height: 56px;
      border-radius: 50%;
      background: var(--gradient);
      color: white;
      font-family: var(--font-heading);
      font-size: 1.4rem;
      font-weight: 800;
      display: inline-flex; align-items: center; justify-content: center;
      margin-bottom: 16px;
    }

    /* ─── Stats ────────────────────────────────────── */
    .lp-stats {
      background: var(--color-surface);
      border-radius: var(--radius);
      margin: 0 auto;
      max-width: var(--max-width);
    }
    .stats-row { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 24px; }
    .stat { text-align: center; padding: 16px; }
    .stat-number {
      font-family: var(--font-heading);
      font-size: clamp(2rem, 4vw, 3.2rem);
      font-weight: 800;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: inline;
    }
    .stat-suffix {
      font-family: var(--font-heading);
      font-size: clamp(1.4rem, 3vw, 2rem);
      font-weight: 700;
      background: var(--gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-label { display: block; margin-top: 8px; font-size: 0.9rem; opacity: 0.6; }

    /* ─── Testimonials ─────────────────────────────── */
    .lp-testimonials { text-align: center; }
    .testimonial-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-top: 40px; }
    .testimonial-card {
      padding: 32px;
      border-radius: var(--radius);
      background: var(--color-surface);
      border: 1px solid rgba(255,255,255,0.06);
      text-align: left;
      font-style: normal;
      position: relative;
    }
    .testimonial-card::before {
      content: '"';
      font-family: Georgia, serif;
      font-size: 4rem;
      position: absolute;
      top: 8px;
      left: 24px;
      color: var(--color-primary);
      opacity: 0.3;
      line-height: 1;
    }
    .testimonial-card p { font-style: italic; margin-bottom: 16px; padding-top: 16px; }
    .testimonial-card cite {
      font-style: normal;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--color-heading);
    }

    /* ─── CTA Section ──────────────────────────────── */
    .lp-cta {
      text-align: center;
      padding: 100px 24px;
      position: relative;
    }
    .lp-cta::before {
      content: '';
      position: absolute;
      bottom: -30%;
      left: 50%;
      transform: translateX(-50%);
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(255, 59, 162, 0.12) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }
    .lp-cta > * { position: relative; }
    .lp-cta p { max-width: 500px; margin: 0 auto 32px; opacity: 0.8; }

    /* ─── FAQ ──────────────────────────────────────── */
    .lp-faq { max-width: 720px; }
    .faq-list { margin-top: 32px; }
    .faq-item {
      border-bottom: 1px solid rgba(255,255,255,0.08);
      padding: 0;
    }
    .faq-item summary {
      padding: 20px 0;
      cursor: pointer;
      font-family: var(--font-heading);
      font-weight: 600;
      font-size: 1.05rem;
      color: var(--color-heading);
      list-style: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .faq-item summary::after {
      content: '+';
      font-size: 1.5rem;
      font-weight: 300;
      transition: transform 0.3s ease;
      color: var(--color-primary);
    }
    .faq-item[open] summary::after { transform: rotate(45deg); }
    .faq-item p { padding: 0 0 20px; opacity: 0.8; line-height: 1.8; }

    /* ─── Footer ───────────────────────────────────── */
    .lp-footer {
      text-align: center;
      padding: 60px 24px 80px;
      opacity: 0.9;
    }
    .lp-footer p { margin-bottom: 20px; }

    /* ─── Animations ───────────────────────────────── */
    [data-animate] { opacity: 0; transition: opacity 0.7s ease, transform 0.7s cubic-bezier(.22,.61,.36,1); }
    [data-animate="fade-up"] { transform: translateY(40px); }
    [data-animate="slide-left"] { transform: translateX(-50px); }
    [data-animate="slide-right"] { transform: translateX(50px); }
    [data-animate="zoom-in"] { transform: scale(0.92); }
    [data-animate="stagger-up"] { transform: translateY(40px); }

    [data-animate].visible { opacity: 1; transform: none; }

    [data-animate="stagger-up"].visible > .pain-card,
    [data-animate="stagger-up"].visible > .pain-grid > .pain-card,
    [data-animate="stagger-up"].visible > .feature-grid > .feature-card,
    [data-animate="stagger-up"].visible > .faq-list > .faq-item {
      animation: stagger-child 0.6s cubic-bezier(.22,.61,.36,1) forwards;
      opacity: 0;
      transform: translateY(24px);
    }
    @keyframes stagger-child {
      to { opacity: 1; transform: none; }
    }
    [data-animate="stagger-up"].visible > .pain-grid > .pain-card:nth-child(1),
    [data-animate="stagger-up"].visible > .feature-grid > .feature-card:nth-child(1),
    [data-animate="stagger-up"].visible > .faq-list > .faq-item:nth-child(1) { animation-delay: 0s; }
    [data-animate="stagger-up"].visible > .pain-grid > .pain-card:nth-child(2),
    [data-animate="stagger-up"].visible > .feature-grid > .feature-card:nth-child(2),
    [data-animate="stagger-up"].visible > .faq-list > .faq-item:nth-child(2) { animation-delay: 0.12s; }
    [data-animate="stagger-up"].visible > .pain-grid > .pain-card:nth-child(3),
    [data-animate="stagger-up"].visible > .feature-grid > .feature-card:nth-child(3),
    [data-animate="stagger-up"].visible > .faq-list > .faq-item:nth-child(3) { animation-delay: 0.24s; }
    [data-animate="stagger-up"].visible > .pain-grid > .pain-card:nth-child(4),
    [data-animate="stagger-up"].visible > .feature-grid > .feature-card:nth-child(4),
    [data-animate="stagger-up"].visible > .faq-list > .faq-item:nth-child(4) { animation-delay: 0.36s; }
    [data-animate="stagger-up"].visible > .pain-grid > .pain-card:nth-child(5),
    [data-animate="stagger-up"].visible > .feature-grid > .feature-card:nth-child(5),
    [data-animate="stagger-up"].visible > .faq-list > .faq-item:nth-child(5) { animation-delay: 0.48s; }

    /* ─── CTA pulse glow ───────────────────────────── */
    .lp-cta.visible .cta-btn {
      animation: pulse-glow 2.5s ease-in-out infinite;
    }
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 4px 24px rgba(0,0,0,0.2); }
      50% { box-shadow: 0 4px 40px rgba(255, 116, 4, 0.45), 0 2px 12px rgba(255, 59, 162, 0.25); }
    }

    /* ─── Top bar: logo + theme (Enkrypt skill) ───────────────────────────── */
    .lp-header {
      position: sticky;
      top: 0;
      z-index: 50;
      background: color-mix(in srgb, var(--color-bg) 92%, transparent);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }
    html[data-theme="light"] .lp-header {
      background: rgba(255, 255, 255, 0.9);
      border-bottom-color: #E8E8EC;
    }
    .lp-header-inner {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .lp-header-logo {
      height: 36px;
      width: auto;
      max-width: 200px;
      object-fit: contain;
      display: block;
    }
    .lp-theme-toggle {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      background: var(--color-surface);
      color: var(--color-heading);
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease;
    }
    html[data-theme="light"] .lp-theme-toggle {
      border-color: #E8E8EC;
      background: #FFFFFF;
    }
    .lp-theme-toggle:hover {
      border-color: ${ENKRYPT_ORANGE};
    }

    /* ─── Responsive ───────────────────────────────── */
    @media (max-width: 768px) {
      section { padding: 60px 20px; }
      .lp-hero { padding: 80px 20px 60px; }
      .steps-row { flex-direction: column; align-items: center; }
      .step { max-width: 100%; }
    }
  `;
}

function buildJS() {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll('[data-animate]').forEach(function(el) {
        observer.observe(el);
      });

      // Animated counters
      var counted = new Set();
      var counterObserver = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (!entry.isIntersecting) return;
          entry.target.querySelectorAll('.stat-number[data-count]').forEach(function(el) {
            if (counted.has(el)) return;
            counted.add(el);
            var target = parseFloat(el.getAttribute('data-count'));
            var isFloat = target % 1 !== 0;
            var duration = 1800;
            var start = performance.now();
            function tick(now) {
              var t = Math.min((now - start) / duration, 1);
              var ease = 1 - Math.pow(1 - t, 3);
              var val = ease * target;
              el.textContent = isFloat ? val.toFixed(1) : Math.round(val);
              if (t < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
          });
          counterObserver.unobserve(entry.target);
        });
      }, { threshold: 0.3 });

      document.querySelectorAll('.lp-stats').forEach(function(el) {
        counterObserver.observe(el);
      });

      // Theme + logo swap (Enkrypt: dark bg → logos.dark; light → logos.primary)
      var root = document.documentElement;
      var logo = document.getElementById('lp-logo');
      var tbtn = document.querySelector('.lp-theme-toggle');
      if (tbtn && logo && logo.hasAttribute('data-logo-dark')) {
        var darkSrc = logo.getAttribute('data-logo-dark') || '';
        var lightSrc = logo.getAttribute('data-logo-light') || '';
        function applyLandingTheme() {
          var t = root.getAttribute('data-theme') || 'dark';
          if (darkSrc && lightSrc) {
            logo.src = t === 'dark' ? darkSrc : lightSrc;
          }
          tbtn.textContent = t === 'dark' ? '\u2600' : '\u263d';
          tbtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        }
        tbtn.addEventListener('click', function() {
          var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
          root.setAttribute('data-theme', next);
          try { localStorage.setItem('enkrypt-landing-theme', next); } catch (e) {}
          applyLandingTheme();
        });
        var stored = null;
        try { stored = localStorage.getItem('enkrypt-landing-theme'); } catch (e) {}
        if (stored === 'light' || stored === 'dark') {
          root.setAttribute('data-theme', stored);
        } else {
          root.setAttribute('data-theme', 'dark');
        }
        applyLandingTheme();
      } else if (tbtn) {
        tbtn.addEventListener('click', function() {
          var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
          root.setAttribute('data-theme', next);
          try { localStorage.setItem('enkrypt-landing-theme', next); } catch (e) {}
          tbtn.textContent = next === 'dark' ? '\u2600' : '\u263d';
          tbtn.setAttribute('aria-label', next === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
        });
        var st = null;
        try { st = localStorage.getItem('enkrypt-landing-theme'); } catch (e) {}
        root.setAttribute('data-theme', st === 'light' ? 'light' : 'dark');
        tbtn.textContent = root.getAttribute('data-theme') === 'dark' ? '\u2600' : '\u263d';
      }
    });
  `;
}

function buildLandingHeader(brand, assetBaseUrl) {
  const primary = brand?.logos?.primary || "";
  const darkLogo = brand?.logos?.dark || "";
  const nameStr = `${brand?.company_name || ""} ${brand?.name || ""}`;
  const isEnkryptBrand = /enkrypt/i.test(nameStr);
  /* Bundled PNGs are Enkrypt-only; other brands use custom URLs or gradient wordmark. */
  const useBundledLogos = isEnkryptBrand;

  const defDark = useBundledLogos
    ? resolveLandingAssetUrl(ENKRYPT_DEFAULT_LANDING_LOGOS.forDarkBackground, assetBaseUrl)
    : "";
  const defLight = useBundledLogos
    ? resolveLandingAssetUrl(ENKRYPT_DEFAULT_LANDING_LOGOS.forLightBackground, assetBaseUrl)
    : "";

  /* Dark theme header: light/white wordmark. Light theme: dark wordmark. */
  const forDarkBg = darkLogo || defDark || primary;
  const forLightBg = primary || defLight || darkLogo;

  const alt = brand?.company_name || "Enkrypt AI";
  const innerToggle =
    '<button type="button" class="lp-theme-toggle" aria-label="Switch to light theme">\u2600</button>';
  if (!forDarkBg && !forLightBg) {
    return `<header class="lp-header" data-animate="fade-up">
  <div class="lp-header-inner">
    <span class="lp-header-wordmark" style="font-family:var(--font-heading);font-weight:800;font-size:1.15rem;letter-spacing:-0.02em;background:var(--gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${escapeAttr(alt)}</span>
    ${innerToggle}
  </div>
</header>`;
  }
  return `<header class="lp-header" data-animate="fade-up">
  <div class="lp-header-inner">
    <img id="lp-logo" class="lp-header-logo" src="${escapeAttr(forDarkBg)}" alt="${escapeAttr(alt)}" data-logo-dark="${escapeAttr(forDarkBg)}" data-logo-light="${escapeAttr(forLightBg)}" />
    ${innerToggle}
  </div>
</header>`;
}

/**
 * Detects whether content is structured HTML sections or plain markdown.
 */
function isStructuredHTML(content) {
  return /<section\s+class="lp-/.test(content);
}

/**
 * Converts plain markdown to landing-page-style HTML sections.
 * Splits on ## headings and wraps each in an animated section.
 */
function markdownToLandingSections(md) {
  const animations = ["fade-up", "stagger-up", "slide-left", "fade-up", "zoom-in", "fade-up"];
  const sectionClasses = ["lp-hero", "lp-problems", "lp-features", "lp-how-it-works", "lp-cta", "lp-footer"];
  const lines = md.split("\n");
  const sections = [];
  let current = [];

  for (const line of lines) {
    if (line.startsWith("## ") && current.length > 0) {
      sections.push(current);
      current = [];
    }
    current.push(line);
  }
  if (current.length > 0) sections.push(current);

  return sections.map((block, i) => {
    const cls = sectionClasses[i] || "lp-footer";
    const anim = animations[i] || "fade-up";
    const html = block.map(line => {
      if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith("> ")) return `<blockquote>${line.slice(2)}</blockquote>`;
      if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
      if (line.trim() === "") return "";
      let h = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      h = h.replace(/\*(.*?)\*/g, "<em>$1</em>");
      return `<p>${h}</p>`;
    }).filter(Boolean).join("\n    ");
    return `<section class="${cls}" data-animate="${anim}">\n    ${html}\n</section>`;
  }).join("\n\n");
}

/**
 * Builds a complete, self-contained HTML landing page document.
 * @param {string} bodyContent - AI-generated HTML sections or markdown
 * @param {object} brand - Brand configuration object
 * @param {{ assetBaseUrl?: string }} [options] - e.g. `{ assetBaseUrl: window.location.origin }` so bundled Enkrypt logos load in preview/download
 * @returns {string} Full HTML document string
 */
export function buildLandingPageHtml(bodyContent, brand, options = {}) {
  const assetBaseUrl = options.assetBaseUrl || "";
  const sections = isStructuredHTML(bodyContent)
    ? bodyContent
    : markdownToLandingSections(bodyContent);

  const header = buildLandingHeader(brand, assetBaseUrl);
  const title = brand?.company_name || "Landing Page";

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeAttr(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>${buildCSS(brand)}</style>
</head>
<body>
${header}
${sections}
<script>${buildJS()}</script>
</body>
</html>`;
}
