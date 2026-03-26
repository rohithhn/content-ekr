/**
 * Sync Content Studio Brand Editor → designer iframe (sessionStorage) and prompt text.
 * Brand object shape matches Workspace `BrandEditor` / `defaultBrands`.
 */

import { ENKRYPT_GRADIENT_END, ENKRYPT_GRADIENT_START } from "./enkrypt-defaults.js";
import { resolveLogosForHtmlGeneration } from "./brandLogos.js";

export const CE_DESIGNER_EMBED_BRAND_KEY = "ce_designer_embed_brand";

/** Default image-prompt color block when no studio brand is injected (hex from enkrypt-defaults). */
export const DEFAULT_DESIGNER_BRAND_COLOR_RULES = `\nBRAND COLOR GUIDANCE (follow strictly):\n- Primary accents: brand gradient orange ${ENKRYPT_GRADIENT_START} → pink ${ENKRYPT_GRADIENT_END} for icons, highlights, and decorative elements.\n- RED COLOR — this is a targeted rule, not a generic guideline: The CONTENT & VISUAL DIRECTION section below contains a VISUAL BRIEF with a ⚑ RED COLOR INSTRUCTION and a RED DECISION field. Read those fields now. If RED DECISION says ACTIVE, apply red #D92D20 to ONLY the exact element(s) named — do not use red anywhere else. If RED DECISION says INACTIVE, do NOT use red anywhere in this image — not as a border, frame, accent, glow, or any form of emphasis. This rule overrides any default behavior.\n- Extended accents: electric teal #06B6D4 or violet #7C3AED may be used as secondary accents when specified in the brief's PALETTE field.\n- Success/protected/secure: green #16B364 only for explicitly positive/secure/approved states.\n- Backgrounds: follow the PALETTE field in the brief. Dark backgrounds (#0A0F1E, #0D0F14) are valid and preferred for security/threat content. On dark backgrounds, use cool white #F0F4FF for labels and annotations.`;

/**
 * @param {object|null|undefined} brand
 * @param {string} [origin] - e.g. window.location.origin for relative /brand/ paths
 * @returns {object|null}
 */
export function serializeStudioBrandForDesigner(brand, origin) {
  if (!brand || typeof brand !== "object") return null;
  const base = (origin && String(origin).replace(/\/$/, "")) || "";
  const abs = (u) => {
    if (u == null || typeof u !== "string") return null;
    const t = u.trim();
    if (!t) return null;
    if (t.startsWith("data:") || /^https?:\/\//i.test(t)) return t;
    if (t.startsWith("//") && base) return (base.startsWith("https") ? "https:" : "http:") + t;
    if (t.startsWith("/") && base) return `${base}${t}`;
    return t;
  };
  const logos = brand.logos && typeof brand.logos === "object" ? brand.logos : {};
  const resolved = resolveLogosForHtmlGeneration(brand, base);
  const primaryUploaded = abs(logos.primary);
  const darkUploaded = abs(logos.dark);
  return {
    logoPlacement: brand.logo_placement || "top-left",
    logos: {
      primary: primaryUploaded || resolved.lightLogo,
      dark: darkUploaded || resolved.darkLogo,
    },
    colors: brand.colors && typeof brand.colors === "object" ? { ...brand.colors } : null,
    gradients: Array.isArray(brand.gradients) ? JSON.parse(JSON.stringify(brand.gradients)) : null,
    typography: brand.typography && typeof brand.typography === "object" ? { ...brand.typography } : null,
    company_name: brand.company_name || brand.name || "",
    tagline: brand.tagline || "",
    logosDescription: logos.description || "",
    visual_style: brand.visual_style && typeof brand.visual_style === "object" ? { ...brand.visual_style } : null,
    primary_as_gradient: brand.primary_as_gradient !== false,
  };
}

export function writeStudioBrandToSession(brand, origin) {
  const data = serializeStudioBrandForDesigner(brand, origin);
  try {
    if (typeof sessionStorage === "undefined") return;
    if (!data) sessionStorage.removeItem(CE_DESIGNER_EMBED_BRAND_KEY);
    else sessionStorage.setItem(CE_DESIGNER_EMBED_BRAND_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function readAndClearStudioBrandSession() {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const s = sessionStorage.getItem(CE_DESIGNER_EMBED_BRAND_KEY);
    if (s) sessionStorage.removeItem(CE_DESIGNER_EMBED_BRAND_KEY);
    if (!s) return null;
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/**
 * Light export / white canvas → primary lockup; dark / transparent → dark lockup.
 * @param {{ logos?: { primary?: string|null, dark?: string|null } }|null|undefined} payload
 * @param {boolean} designerWhiteBg
 * @returns {string|null}
 */
export function pickDesignerLogoUrl(payload, designerWhiteBg) {
  if (!payload?.logos) return null;
  const { primary, dark } = payload.logos;
  if (designerWhiteBg) return primary || dark || null;
  return dark || primary || null;
}

/**
 * @param {object|null|undefined} brandPayload - serialized studio brand
 * @returns {string|null}
 */
export function buildDesignerBrandColorRules(brandPayload) {
  if (!brandPayload?.colors || typeof brandPayload.colors !== "object") return null;
  const c = brandPayload.colors;
  const redBlock = `- RED COLOR — targeted rule: The CONTENT & VISUAL DIRECTION section contains a VISUAL BRIEF with ⚑ RED COLOR INSTRUCTION and RED DECISION. If ACTIVE, apply red #D92D20 only to named elements. If INACTIVE, use no red.\n- Success/protected/secure: green #16B364 only when explicitly positive/secure.\n- Extended accents: teal #06B6D4 or violet #7C3AED when the brief's PALETTE allows.`;
  const useGradientPrimary = brandPayload.primary_as_gradient !== false;
  const g0 = brandPayload.gradients?.[0];
  let primaryLine;
  if (!useGradientPrimary) {
    primaryLine = `- Primary (solid): ${c.primary}. Secondary (solid — separate supporting color, not a gradient blend with primary): ${c.secondary}.`;
  } else if (g0?.type === "linear" && g0.stops?.length >= 2) {
    const ang = typeof g0.angle === "number" ? g0.angle : 90;
    const a = g0.stops[0]?.color || c.primary;
    const b = g0.stops[1]?.color || c.secondary;
    primaryLine = `- Brand primary gradient (~${ang}deg): ${a} → ${b} — treat as the single marketing primary; use along with accent ${c.accent} only where a third color is needed.`;
  } else {
    primaryLine = `- Brand primary (linear gradient — use for CTAs, chips, icons, emphasis; not two unrelated solids): ${c.primary} → ${c.secondary}.`;
  }
  let lines = `\nBRAND COLOR GUIDANCE (from Content Studio Brand Editor — strict):\n${primaryLine}\n- Accent: ${c.accent}. Background: ${c.background}, Surface: ${c.surface}. Heading text: ${c.text_heading}, Body text: ${c.text_body}.`;
  if (brandPayload.company_name) lines += `\n- Company: ${brandPayload.company_name}.`;
  if (brandPayload.tagline) lines += `\n- Tagline: ${brandPayload.tagline}.`;
  if (brandPayload.typography?.heading_font) {
    lines += `\n- Typography: headings "${brandPayload.typography.heading_font}", body "${brandPayload.typography.body_font || brandPayload.typography.heading_font}".`;
  }
  if (brandPayload.visual_style?.image_style) {
    lines += `\n- Visual style: ${brandPayload.visual_style.image_style}.`;
  }
  const lp = brandPayload.logoPlacement || "top-left";
  if (brandPayload.logosDescription) {
    lines += `\n- Logo area (${lp.replace("-", " ")} — do not paint the logo in-image; app composites it): ${brandPayload.logosDescription}`;
  }
  lines += `\n${redBlock}`;
  return lines;
}
