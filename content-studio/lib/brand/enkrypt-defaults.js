/**
 * Single source of truth for Enkrypt AI brand defaults across:
 * - Content Studio BrandEditor + default brand seed
 * - Landing pages: full HTML from Claude (`/api/generate/text` + `enkrypt-frontend-design-SKILL.md`)
 * - Designer embed (`designer-app`, via Vite alias `@studio-brand`)
 * - Cursor skill `enkrypt-frontend-design` + bundled API markdown (sync paths/copy manually)
 *
 * Field semantics (never invert):
 * - `logos.primary` → shown on LIGHT / white surfaces (dark wordmark). File: *-light-bg.png
 * - `logos.dark`    → shown on DARK surfaces (light wordmark). File: *-dark-bg.png
 */

export const ENKRYPT_LOGO_FOR_LIGHT_BACKGROUND = "/brand/enkrypt-logo-light-bg.png";
export const ENKRYPT_LOGO_FOR_DARK_BACKGROUND = "/brand/enkrypt-logo-dark-bg.png";

export const ENKRYPT_GRADIENT_START = "#FF7404";
export const ENKRYPT_GRADIENT_END = "#FF3BA2";

/** Designer + social prompts: semantic colors (match frontend skill / CSS variables). */
export const ENKRYPT_DESIGNER_SEMANTIC_COLORS = {
  gradientStart: ENKRYPT_GRADIENT_START,
  gradientEnd: ENKRYPT_GRADIENT_END,
  danger: "#D92D20",
  secure: "#16B364",
  text: "#1A1A1A",
  muted: "#414651",
  cardBg: "#FFFFFF",
  cardBorder: "#D5D7DA",
};

/** Default 6-chip palette for “No template” and modal fallbacks in designer. */
export const ENKRYPT_DESIGNER_DEFAULT_PALETTE = [
  ENKRYPT_DESIGNER_SEMANTIC_COLORS.gradientStart,
  ENKRYPT_DESIGNER_SEMANTIC_COLORS.gradientEnd,
  ENKRYPT_DESIGNER_SEMANTIC_COLORS.danger,
  ENKRYPT_DESIGNER_SEMANTIC_COLORS.secure,
  ENKRYPT_DESIGNER_SEMANTIC_COLORS.text,
  ENKRYPT_DESIGNER_SEMANTIC_COLORS.cardBg,
];

/** 3-stop gradient sometimes used in designer preview (orange → mid → pink). */
export const ENKRYPT_PREVIEW_GRADIENT_STOPS = [
  ENKRYPT_GRADIENT_START,
  "#FF6F53",
  ENKRYPT_GRADIENT_END,
];

export const ENKRYPT_LOGO_DESCRIPTION =
  "Official Enkrypt AI horizontal lockup: circular orange→pink gradient icon with white flame mark; wordmark beside it. Use logos.primary (dark wordmark PNG) on white/light UI; logos.dark (white wordmark PNG) on dark UI — same assets as public/brand/ in the repo.";

/** BrandEditor → Assets → Logo: labels and help text (paths pulled from constants above). */
export const BRAND_EDITOR_LOGO = {
  sectionTitle: "Logo",
  primaryLabel: "Light-surface lockup URL",
  get primaryHelp() {
    return `logos.primary — dark wordmark on light / white surfaces (landing light theme, designer white export). Default: ${ENKRYPT_LOGO_FOR_LIGHT_BACKGROUND}`;
  },
  darkLabel: "Dark-surface lockup URL",
  get darkHelp() {
    return `logos.dark — light wordmark on dark backgrounds (landing dark theme, transparent designer). Default: ${ENKRYPT_LOGO_FOR_DARK_BACKGROUND}`;
  },
  urlPlaceholder: "/brand/... or https://...",
  descriptionLabel: "Logo description (for AI image generation)",
  descriptionPlaceholder:
    "How the lockup should look in generated visuals. Enkrypt default fills automatically for the default brand.",
  previewCaptionPrimary: "primary · light UI",
  previewCaptionDark: "dark field · dark UI",
};

const C = ENKRYPT_DESIGNER_SEMANTIC_COLORS;

/** Designer “No template” row — keep prompts in sync with Brand Editor gradient. */
export function createEnkryptNoTemplateTheme() {
  return {
    id: "none",
    label: "No Template",
    image: "",
    promptContext: `Style: clean, modern, professional social media post. Use the brand gradient (orange ${C.gradientStart} to pink ${C.gradientEnd}) for icons and decorative elements. Red (${C.danger}) for danger/warning elements. Green (${C.secure}) for success/secure elements. Near-black (${C.text}) for all body text. White card backgrounds with subtle borders. Tone: polished, brand-consistent.`,
    visualPrompt: `Create a clean, modern social media visual with no specific template. Use a professional layout with rounded cards, clean icons, and clear visual hierarchy. Icons and decorative elements should use a warm gradient from orange (${C.gradientStart}) to pink (${C.gradientEnd}). Any danger/warning elements in red (${C.danger}). Any success/secure elements in green (${C.secure}). All text in near-black (${C.text}). White (${C.cardBg}) card backgrounds with subtle gray (${C.cardBorder}) borders.`,
    palette: [...ENKRYPT_DESIGNER_DEFAULT_PALETTE],
    isNone: true,
  };
}

/**
 * New-brand form defaults (colors match Enkrypt / designer; swap for non-Enkrypt after create).
 */
export function createBrandEditorEmptyDefaults() {
  return {
    id: "",
    name: "",
    company_name: "",
    tagline: "",
    elevator_pitch: "",
    primary_as_gradient: true,
    colors: {
      primary: ENKRYPT_GRADIENT_START,
      secondary: ENKRYPT_GRADIENT_END,
      accent: C.secure,
      background: "#0C0D14",
      surface: "#1A1B23",
      text_heading: "#F1F1F4",
      text_body: "#C4C6D0",
    },
    gradients: [
      {
        name: "Brand",
        type: "linear",
        angle: 90,
        stops: [
          { color: ENKRYPT_GRADIENT_START, position: 0 },
          { color: ENKRYPT_GRADIENT_END, position: 100 },
        ],
      },
    ],
    typography: { heading_font: "Inter", body_font: "Inter" },
    layout: { max_width: "1200px", border_radius_sm: "6px", border_radius_md: "12px", border_radius_lg: "20px", nav_style: "sticky" },
    tone: { descriptors: [], cta_style: "", words_to_use: [], words_to_avoid: [] },
    audience: { persona_name: "", industry: "", language_register: "business" },
    visual_style: { image_style: "minimal", icon_style: "outlined" },
    logos: { primary: null, dark: null, description: "" },
    sample_backgrounds: [],
    sample_templates: [],
    logo_placement: "top-left",
  };
}

/**
 * Default Enkrypt row for IndexedDB seed + UI.
 */
function isNonemptyValue(v) {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

/**
 * Deep-merge: template (canonical) is the base; stored values win only when non-empty.
 * Used so Edit Brand opens with designer + frontend-skill defaults filled in.
 */
function deepMergePreferStored(stored, template) {
  if (template == null) return stored;
  if (Array.isArray(template)) {
    if (Array.isArray(stored) && stored.length > 0) return JSON.parse(JSON.stringify(stored));
    return JSON.parse(JSON.stringify(template));
  }
  if (typeof template !== "object") {
    return isNonemptyValue(stored) ? stored : template;
  }
  const out = {};
  const keys = new Set([...Object.keys(template), ...Object.keys(stored || {})]);
  for (const k of keys) {
    const sv = stored?.[k];
    const tv = template[k];
    if (tv === undefined && sv !== undefined) {
      out[k] = typeof sv === "object" && sv !== null ? JSON.parse(JSON.stringify(sv)) : sv;
      continue;
    }
    if (typeof tv === "object" && tv !== null && !Array.isArray(tv) && typeof sv === "object" && sv !== null && !Array.isArray(sv)) {
      out[k] = deepMergePreferStored(sv, tv);
    } else if (Array.isArray(tv)) {
      out[k] = Array.isArray(sv) && sv.length > 0 ? JSON.parse(JSON.stringify(sv)) : JSON.parse(JSON.stringify(tv));
    } else {
      out[k] = isNonemptyValue(sv) ? sv : tv;
    }
  }
  return out;
}

/** True for default Enkrypt row or any brand whose name/company mentions Enkrypt. */
export function isEnkryptStudioBrand(brand) {
  if (!brand || typeof brand !== "object") return false;
  if (brand.id === "brand-1") return true;
  const label = `${brand.name || ""} ${brand.company_name || ""}`.toLowerCase();
  return label.includes("enkrypt");
}

/**
 * Forces marketing primary = canonical Enkrypt gradient (#FF7404 → #FF3BA2).
 * Old IndexedDB rows often kept stale `gradients` because merge preferred non-empty arrays.
 */
export function syncEnkryptMarketingPrimaryToCanonical(brand) {
  if (!brand || typeof brand !== "object") return brand;
  if (!isEnkryptStudioBrand(brand) || brand.primary_as_gradient === false) return brand;
  const out = JSON.parse(JSON.stringify(brand));
  if (!out.colors || typeof out.colors !== "object") out.colors = {};
  const canon = createDefaultEnkryptBrand({
    id: out.id,
    name: out.name,
    company_name: out.company_name,
  });
  out.colors.primary = canon.colors.primary;
  out.colors.secondary = canon.colors.secondary;
  out.gradients = JSON.parse(JSON.stringify(canon.gradients));
  return out;
}

/**
 * Edit Brand side sheet: fill empty fields from `createDefaultEnkryptBrand` (logos, tone, colors, etc.).
 * Matches designer-app `@studio-brand` + enkrypt-frontend-design skill tokens.
 * Always reapplies canonical marketing gradient when Enkrypt is in gradient mode.
 */
export function hydrateEnkryptBrandForEditor(stored) {
  if (!stored || typeof stored !== "object") return createDefaultEnkryptBrand();
  const canonical = createDefaultEnkryptBrand({
    id: stored.id || "brand-1",
    name: isNonemptyValue(stored.name) ? stored.name : undefined,
    company_name: isNonemptyValue(stored.company_name) ? stored.company_name : undefined,
  });
  const base = JSON.parse(JSON.stringify(canonical));
  const merged = deepMergePreferStored(stored, base);
  return syncEnkryptMarketingPrimaryToCanonical(merged);
}

export function createDefaultEnkryptBrand(overrides = {}) {
  return {
    id: "brand-1",
    name: "Enkrypt AI",
    company_name: "Enkrypt AI",
    tagline: "Secure AI, Everywhere",
    elevator_pitch: "The world's most comprehensive AI security platform.",
    primary_as_gradient: true,
    colors: {
      primary: ENKRYPT_GRADIENT_START,
      secondary: ENKRYPT_GRADIENT_END,
      accent: C.secure,
      background: "#0C0D14",
      surface: "#1A1B23",
      text_heading: "#F1F1F4",
      text_body: "#C4C6D0",
    },
    gradients: [
      {
        name: "Hero",
        type: "linear",
        angle: 135,
        stops: [
          { color: ENKRYPT_GRADIENT_START, position: 0 },
          { color: ENKRYPT_GRADIENT_END, position: 100 },
        ],
      },
    ],
    typography: { heading_font: "Inter", body_font: "Inter" },
    layout: { max_width: "1200px", border_radius_sm: "6px", border_radius_md: "12px", border_radius_lg: "20px", nav_style: "sticky" },
    tone: {
      descriptors: ["Authoritative", "Technical", "Approachable"],
      cta_style: "Action-oriented",
      words_to_use: ["secure", "protect", "trust"],
      words_to_avoid: ["cheap", "basic"],
    },
    audience: {
      persona_name: "CISO / AI Platform Lead",
      industry: "Enterprise Technology",
      language_register: "technical",
    },
    visual_style: { image_style: "minimal", icon_style: "outlined" },
    logos: {
      primary: ENKRYPT_LOGO_FOR_LIGHT_BACKGROUND,
      dark: ENKRYPT_LOGO_FOR_DARK_BACKGROUND,
      description: ENKRYPT_LOGO_DESCRIPTION,
    },
    sample_backgrounds: [],
    sample_templates: [],
    logo_placement: "top-left",
    ...overrides,
  };
}
