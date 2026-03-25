/**
 * studioComponentRenderer — converts a LayoutSpec (array of primitive specs)
 * into fabric.js objects and adds them to a fabric.Canvas.
 *
 * Every spec becomes a SEPARATE, independently selectable fabric object.
 * Groups are used only for arrows (shaft + arrowhead are atomic).
 *
 * All coordinate/size values in specs are 0–1 fractions of CANVAS_RES.
 */

import * as fabric from "fabric";
import type {
  ComponentSpec, RectSpec, CircleSpec, TextSpec,
  IconSpec, LineSpec, ArrowSpec, LayoutSpec,
} from "./studioLayoutGenerator";
import { iconToDataURL } from "./studioIconRenderer";

const CANVAS_RES = 1080;

// ── Shadow helper ────────────────────────────────────────────────────────────
function makeShadow(blur = 24, color = "rgba(0,0,0,0.18)") {
  return new fabric.Shadow({ blur, color, offsetX: 0, offsetY: 6 });
}

// ── Rect ─────────────────────────────────────────────────────────────────────
function renderRect(spec: RectSpec): fabric.Rect {
  const R = CANVAS_RES;
  return new fabric.Rect({
    left: spec.x * R,
    top: spec.y * R,
    width: spec.w * R,
    height: spec.h * R,
    fill: spec.fill,
    opacity: spec.opacity ?? 1,
    rx: spec.radius ?? 0,
    ry: spec.radius ?? 0,
    stroke: spec.stroke ?? "",
    strokeWidth: spec.strokeWidth ? spec.strokeWidth * R : 0,
    shadow: spec.shadow ? makeShadow(spec.shadowBlur ?? 24, spec.shadowColor ?? "rgba(0,0,0,0.18)") : undefined,
    angle: spec.angle ?? 0,
    selectable: true,
    evented: true,
  });
}

// ── Circle ───────────────────────────────────────────────────────────────────
function renderCircle(spec: CircleSpec): fabric.Circle {
  const R = CANVAS_RES;
  const r = spec.r * R;
  return new fabric.Circle({
    left: spec.cx * R - r,
    top: spec.cy * R - r,
    radius: r,
    fill: spec.fill,
    opacity: spec.opacity ?? 1,
    stroke: spec.stroke ?? "",
    strokeWidth: spec.strokeWidth ? spec.strokeWidth * R : 0,
    shadow: spec.shadow ? makeShadow() : undefined,
    selectable: true,
    evented: true,
  });
}

// ── Text ─────────────────────────────────────────────────────────────────────
function renderText(spec: TextSpec): fabric.Textbox {
  const R = CANVAS_RES;
  return new fabric.Textbox(spec.content, {
    left: spec.x * R,
    top: spec.y * R,
    width: spec.w * R,
    fontSize: spec.fontSize * R,
    fontWeight: spec.fontWeight ?? "400",
    fontStyle: spec.italic ? "italic" : "normal",
    fontFamily: "Inter, sans-serif",
    fill: spec.color,
    opacity: spec.opacity ?? 1,
    textAlign: spec.align ?? "left",
    splitByGrapheme: false,
    selectable: true,
    evented: true,
    editable: true,
  });
}

// ── Icon ─────────────────────────────────────────────────────────────────────
async function renderIcon(spec: IconSpec): Promise<fabric.Image | null> {
  const R = CANVAS_RES;
  const sizePx = Math.round(spec.size * R);
  const dataURL = iconToDataURL(spec.name, spec.color, sizePx);
  if (!dataURL) return null;

  try {
    const img = await fabric.Image.fromURL(dataURL);
    img.set({
      left: spec.cx * R - sizePx / 2,
      top: spec.cy * R - sizePx / 2,
      opacity: spec.opacity ?? 1,
      selectable: true,
      evented: true,
    });
    // Scale to exact sizePx
    const naturalW = img.width ?? sizePx;
    const scale = sizePx / naturalW;
    img.set({ scaleX: scale, scaleY: scale });
    return img;
  } catch {
    return null;
  }
}

// ── Line ─────────────────────────────────────────────────────────────────────
function renderLine(spec: LineSpec): fabric.Line {
  const R = CANVAS_RES;
  const sw = (spec.strokeWidth ?? 0.002) * R;
  return new fabric.Line(
    [spec.x1 * R, spec.y1 * R, spec.x2 * R, spec.y2 * R],
    {
      stroke: spec.color,
      strokeWidth: sw,
      strokeDashArray: spec.dashed ? [sw * 3, sw * 2] : undefined,
      opacity: spec.opacity ?? 1,
      selectable: true,
      evented: true,
    }
  );
}

// ── Arrow ────────────────────────────────────────────────────────────────────
function renderArrow(spec: ArrowSpec): fabric.Group {
  const R = CANVAS_RES;
  const x1 = spec.x1 * R, y1 = spec.y1 * R;
  const x2 = spec.x2 * R, y2 = spec.y2 * R;
  const sw = (spec.strokeWidth ?? 0.002) * R;
  const headLen = Math.max(sw * 5, 12);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const color = spec.color;
  const dashArr = spec.dashed ? [sw * 3, sw * 2] : undefined;

  // Shaft endpoint shortened to not overlap arrowhead
  const shaftEndX = x2 - Math.cos(angle) * headLen;
  const shaftEndY = y2 - Math.sin(angle) * headLen;

  let shaftObj: fabric.Object;

  if (spec.curved) {
    // Quadratic bezier — control point offset perpendicular to direction
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const perp = angle + Math.PI / 2;
    const bend = Math.hypot(x2 - x1, y2 - y1) * 0.25;
    const cx = mx + Math.cos(perp) * bend;
    const cy = my + Math.sin(perp) * bend;
    shaftObj = new fabric.Path(
      `M ${x1} ${y1} Q ${cx} ${cy} ${shaftEndX} ${shaftEndY}`,
      { stroke: color, strokeWidth: sw, fill: "transparent",
        strokeDashArray: dashArr, selectable: false, evented: false }
    );
  } else {
    shaftObj = new fabric.Line([x1, y1, shaftEndX, shaftEndY], {
      stroke: color, strokeWidth: sw,
      strokeDashArray: dashArr, selectable: false, evented: false,
    });
  }

  // Arrowhead triangle using Path
  const p1x = x2, p1y = y2;
  const p2x = x2 - Math.cos(angle - Math.PI / 6) * headLen;
  const p2y = y2 - Math.sin(angle - Math.PI / 6) * headLen;
  const p3x = x2 - Math.cos(angle + Math.PI / 6) * headLen;
  const p3y = y2 - Math.sin(angle + Math.PI / 6) * headLen;

  const head = new fabric.Path(
    `M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} Z`,
    { fill: color, stroke: "transparent", selectable: false, evented: false }
  );

  return new fabric.Group([shaftObj, head], {
    opacity: spec.opacity ?? 1,
    selectable: true,
    evented: true,
  });
}

// ── Heading / subheading / footer text slots ──────────────────────────────────

export function buildTextSlots(content: {
  heading: string; subheading: string; footer: string;
}): fabric.Textbox[] {
  const R = CANVAS_RES;

  const heading = new fabric.Textbox(content.heading || "Heading", {
    left: R * 0.05, top: R * 0.07, width: R * 0.90,
    fontSize: 72, fontWeight: "700", fontFamily: "Inter, sans-serif",
    fill: "#FFFFFF", textAlign: "left",
    selectable: true, evented: true, editable: true,
  });
  (heading as any).__studioRole = "heading";

  const subheading = new fabric.Textbox(content.subheading || "Subheading", {
    left: R * 0.05, top: R * 0.10, width: R * 0.90,
    fontSize: 44, fontWeight: "500", fontFamily: "Inter, sans-serif",
    fill: "#FFFFFF", opacity: 0.88, textAlign: "left",
    selectable: true, evented: true, editable: true,
  });
  (subheading as any).__studioRole = "subheading";

  const footer = new fabric.Textbox(content.footer || "Footer", {
    left: R * 0.05, top: R * 0.80, width: R * 0.90,
    fontSize: 36, fontWeight: "400", fontFamily: "Inter, sans-serif",
    fill: "#FFFFFF", textAlign: "left",
    selectable: true, evented: true, editable: true,
  });
  (footer as any).__studioRole = "footer";

  return [heading, subheading, footer];
}

// ── Main renderer ─────────────────────────────────────────────────────────────

/**
 * Renders the full layout spec onto the fabric canvas.
 * Layout components are added first (behind text slots).
 * Text slots (heading/subheading/footer) are added on top.
 * Returns the list of added fabric objects (excluding text slots).
 */
export async function renderLayout(
  fc: fabric.Canvas,
  layout: LayoutSpec,
  content: { heading: string; subheading: string; footer: string }
): Promise<void> {
  fc.clear();

  const objects: fabric.Object[] = [];

  // Render layout components
  for (const spec of layout.components) {
    let obj: fabric.Object | null = null;

    switch (spec.type) {
      case "rect":   obj = renderRect(spec); break;
      case "circle": obj = renderCircle(spec); break;
      case "text":   obj = renderText(spec); break;
      case "icon":   obj = await renderIcon(spec); break;
      case "line":   obj = renderLine(spec); break;
      case "arrow":  obj = renderArrow(spec); break;
    }

    if (obj) {
      (obj as any).id = Math.random().toString(36).slice(2, 9);
      objects.push(obj);
    }
  }

  // Add layout objects bottom → top
  objects.forEach((o) => fc.add(o));

  // Add AI image if provided (behind layout, above background)
  // (handled separately by the caller via fc.sendObjectToBack)

  // Add text slots last so they're always on top
  const slots = buildTextSlots(content);
  slots.forEach((s) => {
    (s as any).id = Math.random().toString(36).slice(2, 9);
    fc.add(s);
    fc.bringObjectToFront(s);
  });

  fc.renderAll();
}

/**
 * Load an AI-generated image onto the canvas (v2).
 * Placed behind all layout objects but above the static background.
 * The canvas must already have layout objects on it.
 */
export async function renderAIImage(
  fc: fabric.Canvas,
  imageDataURL: string
): Promise<void> {
  const R = CANVAS_RES;
  const img = await fabric.Image.fromURL(imageDataURL);

  // Scale to fill canvas center zone (heading zone top 17%, footer zone bottom 17%)
  const maxH = R * 0.75;
  const maxW = R * 0.92;
  const scale = Math.min(maxW / (img.width ?? R), maxH / (img.height ?? R));

  img.set({
    left: R / 2,
    top: R * 0.50,
    originX: "center",
    originY: "center",
    scaleX: scale,
    scaleY: scale,
    selectable: true,
    evented: true,
    opacity: 0.92,
  });
  (img as any).id = "ai-image";
  (img as any).__studioRole = "aiImage";

  fc.add(img);

  // Push behind all layout objects but keep above the static HTML background
  // (all non-aiImage objects were added before it)
  fc.sendObjectToBack(img);

  fc.renderAll();
}
