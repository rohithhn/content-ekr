/**
 * Absolute logo URLs + SVG placeholders from Brand Editor colors when lockups are missing.
 * Used by landing / HTML-video API prompts and designer session serialization.
 */

import {
  ENKRYPT_LOGO_FOR_DARK_BACKGROUND,
  ENKRYPT_LOGO_FOR_LIGHT_BACKGROUND,
} from "./enkrypt-defaults.js";

export function toAbsoluteAssetUrl(pathOrUrl, origin) {
  if (!pathOrUrl) return "";
  if (/^data:/i.test(pathOrUrl)) return pathOrUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (origin || "").replace(/\/$/, "");
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return base ? `${base}${p}` : pathOrUrl;
}

/**
 * Short / marketing name for nav, logo SVG, and prompts — **name** wins over company_name
 * so a stale legal field does not override what the user set as the brand name in the editor.
 */
export function brandDisplayName(brand) {
  if (!brand || typeof brand !== "object") return "Brand";
  const s = (brand.name || brand.company_name || "").trim();
  return s || "Brand";
}

function brandCompanyLabel(brand) {
  return brandDisplayName(brand);
}

function initialsFromLabel(label) {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "B";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 3);
}

/**
 * Small SVG wordmark-style placeholder as data URI (works in iframe srcDoc and <img src>).
 * @param {"light" | "dark"} surface — light = asset for white/light UI (dark glyph); dark = for dark UI (light glyph)
 */
export function buildBrandPlaceholderLogoDataUri(brand, surface) {
  const label = brandCompanyLabel(brand);
  const initials = initialsFromLabel(label);
  const c = brand?.colors || {};
  const primary = String(c.primary || "#6C2BD9").replace(/"/g, "");
  const secondary = String(c.secondary || "#14B8A6").replace(/"/g, "");
  const accent = String(c.accent || primary).replace(/"/g, "");
  const textDark = String(c.text_heading || "#111827").replace(/"/g, "");
  const textLight = String(c.text_heading || "#F9FAFB").replace(/"/g, "");

  const esc = (s) =>
    String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const barW = Math.min(130, Math.max(48, label.length * 7));
  let svg;
  if (surface === "light") {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="48" viewBox="0 0 200 48">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="46" height="46" rx="10" fill="url(#g)"/>
  <text x="24" y="31" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="16" font-weight="700" fill="#FFFFFF">${esc(initials)}</text>
  <text x="56" y="30" font-family="Inter,system-ui,sans-serif" font-size="14" font-weight="700" fill="${textDark}">${esc(label.slice(0, 28))}</text>
  <rect x="56" y="34" width="${barW}" height="3" rx="1.5" fill="${accent}"/>
</svg>`;
  } else {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="48" viewBox="0 0 200 48">
  <defs>
    <linearGradient id="g2" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
  </defs>
  <rect width="200" height="48" rx="10" fill="#0a0a0f"/>
  <rect x="8" y="6" width="36" height="36" rx="8" fill="url(#g2)"/>
  <text x="26" y="29" text-anchor="middle" font-family="Inter,system-ui,sans-serif" font-size="14" font-weight="700" fill="#FFFFFF">${esc(initials)}</text>
  <text x="52" y="29" font-family="Inter,system-ui,sans-serif" font-size="14" font-weight="700" fill="${textLight}">${esc(label.slice(0, 26))}</text>
</svg>`;
  }

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * @param {object|null|undefined} brand
 * @param {string} origin
 * @returns {{ company: string, lightLogo: string, darkLogo: string }}
 */
export function resolveLogosForHtmlGeneration(brand, origin) {
  if (!brand || typeof brand !== "object") {
    return {
      company: "Enkrypt AI",
      lightLogo: toAbsoluteAssetUrl(ENKRYPT_LOGO_FOR_LIGHT_BACKGROUND, origin),
      darkLogo: toAbsoluteAssetUrl(ENKRYPT_LOGO_FOR_DARK_BACKGROUND, origin),
    };
  }

  const company = brandCompanyLabel(brand);
  const p = brand.logos?.primary;
  const d = brand.logos?.dark;
  const hasP = typeof p === "string" && p.trim().length > 0;
  const hasD = typeof d === "string" && d.trim().length > 0;

  return {
    company,
    lightLogo: hasP ? toAbsoluteAssetUrl(p.trim(), origin) : buildBrandPlaceholderLogoDataUri(brand, "light"),
    darkLogo: hasD ? toAbsoluteAssetUrl(d.trim(), origin) : buildBrandPlaceholderLogoDataUri(brand, "dark"),
  };
}

/**
 * Injected after the Enkrypt-centric skill so Claude uses the active studio brand colors, not example orange/pink.
 */
export function buildBrandVisualDirectiveForHtml(brand) {
  if (!brand || typeof brand !== "object" || !brand.colors || typeof brand.colors !== "object") return "";
  const label = brandCompanyLabel(brand);
  const c = brand.colors;
  const useGrad = brand.primary_as_gradient !== false;
  const g0 = brand.gradients?.[0];
  let cta;
  if (!useGrad) {
    cta = `Primary buttons / CTAs: solid **\`${c.primary}\`**; secondary actions may use **\`${c.secondary}\`** or **\`${c.accent}\`**.`;
  } else if (g0?.type === "linear" && Array.isArray(g0.stops) && g0.stops.length >= 2) {
    const a = g0.stops[0]?.color || c.primary;
    const b = g0.stops[1]?.color || c.secondary;
    cta = `Primary buttons / CTAs: linear gradient **\`${a}\` → \`${b}\`** (implement as \`.cta-primary\` / equivalent).`;
  } else {
    cta = `Primary buttons / CTAs: linear gradient **\`${c.primary}\` → \`${c.secondary}\`**.`;
  }
  const hf = brand.typography?.heading_font || "Inter";
  const bf = brand.typography?.body_font || "Inter";
  return `
---
## BRAND VISUAL OVERRIDE (this request — authoritative over Enkrypt example hex in the skill)

- **Brand:** ${label}
- ${cta}
- **Accent:** \`${c.accent}\` · **Background / surface:** \`${c.background}\` / \`${c.surface}\` · **Text:** headings \`${c.text_heading}\`, body \`${c.text_body}\`
- **Typography:** "${hf}" (headings), "${bf}" (body) — load from Google Fonts if needed.
- Do **not** default to Enkrypt orange #FF7404 / pink #FF3BA2 unless those exact values appear in the OVERRIDE lines above.

## IDENTITY (non-negotiable)
- The **only** correct product/company name for visible UI (nav, logo text, \`<title>\`, meta, hero, footer, \`alt\` beside the mark) is **"${label.replace(/"/g, '\\"')}"** (and phrasing from SOURCE when it names this brand).
- Do **not** print **Enkrypt AI**, **Enkrypt**, or any other company name unless it appears verbatim in SOURCE as the actual brand being built.
`.trim();
}
