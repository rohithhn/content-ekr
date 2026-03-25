"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { resolveDesignerPreviewContent } from "@/lib/designer-image/extractContent";
import {
  getDesignerCanvasDimensions,
  paintDesignerMiniPreview,
} from "@/lib/designer-image/miniPreviewCanvas";
import {
  DESIGNER_EMBED_THUMB_POST_SIZE,
  DESIGNER_EMBED_DEFAULT_LOGO_POSITION,
  DESIGNER_EMBED_DEFAULT_LOGO_SCALE,
} from "@/lib/designer-image/designerEmbedDefaults";

const THUMB_PX = 72;

/**
 * 72×72 GenerationCard visual: same layout as designer PreviewPanel, with boosted typography so
 * heading/sub/footer stay visible at this size. Uses workspace post size + white-bg toggles.
 */
export default function DesignerPreviewThumb({
  imageUrl,
  sourceText,
  logoUrl,
  postSizeId = DESIGNER_EMBED_THUMB_POST_SIZE,
  whiteBg = false,
  hideLogo = false,
  /** From designer structure API — same slots as designer-app LeftPanel */
  designerContent = null,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [scale, setScale] = useState({ sx: 1, sy: 1, left: 0, top: 0 });

  const recomputeScale = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cw = THUMB_PX;
    const ch = THUMB_PX;
    const { width: W, height: H } = getDesignerCanvasDimensions(postSizeId);
    const s = Math.max(cw / W, ch / H);
    setScale({
      sx: s,
      sy: s,
      left: (cw - W * s) / 2,
      top: (ch - H * s) / 2,
    });
  }, [postSizeId]);

  useEffect(() => {
    recomputeScale();
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
      logoUrl: logoUrl || null,
      logoPosition: DESIGNER_EMBED_DEFAULT_LOGO_POSITION,
      logoScale: DESIGNER_EMBED_DEFAULT_LOGO_SCALE,
      hideLogo,
      whiteBg,
      previewMode: "thumb",
      thumbDisplayPx: THUMB_PX,
    }).then(() => {
      if (!cancelled) recomputeScale();
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl, sourceText, logoUrl, postSizeId, whiteBg, hideLogo, designerContent, recomputeScale]);

  const { width: iw, height: ih } = getDesignerCanvasDimensions(postSizeId);

  return (
    <div
      ref={wrapRef}
      style={{
        width: THUMB_PX,
        height: THUMB_PX,
        borderRadius: 8,
        overflow: "hidden",
        position: "relative",
        background: "rgba(0,0,0,0.2)",
      }}
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
    </div>
  );
}
