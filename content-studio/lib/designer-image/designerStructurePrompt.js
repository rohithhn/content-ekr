/**
 * Port of designer-app LeftPanel `handleGenerateStructure` text path (no user-uploaded image).
 * Keep in sync when designer structure prompt changes.
 */

import { getThemeById } from "./themes";
import {
  postSizeIdToCanvasSize,
  isDesignerTrnsPostSize,
} from "./buildDesignerOpenAiPrompt";
import { brandDisplayName } from "@/lib/brand/brandLogos";

const POSITION_LABELS = {
  "top-left": "↖ Top Left",
  "top-center": "↑ Top Center",
  "top-right": "↗ Top Right",
  "bottom-left": "↙ Bottom Left",
  "bottom-center": "↓ Bottom Center",
  "bottom-right": "↘ Bottom Right",
};

/** Defaults aligned with buildDesignerOpenAiPrompt DEFAULT_LAYOUT_SETTINGS */
export const STRUCTURE_DEFAULT_LAYOUT = {
  logoPosition: "top-left",
  logoScale: 60,
  padding: 20,
};

function buildLayoutContextLines(postSizeId, designerWhiteBg = false) {
  const size = postSizeIdToCanvasSize(
    postSizeId === "1080x1080-trns" ? "1080x1080" : postSizeId || "1080x1080"
  );
  const { logoPosition, logoScale, padding } = STRUCTURE_DEFAULT_LAYOUT;
  const posLabel = POSITION_LABELS[logoPosition] || logoPosition;
  const sizeLabel =
    size.width === size.height ? "1:1 square (1080×1080)" : "16:9 landscape (1920×1080)";
  const trns = isDesignerTrnsPostSize(postSizeId);
  let bgLine;
  if (designerWhiteBg) {
    bgLine =
      "Background: User selected **White bg ON** — export uses solid flat #FFFFFF for the full canvas. Do not assume a peach/coral gradient is “already behind” the image; structure and tone should suit a clean white canvas.";
  } else if (trns) {
    bgLine =
      "Background: User selected **1:1 trns** — TRANSPARENT EXPORT. The app composites on arbitrary backgrounds; favor copy that stays clear on both light and dark surfaces.";
  } else {
    bgLine =
      "Background: a single soft light wash from the **active brand palette** (see Content Studio brand context if provided) — not a specific third-party gradient unless the brief says so.";
  }
  const exportNote = trns
    ? "\n- Export note: Same pixel dimensions as 1:1 (1080×1080); transparency is for compositing."
    : "";
  return `POST LAYOUT:\n- Canvas size: ${sizeLabel}\n- Logo placement: ${posLabel} at ${logoScale}% scale\n- Edge padding: ${padding}px\n- ${bgLine}${exportNote}`;
}

/**
 * @param {object} p
 * @param {string} p.rawContent — channel copy / topic (same substance as designer rawContent)
 * @param {string} [p.themeId]
 * @param {string} [p.postSizeId]
 * @param {boolean} [p.designerWhiteBg] — same as designer / image prompt: solid white canvas vs gradient vs trns
 * @param {string} [p.customInstructions]
 * @returns {string} user message for chat completions
 */
export function buildDesignerStructureUserPrompt({
  rawContent,
  themeId = "none",
  postSizeId = "1080x1080",
  designerWhiteBg = false,
  customInstructions = "",
  brand = null,
}) {
  const selectedTheme = getThemeById(themeId);
  const paletteStr = selectedTheme.palette.join(", ");
  const layoutCtx = buildLayoutContextLines(postSizeId, !!designerWhiteBg);
  const customInstr = customInstructions.trim()
    ? `\n\nCUSTOM INSTRUCTIONS FROM USER:\n${customInstructions.trim()}`
    : "";
  const isNoTemplate = !!selectedTheme.isNone;

  const sourceDesc =
    "Take the following raw content and structure it into text fields that would fit naturally into the template layout shown in the image.";

  const brandLine =
    brand && typeof brand === "object"
      ? `Active brand (use in footer/tagline **only** when it fits the topic): **${brandDisplayName(brand)}**. Do **not** substitute "Enkrypt AI" or other companies unless the raw content is about them.\n\n`
      : `Do **not** substitute unrelated company names (e.g. "Enkrypt AI") unless the raw content is explicitly about that company.\n\n`;

  return `You structure short on-image copy (heading / subheading / footer) for social visuals.\n\n${brandLine}${
    isNoTemplate
      ? "No specific template is selected. Use a clean, modern, professional tone."
      : `Style reference: "${selectedTheme.label}"\n${selectedTheme.promptContext}`
  }\nCOLOR PALETTE: ${paletteStr}\n\n${layoutCtx}\n\nIMPORTANT: Generate content based SOLELY on the user's raw content below. Do NOT use any text or subject matter from any template.\n\nYOUR TASK:\n${sourceDesc} Structure the USER'S content into heading, subheading, and footer fields.${
    isNoTemplate ? "" : " Match the template's tone/style but use ONLY the user's topic."
  }\n\nRAW CONTENT (use ONLY this for topic and substance):\n${rawContent.trim()}\n${customInstr}\n\nReturn ONLY valid JSON — no markdown, no explanation:\n{\n    "heading": "catchy heading from the user's content (max 10 words)",\n    "subheading": "supporting text from the user's content (max 15 words)",\n    "footer": "call-to-action or tagline relevant to the user's topic (max 10 words)"\n}`;
}
