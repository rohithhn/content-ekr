/**
 * Assembles the OpenAI image prompt exactly like designer-app LeftPanel generateSingleVisual
 * (omitContentTextInImage: true, variationIdx 0, no source image).
 */

import { buildContentAndVisualBlock, buildVisualBrief } from "./imagePromptBuilder";
import { getThemeById, NO_TEMPLATE_THEME } from "./themes";
import { getVisualSlotDimensions } from "./visualSlotLayout";

const POSITIONS = [
  { id: "top-left", label: "↖ Top Left" },
  { id: "top-center", label: "↑ Top Center" },
  { id: "top-right", label: "↗ Top Right" },
  { id: "bottom-left", label: "↙ Bottom Left" },
  { id: "bottom-center", label: "↓ Bottom Center" },
  { id: "bottom-right", label: "↘ Bottom Right" },
];

const DEFAULT_LAYOUT_SETTINGS = {
  logoPosition: "top-left",
  padding: 20,
  logoScale: 60,
  fontSettings: {
    heading: { size: 40, weight: 600 },
    subheading: { size: 27, weight: 600 },
    footer: { size: 24, weight: 500 },
  },
  visualSlot: { widthPct: 100, heightPct: 100, yPct: 14 },
  textSlots: {
    heading: { yPct: 7 },
    subheading: { yPct: 10 },
    footer: { yPct: 80 },
  },
  useHeading: true,
  useSubheading: true,
  useFooter: true,
  slotGap: 14,
};

export function postSizeIdToCanvasSize(postSizeId) {
  if (postSizeId === "1920x1080") return { width: 1920, height: 1080 };
  return { width: 1080, height: 1080 };
}

export function isDesignerTrnsPostSize(postSizeId) {
  return postSizeId === "1080x1080-trns";
}

export function buildDesignerPostLayoutContext(logoPosition, logoScale, padding, size, designerWhiteBg, postSizeId) {
  const pos = POSITIONS.find((p) => p.id === logoPosition);
  const sizeLabel =
    size.width === size.height ? "1:1 square (1080×1080)" : "16:9 landscape (1920×1080)";
  const trns = isDesignerTrnsPostSize(postSizeId);
  let bgLine;
  if (designerWhiteBg) {
    bgLine =
      "Background: User selected **White bg ON** — export uses solid flat #FFFFFF for the full canvas. Do not assume a peach/coral gradient is “already behind” the image; follow the SOLID WHITE BACKGROUND rule at the end of this prompt.";
  } else if (trns) {
    bgLine =
      "Background: User selected **1:1 trns** — TRANSPARENT EXPORT. The app composites this PNG on arbitrary backgrounds (checkerboard in preview). The full-bleed canvas outside opaque subject matter must be **fully transparent (alpha)** — not white, not peach, not a soft gradient wash across the entire frame.";
  } else {
    bgLine =
      "Background: warm peach/coral Enkrypt AI branded gradient (already provided — do NOT recreate the bg)";
  }
  const exportNote = trns ? "\n- Export note: Same pixel dimensions as 1:1 (1080×1080); transparency is for compositing." : "";
  return `POST LAYOUT:\n- Canvas size: ${sizeLabel}\n- Logo placement: ${pos?.label ?? logoPosition} at ${logoScale}% scale\n- Edge padding: ${padding}px\n- ${bgLine}${exportNote}`;
}

/** Main REQUIREMENTS paragraph — must not contradict white-bg or trns modes. */
export function buildCriticalBackgroundParagraph(designerWhiteBg, postSizeId) {
  if (designerWhiteBg) {
    return `*** CRITICAL — WHITE BG EXPORT (user toggled ON): *** Full-bleed background must be solid #FFFFFF only. Forbidden: outer peach/coral/cream gradient, vignette, or “light wash at 20–30%” across the whole canvas. Forbidden: white card floating on a colored field. Inner chips/cards/diagrams may use subtle fills. The **DESIGNER — SOLID WHITE BACKGROUND** block at the end of this prompt is authoritative.`;
  }
  if (isDesignerTrnsPostSize(postSizeId)) {
    return `*** CRITICAL — TRANSPARENT EXPORT (1:1 trns): *** Full-bleed canvas must be **transparent (alpha)** where there is no intentional artwork. Forbidden: edge-to-edge opaque peach, cream, white, or gradient filling the entire square. Allowed: opaque shapes for cards, icons, text, diagrams — but the **default backdrop** must remain transparent so the app can composite. Ignore any generic line about “do not use a fully transparent background” — it does not apply in trns mode.`;
  }
  return `*** CRITICAL — ONE BACKGROUND ONLY (no \"2 bg\"): *** Do NOT use two layers. FORBIDDEN: outer peach/orange/gradient fill with a white card or white panel on top. FORBIDDEN: colored background visible around the edges of a central white rectangle. FORBIDDEN: white card in the center with gradient around it. REQUIRED: one unified light background only (e.g. one light fill at 20–30% opacity for the whole image). Put all content (icons, list items, text) directly on that one background; no second card or panel behind the content. No white rectangle floating on a colored background. The app has a white/light canvas; do not use a fully transparent background.`;
}

export function buildNumberedBackgroundRule(designerWhiteBg, postSizeId) {
  if (designerWhiteBg) {
    return "1. SINGLE BACKGROUND — Entire canvas flat #FFFFFF; no full-frame gradient or transparency.";
  }
  if (isDesignerTrnsPostSize(postSizeId)) {
    return "1. TRANSPARENT BACKDROP — No full-canvas opaque fill; keep outer/empty areas alpha-transparent; opaque only on deliberate elements.";
  }
  return "1. SINGLE BACKGROUND — One light fill (20–30% opacity) for the whole image only; no second layer, no white card on gradient.";
}

/**
 * @param {object} opts
 * @returns {Promise<string>}
 */
export async function buildDesignerOpenAiImagePrompt(opts) {
  const {
    content,
    rawContentForBrief,
    themeId = "hooks",
    size,
    designerWhiteBg = false,
    /** Same as designer post size control: "1080x1080" | "1080x1080-trns" | "1920x1080" — drives trns + layout copy to the model */
    postSizeId = "1080x1080",
    /** designer tab only — same as LeftPanel headerMode === "designer" */
    headerModeDesigner = true,
    apiKey,
    provider = "openai",
    /** false: render heading/subheading/footer in-image (designer LeftPanel branch when omit is false) */
    omitContentTextInImage = false,
    variationIdx = 0,
    layoutOverrides = {},
  } = opts;

  const L = { ...DEFAULT_LAYOUT_SETTINGS, ...layoutOverrides };
  const selectedTheme = themeId === "none" ? NO_TEMPLATE_THEME : getThemeById(themeId);
  const paletteStr = selectedTheme.palette.join(", ");
  const layoutCtx = buildDesignerPostLayoutContext(
    L.logoPosition,
    L.logoScale,
    L.padding,
    size,
    !!(headerModeDesigner && designerWhiteBg),
    postSizeId
  );
  const critBg = buildCriticalBackgroundParagraph(
    !!(headerModeDesigner && designerWhiteBg),
    postSizeId
  );
  const rule1Bg = buildNumberedBackgroundRule(!!(headerModeDesigner && designerWhiteBg), postSizeId);

  const slotDims = getVisualSlotDimensions({
    size,
    padding: L.padding,
    slotGap: L.slotGap,
    content,
    useHeading: L.useHeading,
    useSubheading: L.useSubheading,
    useFooter: L.useFooter,
    fontSettings: L.fontSettings,
    textSlots: L.textSlots,
    visualSlot: L.visualSlot,
  });
  const visualSlotSizeCtx = `VISUAL SLOT: The image will be displayed in a slot of size ${slotDims.width}×${slotDims.height} pixels (this is the remaining space after heading, subheading, and footer). Generate the image for this exact width×height so it fills the whole slot. The image may be scaled when displayed if the user changes font size or spacing.`;

  const variationHint =
    variationIdx > 0
      ? `\nVARIATION #${variationIdx + 1}: Create a distinctly DIFFERENT composition from previous variations. Use different icon arrangements, card layouts, and visual flow while keeping the same content and color palette.`
      : "";

  const designerWhiteBgClause =
    headerModeDesigner && designerWhiteBg
      ? `\n\n*** DESIGNER — SOLID WHITE BACKGROUND (mandatory; overrides conflicting background rules above): *** The full-bleed canvas background must be pure flat white #FFFFFF only — no outer gradient, peach, cream, gray wash, vignette, or tinted fill behind the entire composition. No colored field with a large white “card” floating on top for the whole image. Inner elements (chips, small cards, diagrams) may use subtle fills for hierarchy. This overrides any instruction to use a single light wash at 20–30% opacity for the whole image — use solid #FFFFFF for the overall background instead. When **1:1 trns** was selected together with white bg, **white wins**: output an opaque white full canvas, not transparency.`
      : "";

  const designerTrnsClause =
    headerModeDesigner && isDesignerTrnsPostSize(postSizeId) && !designerWhiteBg
      ? `\n\n*** DESIGNER — 1:1 TRNS (reinforcement): *** Transparent export mode is ON. The PNG must use **alpha transparency** for unused canvas. Do not “help” by adding a full-frame background color.`
      : "";

  const brandColorRules = `\nBRAND COLOR GUIDANCE (follow strictly):\n- Primary accents: brand gradient orange #FF7404 → pink #FF3BA2 for icons, highlights, and decorative elements.\n- RED COLOR — this is a targeted rule, not a generic guideline: The CONTENT & VISUAL DIRECTION section below contains a VISUAL BRIEF with a ⚑ RED COLOR INSTRUCTION and a RED DECISION field. Read those fields now. If RED DECISION says ACTIVE, apply red #D92D20 to ONLY the exact element(s) named — do not use red anywhere else. If RED DECISION says INACTIVE, do NOT use red anywhere in this image — not as a border, frame, accent, glow, or any form of emphasis. This rule overrides any default behavior.\n- Extended accents: electric teal #06B6D4 or violet #7C3AED may be used as secondary accents when specified in the brief's PALETTE field.\n- Success/protected/secure: green #16B364 only for explicitly positive/secure/approved states.\n- Backgrounds: follow the PALETTE field in the brief. Dark backgrounds (#0A0F1E, #0D0F14) are valid and preferred for security/threat content. On dark backgrounds, use cool white #F0F4FF for labels and annotations.`;

  const isNoTemplate = selectedTheme.isNone;
  const templateCtx = isNoTemplate
    ? `\nYou have full creative freedom for the layout and style. Create a clean, modern, professional social media visual.\n${selectedTheme.visualPrompt}`
    : `\nTHEME REFERENCE (color palette and visual tone ONLY — do NOT copy the template's layout, structure, or content):\nTheme name: "${selectedTheme.label}"\nColor palette: ${paletteStr}\nTone/mood: ${selectedTheme.promptContext}\n\n*** CRITICAL: The template is ONLY a color/style/mood reference. Do NOT replicate the template's layout structure, card arrangement, grid, icons, diagrams, flowcharts, or any visual composition from the template. Create your OWN original layout that best presents the user's content. Use the template's colors and visual tone to style your original layout. ***`;

  const visualBrief = await buildVisualBrief(rawContentForBrief, content, apiKey, provider);
  const contentAndVisualBlock = buildContentAndVisualBlock(
    content,
    visualBrief,
    omitContentTextInImage
  );

  const logoPosition = L.logoPosition;

  const aspectExtra =
    isDesignerTrnsPostSize(postSizeId) && designerWhiteBg
      ? " User selected 1:1 trns + White bg — use opaque white full canvas (not transparency)."
      : isDesignerTrnsPostSize(postSizeId)
        ? " User selected 1:1 trns — transparent compositing export."
        : "";

  const imgPrompt = omitContentTextInImage
    ? `You are an expert graphic designer. Generate a supporting visual (illustration, diagram, or graphic) that will be composed with text displayed separately by the app.\n\n${templateCtx}\n${brandColorRules}\n\n--- CONTENT & VISUAL DIRECTION ---\n${contentAndVisualBlock}\n---\n\n${layoutCtx}\n${visualSlotSizeCtx}\n\nREQUIREMENTS:\n${critBg}\n${rule1Bg}\n2. NO THICK BORDER OR FRAME — Do not add any thick border, frame, or outer margin in brand colors (no orange, pink, peach, or gradient band around the image or around inner containers). No thick colored strip, decorative edge, or "brand frame." Content must fill the slot edge to edge with zero wasted space. Inside cards/containers, keep inner padding minimal — do not create a wide empty "border" inside white boxes; let content use the space.\n3. CURVED BORDERS — Use rounded, curved corners for the overall visual and any main containers; no sharp rectangular edges.\n4. NO LOGO — Do not draw any logo, brand mark, or "Enkrypt". Leave the ${logoPosition} area clear.\n5. NO PRIMARY POST COPY IN-PAINT — The headline, subheading, and footer are NOT part of this image. Never paint them as title or body text; only secondary labels/stats/diagram text per the VISUAL BRIEF.\n6. Use the color palette as guidance: ${paletteStr}. Brand gradient (orange #FF7404 to pink #FF3BA2) for accents; red (#D92D20) for danger/warning; green (#16B364) for success.\n7. ASPECT RATIO: ${size.width === size.height ? "Square (1:1)" : "Landscape (16:9)"}.${aspectExtra}${variationHint}${designerWhiteBgClause}${designerTrnsClause}`
    : `You are an expert graphic designer and visual storyteller. The user has already provided three pieces of content. Your job is to generate an image that brings this content to life — the image must prominently feature and be built around these three elements.\n\n${templateCtx}\n${brandColorRules}\n\n--- CONTENT & VISUAL DIRECTION ---\n${contentAndVisualBlock}\n---\n\nGenerate a visual that:\n- Renders the heading, subheading, and footer as clear, legible text in the image. Place them where they best support the composition.\n- Can include as much additional text as you want: bullet points, labels, stats, captions, annotations, list items, callouts — anything that supports the message.\n- Uses your own layout and composition. Apply the theme's colors and tone. Include icons, illustrations, diagrams, charts, or any visual elements that fit the topic.\n- Feels complete and polished — whatever style best serves the message.\n\n${layoutCtx}\n${visualSlotSizeCtx}\n\nREQUIREMENTS:\n${critBg}\n${rule1Bg}\n2. NO THICK BORDER OR FRAME — Do not add any thick border, frame, or outer margin in brand colors (no orange, pink, peach, or gradient band around the image or around inner containers). No thick colored strip, decorative edge, or "brand frame." Content must fill the slot edge to edge with zero wasted space. Inside cards/containers, keep inner padding minimal — do not create a wide empty "border" inside white boxes; let content use the space.\n3. CURVED BORDERS — Use rounded, curved corners for the overall visual and any main containers; no sharp rectangular edges.\n4. Include the three content pieces above as text in the image. You may use any typography, size, and placement that works. Add any other text that strengthens the visual.\n5. NO LOGO — Do not draw any logo, brand mark, or "Enkrypt". Leave the ${logoPosition} area clear.\n6. Use the color palette as guidance: ${paletteStr}. Brand gradient (orange #FF7404 to pink #FF3BA2) for accents; red (#D92D20) for danger/warning; green (#16B364) for success; near-black for body text where readable.\n7. ASPECT RATIO: ${size.width === size.height ? "Square (1:1)" : "Landscape (16:9)"}.${aspectExtra}\n8. No arbitrary limits on layout, amount of text, or style — do what best communicates the heading, subheading, and footer.${variationHint}${designerWhiteBgClause}${designerTrnsClause}`;

  return imgPrompt;
}
