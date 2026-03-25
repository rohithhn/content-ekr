/**
 * Server-side visual slot dimensions — mirrors designer-app visualSlotLayout.ts
 * without DOM canvas (uses word-wrap estimate aligned with measureWrappedHeight behavior).
 */

const DEFAULT_SLOT_GAP = 14;
const CANVAS_FONT_LABEL = "Inter, sans-serif";

function weightStr(w) {
  const m = { 300: "300", 400: "normal", 500: "500", 600: "600", 700: "bold", 800: "800" };
  return m[w] ?? `${w}`;
}

function measureWrappedHeight(text, fontSize, weight, maxW) {
  if (!text) return 0;
  const weightFactor = weight >= 600 ? 1.05 : 1;
  const avgCharW = fontSize * 0.52 * weightFactor;
  const lineHeight = fontSize * 1.35;
  const charsPerLine = Math.max(8, Math.floor(maxW / avgCharW));
  const words = text.split(/\s+/).filter(Boolean);
  let lines = 1;
  let currentLen = 0;
  for (const word of words) {
    const wlen = word.length + (currentLen > 0 ? 1 : 0);
    if (currentLen + wlen > charsPerLine && currentLen > 0) {
      lines++;
      currentLen = word.length;
    } else {
      currentLen += wlen;
    }
  }
  return lines * lineHeight;
}

export function getVisualSlotDimensions(input) {
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

  const maxTextW = W - pad * 2;
  const fontOf = (k) => `${weightStr(fs[k].weight)} ${fs[k].size}px ${CANVAS_FONT_LABEL}`;
  const lhOf = (k) => fs[k].size * 1.35;
  const textOf = (k) => {
    if (!content) return "";
    const flags = { heading: useH, subheading: useSH, footer: useF };
    return flags[k] ? content[k] ?? "" : "";
  };
  const ascentOf = (k) => fs[k].size * 0.65;
  const descentOf = (k) => fs[k].size * 0.25;
  const computeSlotH = (k) => {
    const txt = textOf(k);
    const lineH = lhOf(k);
    const rawTextH = txt
      ? measureWrappedHeight(txt, fs[k].size, fs[k].weight, maxTextW)
      : 0;
    const ascent = ascentOf(k);
    const descent = descentOf(k);
    if (rawTextH <= 0) return ascent + lineH;
    return ascent + rawTextH - lineH + descent;
  };

  const headingH = useH ? computeSlotH("heading") : 0;
  const subheadingH = useSH ? computeSlotH("subheading") : 0;
  const footerH = useF ? computeSlotH("footer") : 0;

  const items = [];
  const visualDesiredY = H * ((vSlot.yPct ?? 14) / 100);
  if (useH) items.push({ id: "heading", desiredY: H * (tSlots.heading.yPct / 100), h: headingH });
  if (useSH) items.push({ id: "subheading", desiredY: H * (tSlots.subheading.yPct / 100), h: subheadingH });
  items.push({ id: "visual", desiredY: visualDesiredY, h: 0 });
  if (useF) items.push({ id: "footer", desiredY: H * (tSlots.footer.yPct / 100), h: footerH });

  items.sort((a, b) => a.desiredY - b.desiredY);

  const resolved = {};
  let cursor = Math.max(pad * 0.4, 8);
  const minVisualH = 40;
  const footerTop = useF ? H - pad - footerH : H - pad;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const nextItem = items[i + 1];
    if (item.id === "visual") {
      const visualY = cursor;
      const nextTop =
        nextItem && nextItem.id === "footer" ? footerTop : nextItem ? nextItem.desiredY : H - pad;
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
