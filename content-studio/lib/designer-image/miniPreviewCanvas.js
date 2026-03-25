/**
 * Canvas layout + paint for RightPanel mini preview — mirrors designer PreviewPanel
 * general mode (no slot outlines, no logo).
 */

export const CANVAS_FONT = "Inter, sans-serif";
const DEFAULT_SLOT_GAP = 14;
const GRADIENT_STOPS = ["#FF7404", "#FF6F53", "#FF3BA2"];

const weightStr = (w) => {
  const m = { 300: "300", 400: "normal", 500: "500", 600: "600", 700: "bold", 800: "800" };
  return m[w] || `${w}`;
};

export function getDesignerCanvasDimensions(postSizeId) {
  if (postSizeId === "1920x1080") return { width: 1920, height: 1080 };
  return { width: 1080, height: 1080 };
}

function measureWrappedHeight(ctx, text, font, maxW, lineHeight) {
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

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function lerpColor(a, b, t) {
  const pa = hexToRgb(a);
  const pb = hexToRgb(b);
  const r = Math.round(pa.r + (pb.r - pa.r) * t);
  const g = Math.round(pa.g + (pb.g - pa.g) * t);
  const bl = Math.round(pa.b + (pb.b - pa.b) * t);
  return `rgb(${r},${g},${bl})`;
}

function drawCheckerboard(ctx, W, H, cell = 20) {
  ctx.fillStyle = "#E8E8EC";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#D0D0D8";
  for (let y = 0; y < H; y += cell) {
    for (let x = 0; x < W; x += cell) {
      if (((x / cell) ^ (y / cell)) & 1) ctx.fillRect(x, y, cell, cell);
    }
  }
}

function drawFallbackBg(ctx, W, H, postSizeId, whiteBg = false) {
  if (whiteBg) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (postSizeId === "1080x1080-trns") {
    drawCheckerboard(ctx, W, H);
    return;
  }
  const g = ctx.createLinearGradient(0, 0, W, H);
  if (W / H < 1.2) {
    g.addColorStop(0, "#FFF5F0");
    g.addColorStop(1, "#FFE9F0");
  } else {
    g.addColorStop(0, "#FFF8F4");
    g.addColorStop(0.55, "#FFE8EE");
    g.addColorStop(1, "#F5E8FF");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function truncateUi(s, maxLen) {
  const t = String(s || "").trim();
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(0, maxLen - 1))}…`;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} params
 * @returns {object} layout + helpers
 */
export function resolveGeneralPreviewLayout(ctx, params) {
  const {
    W,
    H,
    pad = 20,
    slotGap = DEFAULT_SLOT_GAP,
    content,
    useH = true,
    useSH = true,
    useF = true,
    fs = {
      heading: { size: 40, weight: 600 },
      subheading: { size: 27, weight: 600 },
      footer: { size: 24, weight: 400 },
    },
    vSlot = { widthPct: 100, heightPct: 100, yPct: 14 },
    tSlots = {
      heading: { yPct: 7 },
      subheading: { yPct: 10 },
      footer: { yPct: 80 },
    },
  } = params;

  const maxTextW = W - pad * 2;
  const fontOf = (k) => `${weightStr(fs[k].weight)} ${fs[k].size}px ${CANVAS_FONT}`;
  const lhOf = (k) => fs[k].size * 1.35;
  const ascentOf = (k) => fs[k].size * 0.65;
  const descentOf = (k) => fs[k].size * 0.25;

  const textOf = (k) => {
    if (!content) return "";
    const flags = { heading: useH, subheading: useSH, footer: useF };
    return flags[k] ? content[k] ?? "" : "";
  };

  const computeSlotH = (k) => {
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

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const nextItem = items[i + 1];
    if (item.id === "visual") {
      const visualY = cursor;
      const footerTop = useF ? H - pad - footerH : H - pad;
      const nextTop = nextItem && nextItem.id === "footer" ? footerTop : nextItem ? nextItem.desiredY : H - pad;
      const availableH = nextTop - slotGap - visualY;
      const visualH = Math.max(minVisualH, availableH * ((vSlot.heightPct ?? 100) / 100));
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

  const lastItem = items[items.length - 1];
  if (lastItem && lastItem.id !== "footer") {
    const lr = resolved[lastItem.id];
    if (lr && lr.y + lr.h > H - 8) lr.y = Math.max(8, H - 8 - lr.h);
  }

  return { resolved, maxTextW, pad, fs, useH, useSH, useF, vSlot, fontOf, lhOf, ascentOf, textOf };
}

function drawStyledText(ctx, text, centerX, startY, maxW, lh, baseFont, fSetting, cs) {
  if (!text) return;
  const words = text.split(" ");
  const lines = [];
  let currentLine = [];

  ctx.save();
  ctx.font = baseFont;

  for (let i = 0; i < words.length; i++) {
    const testLine = [...currentLine, { word: words[i], globalIdx: i }];
    const testStr = testLine.map((w) => w.word).join(" ");
    if (ctx.measureText(testStr).width > maxW && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = [{ word: words[i], globalIdx: i }];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine.length > 0) lines.push(currentLine);

  let cy = startY;
  for (const line of lines) {
    let lineW = 0;
    const wordMetrics = [];
    for (let j = 0; j < line.length; j++) {
      const ws = cs.wordStyles[line[j].globalIdx];
      const wordWeight = ws?.weight ?? (ws?.bold ? 700 : fSetting.weight);
      const wordSize = ws?.fontSize ?? fSetting.size;
      ctx.font = `${weightStr(wordWeight)} ${wordSize}px ${CANVAS_FONT}`;
      const suffix = j < line.length - 1 ? " " : "";
      const wm = ctx.measureText(line[j].word + suffix).width;
      wordMetrics.push({ w: wm, entry: line[j] });
      lineW += wm;
    }

    let wx = centerX - lineW / 2;

    for (let j = 0; j < wordMetrics.length; j++) {
      const { w: ww, entry } = wordMetrics[j];
      const ws = cs.wordStyles[entry.globalIdx];
      const wordWeight = ws?.weight ?? (ws?.bold ? 700 : fSetting.weight);
      const wordSize = ws?.fontSize ?? fSetting.size;
      ctx.font = `${weightStr(wordWeight)} ${wordSize}px ${CANVAS_FONT}`;

      if (ws?.useGradient) {
        const grad = ctx.createLinearGradient(wx, cy, wx + ww, cy);
        grad.addColorStop(0, GRADIENT_STOPS[0]);
        grad.addColorStop(0.5, GRADIENT_STOPS[1]);
        grad.addColorStop(1, GRADIENT_STOPS[2]);
        ctx.fillStyle = grad;
      } else if (ws?.color) {
        ctx.fillStyle = ws.color;
      } else if (cs.useGradient) {
        const grad = ctx.createLinearGradient(wx, cy, wx + ww, cy);
        const totalWords = words.length;
        const t = totalWords > 1 ? entry.globalIdx / (totalWords - 1) : 0.5;
        if (t <= 0.5) {
          const lt = t / 0.5;
          grad.addColorStop(0, lerpColor(GRADIENT_STOPS[0], GRADIENT_STOPS[1], lt));
          grad.addColorStop(1, lerpColor(GRADIENT_STOPS[0], GRADIENT_STOPS[1], Math.min(1, lt + 0.2)));
        } else {
          const lt = (t - 0.5) / 0.5;
          grad.addColorStop(0, lerpColor(GRADIENT_STOPS[1], GRADIENT_STOPS[2], lt));
          grad.addColorStop(1, lerpColor(GRADIENT_STOPS[1], GRADIENT_STOPS[2], Math.min(1, lt + 0.2)));
        }
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = cs.baseColor;
      }

      const suffix = j < wordMetrics.length - 1 ? " " : "";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(entry.word + suffix, wx, cy);

      if (ws?.strikethrough) {
        const stY = cy - wordSize * 0.3;
        const textOnlyW = ctx.measureText(entry.word).width;
        ctx.save();
        ctx.strokeStyle = ctx.fillStyle;
        ctx.lineWidth = Math.max(2, wordSize * 0.05);
        ctx.beginPath();
        ctx.moveTo(wx, stY);
        ctx.lineTo(wx + textOnlyW, stY);
        ctx.stroke();
        ctx.restore();
      }

      wx += ww;
    }
    cy += lh;
  }
  ctx.restore();
}

const DEFAULT_T_COLORS = {
  heading: { baseColor: "#FFFFFF", useGradient: true, wordStyles: {} },
  subheading: { baseColor: "#000000", useGradient: false, wordStyles: {} },
  footer: { baseColor: "#FFFFFF", useGradient: true, wordStyles: {} },
};

/** Readable on solid white (matches “White bg” generation intent). */
const TEXT_COLORS_ON_WHITE_BG = {
  heading: { baseColor: "#111827", useGradient: false, wordStyles: {} },
  subheading: { baseColor: "#374151", useGradient: false, wordStyles: {} },
  footer: { baseColor: "#4B5563", useGradient: false, wordStyles: {} },
};

/** Same positioning math as designer-app PreviewPanel.drawLogo */
function drawLogoOnCanvas(ctx, W, H, pad, logoUrl, logoPosition, logoScale) {
  if (!logoUrl) return Promise.resolve();
  return new Promise((resolve) => {
    const logoImg = new Image();
    if (/^https?:\/\//i.test(logoUrl)) logoImg.crossOrigin = "anonymous";
    logoImg.onload = () => {
      const scale = logoScale / 100;
      const baseH = Math.min(W, H) / 12;
      const lH = baseH * scale;
      const lW = (logoImg.naturalWidth / logoImg.naturalHeight) * lH;
      let lX;
      let lY;
      switch (logoPosition) {
        case "top-center":
          lX = (W - lW) / 2;
          lY = pad;
          break;
        case "top-right":
          lX = W - pad - lW;
          lY = pad;
          break;
        case "bottom-left":
          lX = pad;
          lY = H - pad - lH;
          break;
        case "bottom-center":
          lX = (W - lW) / 2;
          lY = H - pad - lH;
          break;
        case "bottom-right":
          lX = W - pad - lW;
          lY = H - pad - lH;
          break;
        case "top-left":
        default:
          lX = pad;
          lY = pad;
          break;
      }
      ctx.drawImage(logoImg, lX, lY, lW, lH);
      resolve();
    };
    logoImg.onerror = () => resolve();
    logoImg.src = logoUrl;
  });
}

/**
 * Paints designer-style preview on canvas (sync after images loaded).
 * Draw order matches PreviewPanel: background → visual → logo → text.
 * @param {HTMLCanvasElement} canvas
 * @param {object} opts
 * @returns {Promise<void>}
 */
export function paintDesignerMiniPreview(canvas, opts) {
  const {
    postSizeId,
    imageUrl,
    content,
    visualImageBorderRadius = 12,
    tColors: tColorsOverride = null,
    logoUrl = null,
    logoPosition = "top-left",
    logoScale = 60,
    hideLogo = false,
    whiteBg = false,
    previewMode = "full",
    thumbDisplayPx = 72,
  } = opts;

  const { width: W, height: H } = getDesignerCanvasDimensions(postSizeId);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve();

  const isThumb = previewMode === "thumb";
  /** Designer fonts on a 1080px canvas scale down to ~2–3px in a 72px tile; boost so text stays legible when cover-scaled. */
  const thumbBoost = isThumb
    ? Math.min(2.08, (Math.min(W, H) / thumbDisplayPx) * (5.5 / 40))
    : 1;

  const baseFs = {
    heading: { size: 40, weight: 600 },
    subheading: { size: 27, weight: 600 },
    footer: { size: 24, weight: 400 },
  };
  const fsScaled = isThumb
    ? {
        heading: { size: Math.round(40 * thumbBoost), weight: 600 },
        subheading: { size: Math.round(27 * thumbBoost), weight: 600 },
        footer: { size: Math.round(24 * thumbBoost), weight: 400 },
      }
    : baseFs;

  let layoutContent = content;
  if (isThumb && content) {
    layoutContent = {
      heading: truncateUi(content.heading, 42),
      subheading: truncateUi(content.subheading, 58),
      footer: truncateUi(content.footer, 38),
    };
  }

  const tColors = tColorsOverride ?? (whiteBg ? TEXT_COLORS_ON_WHITE_BG : DEFAULT_T_COLORS);

  const layout = resolveGeneralPreviewLayout(ctx, {
    W,
    H,
    content: layoutContent,
    useH: true,
    useSH: true,
    useF: true,
    fs: fsScaled,
  });
  const { resolved, maxTextW, pad, fs, useH, useSH, useF, vSlot, fontOf, lhOf, ascentOf } = layout;

  drawFallbackBg(ctx, W, H, postSizeId, whiteBg);

  const vsW = W * (vSlot.widthPct / 100);
  const vsX = (W - vsW) / 2;
  const vr = resolved.visual;

  const drawTextLayer = () => {
    if (!layoutContent) return;
    const fields = ["heading", "subheading", "footer"];
    const flags = { heading: useH, subheading: useSH, footer: useF };
    for (const key of fields) {
      if (!flags[key] || !layoutContent[key]) continue;
      const r = resolved[key];
      if (!r) continue;
      const textY = r.y + ascentOf(key);
      const shadow = !whiteBg && (key === "heading" || key === "footer");
      if (shadow) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.45)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 1;
      }
      drawStyledText(
        ctx,
        layoutContent[key],
        W / 2,
        textY,
        maxTextW,
        lhOf(key),
        fontOf(key),
        fs[key],
        tColors[key],
      );
      if (shadow) ctx.restore();
    }
  };

  const runLogoThenText = () => {
    if (hideLogo) {
      drawTextLayer();
      return Promise.resolve();
    }
    return drawLogoOnCanvas(ctx, W, H, pad, logoUrl, logoPosition, logoScale).then(() => {
      drawTextLayer();
    });
  };

  if (!imageUrl || !vr) {
    return runLogoThenText();
  }

  return new Promise((resolve) => {
    const img = new Image();
    if (/^https?:\/\//i.test(imageUrl)) img.crossOrigin = "anonymous";
    img.onload = () => {
      const slotRatio = vsW / vr.h;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      let w;
      let h;
      if (imgRatio > slotRatio) {
        w = vsW;
        h = vsW / imgRatio;
      } else {
        h = vr.h;
        w = vr.h * imgRatio;
      }
      const drawX = vsX + (vsW - w) / 2;
      const drawY = vr.y + (vr.h - h) / 2;
      const vRad = Math.min(visualImageBorderRadius, vsW / 2, vr.h / 2);
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(vsX, vr.y, vsW, vr.h, vRad);
      ctx.clip();
      ctx.drawImage(img, drawX, drawY, w, h);
      ctx.restore();
      runLogoThenText().then(resolve);
    };
    img.onerror = () => {
      runLogoThenText().then(resolve);
    };
    img.src = imageUrl;
  });
}
