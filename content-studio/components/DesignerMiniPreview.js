"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { resolveDesignerPreviewContent } from "@/lib/designer-image/extractContent";
import {
  getDesignerCanvasDimensions,
  paintDesignerMiniPreview,
} from "@/lib/designer-image/miniPreviewCanvas";

/**
 * Right-panel thumbnail: same layout as designer PreviewPanel (bg + heading/sub/footer + visual).
 * Click opens designer overlay only (no image lightbox).
 */
export default function DesignerMiniPreview({
  imageUrl,
  sourceText,
  postSizeId = "1080x1080",
  heightPx = 140,
  whiteBg = false,
  designerContent = null,
  onOpenDesigner,
  slotLabel,
  visualSlots = null,
}) {
  const openDesigner = () => onOpenDesigner?.(imageUrl, designerContent, visualSlots);
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [scale, setScale] = useState({ sx: 1, sy: 1, left: 0, top: 0 });

  const recomputeScale = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cw = wrap.clientWidth;
    const ch = heightPx;
    const { width: W, height: H } = getDesignerCanvasDimensions(postSizeId);
    const s = Math.max(cw / W, ch / H);
    setScale({
      sx: s,
      sy: s,
      left: (cw - W * s) / 2,
      top: (ch - H * s) / 2,
    });
  }, [postSizeId, heightPx]);

  useEffect(() => {
    recomputeScale();
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => recomputeScale());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [recomputeScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageUrl) return;
    let cancelled = false;
    const content = resolveDesignerPreviewContent(sourceText, designerContent);
    paintDesignerMiniPreview(canvas, {
      postSizeId,
      imageUrl,
      content,
      whiteBg,
      previewMode: "full",
    }).then(() => {
      if (!cancelled) recomputeScale();
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl, sourceText, postSizeId, whiteBg, designerContent, recomputeScale]);

  const { width: iw, height: ih } = getDesignerCanvasDimensions(postSizeId);

  return (
    <div style={{ marginTop: 12 }}>
      <div
        ref={wrapRef}
        role="button"
        tabIndex={0}
        onClick={openDesigner}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openDesigner();
          }
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: "100%",
          height: heightPx,
          borderRadius: 10,
          overflow: "hidden",
          cursor: "pointer",
          position: "relative",
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(0,0,0,0.2)",
        }}
        title="Open visual designer"
      >
        <canvas
          ref={canvasRef}
          width={iw}
          height={ih}
          style={{
            position: "absolute",
            width: iw * scale.sx,
            height: ih * scale.sy,
            left: scale.left,
            top: scale.top,
            display: "block",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: hover ? 1 : 0,
            transition: "opacity 0.2s",
            background: "rgba(0,0,0,0.35)",
            pointerEvents: "none",
            fontSize: 13,
            fontWeight: 600,
            color: "white",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Open designer
        </div>
      </div>
      {slotLabel ? (
        <div style={{ fontSize: 10, color: "#52556B", marginTop: 6, fontWeight: 600 }}>{slotLabel}</div>
      ) : null}
    </div>
  );
}
