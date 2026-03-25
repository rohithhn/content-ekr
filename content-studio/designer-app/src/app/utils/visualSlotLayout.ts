/**
 * Compute visual slot pixel dimensions for the current layout (general mode).
 * Used so the image generation prompt can request the exact size; the image
 * is then scaled in the slot if the user changes font size, gap, etc.
 */

const CANVAS_FONT = "Inter, sans-serif";
const DEFAULT_SLOT_GAP = 14;

function weightStr(w: number): string {
  const m: Record<number, string> = { 300: "300", 400: "normal", 500: "500", 600: "600", 700: "bold", 800: "800" };
  return m[w] ?? `${w}`;
}

function measureWrappedHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxW: number,
  lineHeight: number,
): number {
  if (!text) return 0;
  ctx.save();
  ctx.font = font;
  const words = text.split(" ");
  let line = "";
  let lines = 1;
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > maxW && line !== "") {
      lines++;
      line = word + " ";
    } else {
      line = test;
    }
  }
  ctx.restore();
  return lines * lineHeight;
}

export interface VisualSlotLayoutInput {
  size: { width: number; height: number };
  padding?: number;
  slotGap?: number;
  content: { heading: string; subheading: string; footer: string } | null;
  useHeading?: boolean;
  useSubheading?: boolean;
  useFooter?: boolean;
  fontSettings: {
    heading: { size: number; weight: number };
    subheading: { size: number; weight: number };
    footer: { size: number; weight: number };
  };
  textSlots: {
    heading: { yPct: number };
    subheading: { yPct: number };
    footer: { yPct: number };
  };
  visualSlot?: { yPct?: number; heightPct?: number };
}

export interface VisualSlotDimensions {
  width: number;
  height: number;
}

/**
 * Returns the visual slot dimensions in pixels for general mode layout.
 * Uses an offscreen canvas to measure text so dimensions match the preview.
 */
export function getVisualSlotDimensions(input: VisualSlotLayoutInput): VisualSlotDimensions {
  const W = input.size.width;
  const H = input.size.height;
  const pad = input.padding ?? 20;
  const slotGap = input.slotGap ?? DEFAULT_SLOT_GAP;
  const content = input.content;
  const useH = input.useHeading ?? true;
  const useSH = input.useSubheading ?? true;
  const useF = input.useFooter ?? true;
  const fs = input.fontSettings;
  const tSlots = input.textSlots;
  const vSlot = input.visualSlot ?? { yPct: 14 };

  const canvas = typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) {
    const fallbackW = W - pad * 2;
    const fallbackH = Math.max(40, H * 0.5);
    return { width: fallbackW, height: fallbackH };
  }

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: W - pad * 2, height: Math.max(40, H * 0.5) };

  const maxTextW = W - pad * 2;
  const fontOf = (k: "heading" | "subheading" | "footer") =>
    `${weightStr(fs[k].weight)} ${fs[k].size}px ${CANVAS_FONT}`;
  const lhOf = (k: "heading" | "subheading" | "footer") => fs[k].size * 1.35;
  const textOf = (k: "heading" | "subheading" | "footer"): string => {
    if (!content) return "";
    const flags = { heading: useH, subheading: useSH, footer: useF };
    return flags[k] ? (content[k] ?? "") : "";
  };
  const ascentOf = (k: "heading" | "subheading" | "footer") => fs[k].size * 0.65;
  const descentOf = (k: "heading" | "subheading" | "footer") => fs[k].size * 0.25;
  const computeSlotH = (k: "heading" | "subheading" | "footer") => {
    const txt = textOf(k);
    const lineH = lhOf(k);
    const rawTextH = txt ? measureWrappedHeight(ctx, txt, fontOf(k), maxTextW, lineH) : 0;
    const ascent = ascentOf(k);
    const descent = descentOf(k);
    if (rawTextH <= 0) return ascent + lineH;
    return ascent + rawTextH - lineH + descent;
  };

  const headingH = useH ? computeSlotH("heading") : 0;
  const subheadingH = useSH ? computeSlotH("subheading") : 0;
  const footerH = useF ? computeSlotH("footer") : 0;

  interface LayoutItem {
    id: "heading" | "subheading" | "visual" | "footer";
    desiredY: number;
    h: number;
  }
  const items: LayoutItem[] = [];
  const visualDesiredY = H * ((vSlot.yPct ?? 14) / 100);
  if (useH) items.push({ id: "heading", desiredY: H * (tSlots.heading.yPct / 100), h: headingH });
  if (useSH) items.push({ id: "subheading", desiredY: H * (tSlots.subheading.yPct / 100), h: subheadingH });
  items.push({ id: "visual", desiredY: visualDesiredY, h: 0 });
  if (useF) items.push({ id: "footer", desiredY: H * (tSlots.footer.yPct / 100), h: footerH });

  items.sort((a, b) => a.desiredY - b.desiredY);

  const resolved: Record<string, { y: number; h: number }> = {};
  let cursor = Math.max(pad * 0.4, 8);
  const minVisualH = 40;

  const footerTop = useF ? H - pad - footerH : H - pad;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const nextItem = items[i + 1];
    if (item.id === "visual") {
      const visualY = cursor;
      const nextTop = nextItem && nextItem.id === "footer" ? footerTop : (nextItem ? nextItem.desiredY : H - pad);
      const availableH = nextTop - slotGap - visualY;
      const heightPct = vSlot.heightPct ?? 100;
      const visualH = Math.max(minVisualH, availableH * (heightPct / 100));
      resolved.visual = { y: visualY, h: visualH };
      cursor = visualY + visualH + slotGap;
    } else if (item.id === "footer") {
      resolved.footer = { y: H - pad - item.h, h: item.h };
      cursor = H - pad - item.h + item.h + slotGap;
    } else {
      const targetY = Math.max(item.desiredY, cursor);
      resolved[item.id] = { y: targetY, h: item.h };
      cursor = targetY + item.h + slotGap;
    }
  }

  const width = W - pad * 2;
  const height = resolved.visual?.h ?? minVisualH;
  return { width, height };
}
