"use client";

import { useEffect, useRef, useState } from "react";
import {
  writeStudioBrandToSession,
  clearStudioBrandSession,
  writeDesignerAnthropicToSession,
  clearDesignerAnthropicSession,
  clearDesignerEmbedPayloadSession,
} from "@/lib/brand/studioBrandBridge";

const DESIGNER_INDEX = "/designer/index.html";

/** Parent → iframe: swap generated image (Content Studio overlay picker). */
export const CE_DESIGNER_EMBED_VISUAL_MSG = "ce-designer-embed-visual";

/**
 * Call immediately before opening the overlay so the iframe can read on load.
 * @param {string|null} imageUrl
 * @param {{ heading?: string, subheading?: string, footer?: string }|null} designerContent — same JSON step as designer LeftPanel
 * @param {{ postSizeId?: string, designerWhiteBg?: boolean, themeId?: string, hideLogo?: boolean }|null} [layout] — matches CenterPanel / structure + image APIs
 * @param {object|null} [brandFromStudio] — active brand from Brand Editor (colors, logos, placement); passed to designer iframe
 * @param {string|null|undefined} [anthropicKeyForBrief] — Claude API key for visual-brief step (merged with designer prompt); OpenAI/Gemini still generate pixels
 */
export function primeDesignerEmbed(imageUrl, designerContent, layout, brandFromStudio = null, anthropicKeyForBrief = null) {
  try {
    if (imageUrl) sessionStorage.setItem("ce_designer_embed_visual", imageUrl);
    else sessionStorage.removeItem("ce_designer_embed_visual");
    if (
      designerContent &&
      typeof designerContent === "object" &&
      (designerContent.heading || designerContent.subheading || designerContent.footer)
    ) {
      sessionStorage.setItem(
        "ce_designer_embed_content",
        JSON.stringify({
          heading: String(designerContent.heading || ""),
          subheading: String(designerContent.subheading || ""),
          footer: String(designerContent.footer || ""),
        })
      );
    } else {
      sessionStorage.removeItem("ce_designer_embed_content");
    }
    if (layout && typeof layout === "object") {
      const pid = layout.postSizeId || "1080x1080";
      sessionStorage.setItem("ce_designer_embed_post_size_id", String(pid));
      sessionStorage.setItem("ce_designer_embed_white_bg", layout.designerWhiteBg ? "1" : "0");
      const tid = layout.themeId != null && String(layout.themeId) !== "" ? String(layout.themeId) : "none";
      sessionStorage.setItem("ce_designer_embed_theme_id", tid);
      sessionStorage.setItem(
        "ce_designer_embed_hide_logo",
        layout.hideLogo ? "1" : "0"
      );
    } else {
      sessionStorage.removeItem("ce_designer_embed_post_size_id");
      sessionStorage.removeItem("ce_designer_embed_white_bg");
      sessionStorage.removeItem("ce_designer_embed_theme_id");
      sessionStorage.removeItem("ce_designer_embed_hide_logo");
    }
    writeStudioBrandToSession(
      brandFromStudio,
      typeof window !== "undefined" ? window.location.origin : ""
    );
    writeDesignerAnthropicToSession(anthropicKeyForBrief);
  } catch {
    /* ignore */
  }
}

const EMBED_SETTINGS_MSG = "ce-designer-embed-settings";

export default function DesignerOverlay({
  open,
  embedKey,
  onClose,
  onEmbedSettings,
  visualOptions = [],
  activeVisualIndex = 0,
  onActiveVisualIndexChange,
}) {
  const iframeRef = useRef(null);
  const [iframeReady, setIframeReady] = useState(false);
  const skipPostUntilUserSwapRef = useRef(true);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (wasOpenRef.current && !open) {
      clearDesignerEmbedPayloadSession();
      clearStudioBrandSession();
      clearDesignerAnthropicSession();
    }
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) {
      setIframeReady(false);
      skipPostUntilUserSwapRef.current = true;
    }
  }, [open]);

  useEffect(() => {
    skipPostUntilUserSwapRef.current = true;
    setIframeReady(false);
  }, [embedKey]);

  useEffect(() => {
    if (!open || !iframeReady || visualOptions.length < 2) return;
    const w = iframeRef.current?.contentWindow;
    if (!w) return;
    const opt = visualOptions[activeVisualIndex];
    if (!opt?.url) return;
    if (skipPostUntilUserSwapRef.current) {
      skipPostUntilUserSwapRef.current = false;
      return;
    }
    const t = window.setTimeout(() => {
      try {
        w.postMessage(
          {
            type: CE_DESIGNER_EMBED_VISUAL_MSG,
            payload: {
              imageUrl: opt.url,
              designerContent: opt.designerContent || null,
            },
          },
          window.location.origin
        );
      } catch {
        /* ignore */
      }
    }, 80);
    return () => window.clearTimeout(t);
  }, [open, iframeReady, activeVisualIndex, visualOptions]);

  useEffect(() => {
    if (!open || !onEmbedSettings) return;
    const h = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== EMBED_SETTINGS_MSG) return;
      onEmbedSettings(e.data.payload || {});
    };
    window.addEventListener("message", h);
    return () => window.removeEventListener("message", h);
  }, [open, onEmbedSettings]);

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const src = `${DESIGNER_INDEX}?embed=1&k=${embedKey || 0}`;
  const n = visualOptions.length;
  const canPick = n > 1 && typeof onActiveVisualIndexChange === "function";
  const cur = visualOptions[activeVisualIndex];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100001,
        background: "rgba(6, 8, 14, 0.65)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "max(12px, 2vmin)",
        boxSizing: "border-box",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "min(1680px, calc(100vw - 24px))",
          height: "min(92vh, calc(100dvh - 24px))",
          maxHeight: "100%",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow:
            "0 28px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05) inset",
          background: "#0C0D14",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 100%)",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: "#E2E4EA", flexShrink: 0 }}>Visual designer</span>
          {canPick ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              <button
                type="button"
                aria-label="Previous visual"
                onClick={() =>
                  onActiveVisualIndexChange((activeVisualIndex - 1 + n) % n)
                }
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#E2E4EA",
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                ‹
              </button>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  minWidth: 0,
                  maxWidth: "min(420px, 40vw)",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#C4C6D0",
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%",
                  }}
                  title={cur?.label || ""}
                >
                  {cur?.label || `Visual ${activeVisualIndex + 1}`}
                </span>
                <span style={{ fontSize: 11, color: "#6B7084", marginTop: 2 }}>
                  {activeVisualIndex + 1} / {n}
                </span>
              </div>
              <button
                type="button"
                aria-label="Next visual"
                onClick={() => onActiveVisualIndexChange((activeVisualIndex + 1) % n)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#E2E4EA",
                  cursor: "pointer",
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                ›
              </button>
            </div>
          ) : (
            <div style={{ flex: 1 }} />
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#E2E4EA",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            Close
          </button>
        </div>
        <iframe
          ref={iframeRef}
          key={embedKey}
          title="Visual designer"
          src={src}
          onLoad={() => setIframeReady(true)}
          style={{
            flex: 1,
            border: "none",
            width: "100%",
            minHeight: 0,
            background: "#111",
          }}
        />
      </div>
    </div>
  );
}
