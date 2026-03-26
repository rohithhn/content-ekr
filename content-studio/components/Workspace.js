"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  CHANNELS,
  TEMPLATES,
  TONES,
  INPUT_MODES,
  AI_MODELS,
  getChannelVisualSlotNames,
  STUDIO_TEXT_MODEL_OPTIONS,
  STUDIO_IMAGE_MODEL_OPTIONS,
  STUDIO_VIDEO_MODEL_OPTIONS,
  loadStudioModelPrefs,
  saveStudioModelPrefs,
  normalizeStudioTextModel,
  normalizeStudioImageModel,
  normalizeStudioVideoModel,
} from "@/config/constants";
import { generateContentBundle, generateText, generateImage, generateDesignerStructure, parseUrl, prepareSourceArticle, analyzeUploadedFile, checkProviderStatus, reviseLandingPage } from "@/lib/ai/orchestrator";
import { saveBrand, loadBrands, saveProject, loadProjects, loadProjectMessages } from "@/lib/db/index";
import DesignerOverlay, { primeDesignerEmbed } from "@/components/DesignerOverlay";
import DesignerMiniPreview from "@/components/DesignerMiniPreview";
import DesignerPreviewThumb from "@/components/DesignerPreviewThumb";
import { extractGeneratedContentFromSummary } from "@/lib/designer-image/extractContent";
import { DESIGNER_THEME_OPTIONS, DESIGNER_POST_SIZE_OPTIONS } from "@/lib/designer-image/themes";
import { StudioLucide } from "@/lib/studio-lucide";
import {
  BRAND_EDITOR_LOGO,
  createBrandEditorEmptyDefaults,
  createDefaultEnkryptBrand,
  hydrateEnkryptBrandForEditor,
  isEnkryptStudioBrand,
  syncEnkryptMarketingPrimaryToCanonical,
} from "@/lib/brand/enkrypt-defaults";

/** For html-video channel: strip markdown fences and slice from <!DOCTYPE or <html>. */
function extractHtmlVideoDocument(text) {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  const fence = /^```(?:html)?\s*\n([\s\S]*?)\n```\s*$/im.exec(trimmed);
  if (fence) return fence[1].trim();
  const docIdx = trimmed.search(/<!DOCTYPE\s+html/i);
  if (docIdx >= 0) return trimmed.slice(docIdx);
  const htmlIdx = trimmed.search(/<html[\s>]/i);
  if (htmlIdx >= 0) return trimmed.slice(htmlIdx);
  return trimmed;
}

/** Landing channel: same extraction as HTML video — full document from model. */
const extractLandingPageDocument = extractHtmlVideoDocument;

function isFullLandingHtml(text) {
  if (!text || typeof text !== "string") return false;
  const doc = extractLandingPageDocument(text).trim();
  return /^<!DOCTYPE\s+html/i.test(doc) || /^<html[\s>]/i.test(doc);
}

/** prepare-source brief before full-page Opus is redundant for these channels; skipping saves one Claude call. */
function shouldSkipChannelBriefForUrl(channels) {
  if (!channels?.length) return false;
  return channels.every((id) => id === "landing" || id === "html-video");
}

function loadingTextForTextPhase(activeChannels) {
  if (!activeChannels?.length) return "Generating text…";
  const only = activeChannels.length === 1 ? activeChannels[0] : null;
  if (only === "landing") {
    return "Building full landing page (Claude Opus — a complete page often takes 2–8 min)…";
  }
  if (only === "html-video") {
    return "Building HTML video (Claude Opus — large single file, often several minutes)…";
  }
  if (activeChannels.some((id) => id === "landing" || id === "html-video")) {
    return `Generating for ${activeChannels.length} channels — landing / HTML video steps are the slowest…`;
  }
  return `Generating text for ${activeChannels.length} channel${activeChannels.length > 1 ? "s" : ""}`;
}

/** Chevron for styled native `<select>` (no custom overlay / portal). */
const NATIVE_SELECT_CHEVRON =
  "url(\"data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%238B8DA3' d='M3 4.5L6 7.5L9 4.5'/%3E%3C/svg%3E\")";

const STUDIO_MODEL_SELECT_STYLE = {
  width: "100%",
  padding: "8px 28px 8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(0,0,0,0.35)",
  color: "#E2E4EA",
  fontSize: 12,
  fontFamily: "inherit",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: NATIVE_SELECT_CHEVRON,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 8px center",
  cursor: "pointer",
  boxSizing: "border-box",
};

function studioModelShort(options, id) {
  const o = options.find((x) => x.id === id);
  return o?.short || id;
}

// ─── Shared Data ────────────────────────────────────────────────────────
const GOOGLE_FONTS = ["Inter","DM Sans","Plus Jakarta Sans","Outfit","Manrope","Sora","Poppins","Nunito Sans","Lato","Raleway","Montserrat","Playfair Display","Crimson Pro","Merriweather","Source Serif 4","Space Grotesk","JetBrains Mono","IBM Plex Sans","Work Sans","Libre Franklin","Fira Code"];
const defaultBrands = [
  createDefaultEnkryptBrand(),
  { id: "brand-2", name: "KOAN News", company_name: "KOAN", tagline: "AI News, Distilled", elevator_pitch: "Daily AI intelligence digest.", primary_as_gradient: false, colors: { primary: "#DC2626", secondary: "#1E293B", accent: "#FBBF24", background: "#0F0F0F", surface: "#1C1C1C", text_heading: "#FFFFFF", text_body: "#B0B0B0" }, gradients: [], typography: { heading_font: "Space Grotesk", body_font: "DM Sans" }, layout: { max_width: "960px", border_radius_sm: "4px", border_radius_md: "8px", border_radius_lg: "16px", nav_style: "solid" }, tone: { descriptors: ["Sharp","Concise","Insightful"], cta_style: "Direct", words_to_use: [], words_to_avoid: [] }, audience: { persona_name: "AI Practitioner", industry: "Technology", language_register: "business" }, visual_style: { image_style: "photographic", icon_style: "filled" }, logos: { primary: null, dark: null, description: "Red bold sans-serif KOAN wordmark on dark background" }, sample_backgrounds: [], sample_templates: [], logo_placement: "top-left" },
];

const BRAND_SWATCH_FALLBACK = { primary: "#6C2BD9", secondary: "#14B8A6" };
function brandGradientCss(brand) {
  const p = brand?.colors?.primary ?? BRAND_SWATCH_FALLBACK.primary;
  const s = brand?.colors?.secondary ?? BRAND_SWATCH_FALLBACK.secondary;
  return `linear-gradient(135deg,${p},${s})`;
}
function brandInitial(brand) {
  const n = brand?.company_name || brand?.name;
  if (typeof n === "string" && n.length > 0) return n[0];
  return "?";
}
const fieldStyle = { padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#E2E4EA", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%", boxSizing: "border-box" };

/** Multiselect indices for visual variants; falls back to legacy `selectedIdx`. */
function getVisualSelectedIndices(slot) {
  if (!slot) return [];
  const max = Math.max(0, (slot.variants?.length ?? 1) - 1);
  if (Array.isArray(slot.selectedIndices)) {
    return [...new Set(slot.selectedIndices.filter((i) => Number.isInteger(i) && i >= 0 && i <= max))].sort((a, b) => a - b);
  }
  if (typeof slot.selectedIdx === "number" && slot.selectedIdx >= 0 && slot.selectedIdx <= max) {
    return [slot.selectedIdx];
  }
  return [];
}

/** Flat list of every generated visual URL for the overlay picker (slot order × v1, v2, …). */
function buildDesignerVisualPickerOptions(visualSlots, preferredUrl) {
  const options = [];
  for (const slot of visualSlots || []) {
    (slot.variants || []).forEach((v, vi) => {
      if (!v?.url) return;
      const slotLabel = String(slot.slot || "visual").replace(/-/g, " ");
      options.push({
        url: v.url,
        designerContent: v.designerContent ?? null,
        label: `${slotLabel} · v${vi + 1}`,
      });
    });
  }
  let activeIndex = 0;
  if (preferredUrl) {
    const ix = options.findIndex((o) => o.url === preferredUrl);
    if (ix >= 0) activeIndex = ix;
  }
  return { options, activeIndex };
}

// ─── Helpers ────────────────────────────────────────────────────────────
async function clipCopy(text) { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } }
function downloadFile(content, filename, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function wc(t) { return t ? t.trim().split(/\s+/).filter(Boolean).length : 0; }
function cc(t) { return t ? t.length : 0; }
function timeAgo(iso) {
  const d = new Date(iso); const now = Date.now(); const s = Math.floor((now - d.getTime()) / 1000);
  if (s < 60) return "Just now"; if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`; if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Toast ──────────────────────────────────────────────────────────────
function ToastContainer({ toasts }) {
  if (!toasts.length) return null;
  return (<div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 99999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
    {toasts.map(t => (<div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", borderRadius: 10, pointerEvents: "auto", background: t.type === "error" ? "rgba(239,68,68,0.15)" : t.type === "success" ? "rgba(52,211,153,0.15)" : t.type === "warning" ? "rgba(245,158,11,0.15)" : "rgba(108,43,217,0.15)", border: `1px solid ${t.type === "error" ? "rgba(239,68,68,0.3)" : t.type === "success" ? "rgba(52,211,153,0.3)" : t.type === "warning" ? "rgba(245,158,11,0.3)" : "rgba(108,43,217,0.3)"}`, color: t.type === "error" ? "#FCA5A5" : t.type === "success" ? "#6EE7B7" : t.type === "warning" ? "#FBBF24" : "#C4B5FD", fontSize: 13, fontFamily: "'DM Sans', sans-serif", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
      {t.type === "success" && <StudioLucide name="Check" size={18} color="#6EE7B7" />}
      {t.type === "error" && <StudioLucide name="X" size={18} color="#FCA5A5" />}
      {t.type === "warning" && <StudioLucide name="AlertTriangle" size={18} color="#FBBF24" />}
      <span style={{ flex: 1 }}>{t.message}</span>
    </div>))}
  </div>);
}

// ─── Panel Resize Handle ────────────────────────────────────────────────
function PanelDivider({ onDrag }) {
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  const onMouseDown = (e) => {
    e.preventDefault();
    startX.current = e.clientX;
    setDragging(true);

    const onMouseMove = (e) => { onDrag(e.clientX - startX.current); startX.current = e.clientX; };
    const onMouseUp = () => { setDragging(false); window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (<div onMouseDown={onMouseDown} style={{ width: 6, cursor: "col-resize", background: dragging ? "rgba(108,43,217,0.4)" : "transparent", transition: dragging ? "none" : "background 0.2s", position: "relative", zIndex: 10, flexShrink: 0 }} onMouseEnter={e => { if (!dragging) e.currentTarget.style.background = "rgba(108,43,217,0.2)"; }} onMouseLeave={e => { if (!dragging) e.currentTarget.style.background = "transparent"; }}>
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 2, height: 32, borderRadius: 1, background: dragging ? "rgba(108,43,217,0.8)" : "rgba(255,255,255,0.1)", transition: "background 0.2s" }} />
  </div>);
}

// ─── Loading Indicator ──────────────────────────────────────────────────
function LoadingDots({ text = "Generating" }) {
  const [dots, setDots] = useState("");
  useEffect(() => { const i = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400); return () => clearInterval(i); }, []);
  return <span style={{ color: "#C4B5FD", fontSize: 13, fontWeight: 600 }}>{text}{dots}</span>;
}

// ─── Simple Markdown ────────────────────────────────────────────────────
function renderInline(text) {
  return text.split(/(\*\*.*?\*\*)/g).map((p, i) => p.startsWith("**") && p.endsWith("**") ? <strong key={i} style={{ fontWeight: 600, color: "#E2E4EA" }}>{p.slice(2, -2)}</strong> : p);
}
function SimpleMarkdown({ text, headingFont, bodyFont }) {
  if (!text) return null;
  const hf = headingFont ? `'${headingFont}', sans-serif` : undefined;
  const bf = bodyFont ? `'${bodyFont}', sans-serif` : undefined;
  return (<div style={bf ? { fontFamily: bf } : undefined}>{text.split("\n").map((line, i) => {
    if (line.startsWith("## ")) return <h2 key={i} style={{ fontSize: 18, fontWeight: 700, color: "#E2E4EA", margin: "20px 0 8px", ...(hf ? { fontFamily: hf } : {}) }}>{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={i} style={{ fontSize: 16, fontWeight: 600, color: "#E2E4EA", margin: "16px 0 6px", ...(hf ? { fontFamily: hf } : {}) }}>{line.slice(4)}</h3>;
    if (line.startsWith("- ")) return <div key={i} style={{ paddingLeft: 16, margin: "4px 0", position: "relative", lineHeight: 1.7 }}><span style={{ position: "absolute", left: 0, color: "#6C2BD9" }}>•</span>{renderInline(line.slice(2))}</div>;
    if (line.startsWith("> ")) return <blockquote key={i} style={{ borderLeft: "3px solid #6C2BD9", paddingLeft: 14, margin: "12px 0", color: "#A0A3B1", fontStyle: "italic", lineHeight: 1.7 }}>{renderInline(line.slice(2))}</blockquote>;
    if (line.trim() === "") return <div key={i} style={{ height: 8 }} />;
    return <p key={i} style={{ margin: "4px 0", lineHeight: 1.7, color: "#C4C6D0" }}>{renderInline(line)}</p>;
  })}</div>);
}

// ─── API Keys Modal ─────────────────────────────────────────────────────
function ApiKeysModal({ open, onClose, apiKeys, setApiKeys, serverStatus, addToast }) {
  const [local, setLocal] = useState(apiKeys); const [showKey, setShowKey] = useState({});
  useEffect(() => { if (open) setLocal(apiKeys); }, [open, apiKeys]);
  if (!open) return null;
  /** Apply in-modal values to app state + localStorage (same as Save Keys, optional toast). */
  const persistToApp = (withToast) => {
    setApiKeys(local);
    try {
      localStorage.setItem("ce_api_keys", JSON.stringify(local));
    } catch {}
    if (withToast) addToast("API keys saved", "success");
  };
  const save = () => { persistToApp(true); onClose(); };
  const closeOverlay = () => { persistToApp(false); onClose(); };
  return (<div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}><div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={closeOverlay} /><div style={{ position: "relative", width: 560, maxHeight: "90vh", overflowY: "auto", background: "#14151E", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }} onClick={(e) => e.stopPropagation()}>
    <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#F1F1F4" }}>AI Provider Settings</h2><p style={{ margin: "6px 0 0", fontSize: 13, color: "#6B7084" }}>Keys stay in your browser and are sent on each API request. Close (X) or clicking outside saves your edits; Cancel closes without applying changes.</p></div><button type="button" onClick={closeOverlay} aria-label="Close" style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#8B8DA3", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}><StudioLucide name="X" size={18} color="#8B8DA3" /></button></div>
    <div style={{ padding: "24px 32px" }}>{AI_MODELS.map(m => { const hasC = !!local[m.keyField]; const hasS = !!serverStatus[m.id]; return (<div key={m.id} style={{ marginBottom: 20, padding: 18, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: `1px solid ${(hasC || hasS) ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><div style={{ width: 36, height: 36, borderRadius: 9, background: m.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#E2E4EA" }}>{m.name}</div><div style={{ fontSize: 12, color: "#6B7084" }}>{m.provider} · {m.type}</div></div>
        {hasS && <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "rgba(20,184,166,0.12)", color: "#14B8A6", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}><StudioLucide name="Check" size={12} color="#14B8A6" /> Server</span>}
        {hasC && <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "rgba(52,211,153,0.12)", color: "#34D399", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 4 }}><StudioLucide name="Check" size={12} color="#34D399" /> Client</span>}
      </div>
      <div style={{ position: "relative" }}><input type={showKey[m.id] ? "text" : "password"} value={local[m.keyField] || ""} onChange={e => setLocal(p => ({ ...p, [m.keyField]: e.target.value }))} placeholder={hasS ? "Server key set — add client override (optional)" : `${m.provider} API key...`} style={{ ...fieldStyle, paddingRight: 80, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }} /><button onClick={() => setShowKey(p => ({ ...p, [m.id]: !p[m.id] }))} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: "4px 10px", borderRadius: 6, border: "none", background: "rgba(255,255,255,0.06)", color: "#8B8DA3", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{showKey[m.id] ? "Hide" : "Show"}</button></div>
    </div>); })}</div>
    <div style={{ padding: "16px 32px 24px", display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid rgba(255,255,255,0.06)" }}><button type="button" onClick={() => { setLocal(apiKeys); onClose(); }} style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#8B8DA3", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button><button type="button" onClick={save} style={{ padding: "10px 24px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6C2BD9,#5B21B6)", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save Keys</button></div>
  </div></div>);
}

// ─── Export Modal ────────────────────────────────────────────────────────
function mdToHtml(text) {
  return text.split("\n").map(line => {
    if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
    if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
    if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
    if (line.startsWith("> ")) return `<blockquote>${line.slice(2)}</blockquote>`;
    if (line.startsWith("- ")) return `<li>${line.slice(2)}</li>`;
    if (line.trim() === "") return "<br>";
    let html = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
    return `<p>${html}</p>`;
  }).join("\n");
}

function ExportModal({ open, onClose, activeChannels, currentBundle, addToast, activeBrand }) {
  if (!open) return null;
  const formats = { linkedin: [{ label: "Copy Text", lucide: "Copy", act: "copy" }, { label: "Download Markdown", lucide: "FileText", act: "md" }], twitter: [{ label: "Copy Tweet", lucide: "Copy", act: "copy" }], blog: [{ label: "Download Markdown", lucide: "FileText", act: "md" }, { label: "Download HTML", lucide: "Globe", act: "html" }, { label: "Copy Text", lucide: "Copy", act: "copy" }], article: [{ label: "Download Markdown", lucide: "FileText", act: "md" }, { label: "Download HTML", lucide: "Globe", act: "html" }, { label: "Copy Text", lucide: "Copy", act: "copy" }], landing: [{ label: "Download HTML", lucide: "Globe", act: "html" }, { label: "Open Preview in Browser", lucide: "ExternalLink", act: "preview" }, { label: "Copy Source", lucide: "Copy", act: "copy" }], "html-video": [{ label: "Download HTML Video", lucide: "Globe", act: "html" }, { label: "Open Preview in Browser", lucide: "ExternalLink", act: "preview" }, { label: "Copy Source", lucide: "Copy", act: "copy" }] };
  const doExport = (chId, act) => {
    const d = currentBundle?.[chId]; if (!d?.textVariants?.length) { addToast("No content to export", "warning"); return; }
    const text = d.textVariants[d.selectedTextIdx]?.text || ""; const ch = CHANNELS.find(c => c.id === chId);
    if (act === "copy") clipCopy(text).then(ok => addToast(ok ? "Copied!" : "Copy failed", ok ? "success" : "error"));
    else if (act === "md") { downloadFile(text, `${ch?.label || chId}.md`, "text/markdown"); addToast("Downloaded Markdown", "success"); }
    else if (act === "preview" && chId === "landing") {
      const html = extractLandingPageDocument(text);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      addToast("Opened landing page preview", "success");
    }
    else if (act === "preview" && chId === "html-video") {
      const html = extractHtmlVideoDocument(text);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      addToast("Opened HTML video preview", "success");
    }
    else if (act === "html") {
      if (chId === "html-video") {
        const html = extractHtmlVideoDocument(text);
        downloadFile(html, `${activeBrand?.company_name || "HTML-Video"}.html`, "text/html");
        addToast("Downloaded HTML video file", "success");
      }
      else if (chId === "landing") {
        const html = extractLandingPageDocument(text);
        downloadFile(html, `${activeBrand?.company_name || "Landing-Page"}.html`, "text/html"); addToast("Downloaded landing page HTML", "success");
      } else {
        const hf = activeBrand?.typography?.heading_font || "system-ui";
        const bf = activeBrand?.typography?.body_font || "system-ui";
        const pc = activeBrand?.colors?.primary || "#6C2BD9";
        const bg = activeBrand?.colors?.background || "#ffffff";
        const tc = activeBrand?.colors?.text_body || "#333333";
        const hc = activeBrand?.colors?.text_heading || "#111111";
        const htmlBody = mdToHtml(text);
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${ch?.label || chId}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(hf)}:wght@400;600;700&family=${encodeURIComponent(bf)}:wght@400;500;600&display=swap" rel="stylesheet"><style>body{font-family:'${bf}',system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;line-height:1.8;color:${tc};background:${bg}}h1,h2,h3{font-family:'${hf}',system-ui,sans-serif;color:${hc};margin:1.5em 0 0.5em}h1{font-size:2em}h2{font-size:1.5em}h3{font-size:1.2em}blockquote{border-left:4px solid ${pc};padding-left:16px;margin:1em 0;color:#666;font-style:italic}strong{font-weight:700}li{margin:4px 0;list-style:disc;margin-left:20px}a{color:${pc}}</style></head><body>${htmlBody}</body></html>`;
        downloadFile(html, `${ch?.label || chId}.html`, "text/html"); addToast("Downloaded HTML", "success");
      }
    }
  };
  return (<div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}><div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={onClose} /><div style={{ position: "relative", width: 520, maxHeight: "85vh", overflowY: "auto", background: "#14151E", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
    <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#F1F1F4" }}>Export Content</h2><p style={{ margin: "6px 0 0", fontSize: 13, color: "#6B7084" }}>Download or copy your generated content</p></div><button type="button" aria-label="Close" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#8B8DA3", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}><StudioLucide name="X" size={18} color="#8B8DA3" /></button></div>
    <div style={{ padding: "20px 32px 28px" }}>{activeChannels.map(chId => { const ch = CHANNELS.find(c => c.id === chId); const fmts = formats[chId] || []; const has = !!currentBundle?.[chId]?.textVariants?.length; return (<div key={chId} style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ width: 20, height: 20, borderRadius: 5, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", background: ch.color, color: "white" }}>{ch.icon}</span><span style={{ fontSize: 14, fontWeight: 600, color: "#E2E4EA" }}>{ch.label}</span>{!has && <span style={{ fontSize: 11, color: "#52556B", fontStyle: "italic" }}>No content yet</span>}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{fmts.map(f => (<button key={f.label} type="button" onClick={() => doExport(chId, f.act)} disabled={!has} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", cursor: has ? "pointer" : "default", fontFamily: "inherit", textAlign: "left", width: "100%", opacity: has ? 1 : 0.4, transition: "all 0.15s" }} onMouseEnter={e => { if (has) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(108,43,217,0.3)"; } }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}><StudioLucide name={f.lucide} size={18} color="#C4B5FD" /><div style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA" }}>{f.label}</div><span style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}><StudioLucide name="ChevronRight" size={16} color="#6B7084" /></span></button>))}</div>
    </div>); })}</div>
  </div></div>);
}

// ─── Brand Editor ───────────────────────────────────────────────────────
function BrandEditor({ open, onClose, onSave, editBrand }) {
  const emptyBrandTemplate = useMemo(() => createBrandEditorEmptyDefaults(), []);
  const [b, setB] = useState(emptyBrandTemplate); const [sec, setSec] = useState("basics"); const [tagInput, setTagInput] = useState({ tone: "", use: "", avoid: "" });
  useEffect(() => {
    if (!open) return;
    if (editBrand) {
      let m;
      if (isEnkryptStudioBrand(editBrand)) {
        m = hydrateEnkryptBrandForEditor(editBrand);
      } else {
        m = JSON.parse(JSON.stringify(emptyBrandTemplate));
        Object.keys(editBrand).forEach((k) => {
          if (typeof editBrand[k] === "object" && editBrand[k] !== null && !Array.isArray(editBrand[k])) {
            m[k] = { ...m[k], ...editBrand[k] };
          } else {
            m[k] = editBrand[k];
          }
        });
      }
      if (typeof m.primary_as_gradient !== "boolean") {
        m.primary_as_gradient = !!(editBrand.gradients?.length && editBrand.gradients[0]?.stops?.length >= 2);
      }
      if (!m.gradients?.length) {
        m.gradients = [{ name: "Brand", type: "linear", angle: 90, stops: [{ color: m.colors.primary, position: 0 }, { color: m.colors.secondary, position: 100 }] }];
      }
      setB(m);
    } else {
      setB(JSON.parse(JSON.stringify(emptyBrandTemplate)));
    }
    setSec("basics");
  }, [open, editBrand, emptyBrandTemplate]);
  if (!open) return null;
  const set = (path, val) => { setB(prev => { const n = JSON.parse(JSON.stringify(prev)); const p = path.split("."); let o = n; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = val; return n; }); };
  const brandGradientCss = (() => {
    const g = b.gradients?.[0];
    if (g?.type === "linear" && Array.isArray(g.stops) && g.stops.length >= 2) {
      const a = typeof g.angle === "number" ? g.angle : 90;
      const s0 = g.stops[0]; const s1 = g.stops[1];
      const c0 = s0?.color || b.colors.primary; const c1 = s1?.color || b.colors.secondary;
      const p0 = typeof s0?.position === "number" ? s0.position : 0; const p1 = typeof s1?.position === "number" ? s1.position : 100;
      return `linear-gradient(${a}deg, ${c0} ${p0}%, ${c1} ${p1}%)`;
    }
    return `linear-gradient(90deg, ${b.colors.primary}, ${b.colors.secondary})`;
  })();
  const setGradientStop = (idx, hex) => {
    setB((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      let gg = n.gradients?.[0];
      if (!gg || gg.type !== "linear") gg = { name: "Brand", type: "linear", angle: 90, stops: [{ color: n.colors.primary, position: 0 }, { color: n.colors.secondary, position: 100 }] };
      const stops = Array.isArray(gg.stops) ? [...gg.stops] : [];
      while (stops.length < 2) stops.push({ color: idx === 0 ? n.colors.primary : n.colors.secondary, position: stops.length * 100 });
      stops[idx] = { ...stops[idx], color: hex, position: idx === 0 ? 0 : 100 };
      n.gradients = [{ ...gg, stops }];
      if (idx === 0) n.colors.primary = hex;
      if (idx === 1) n.colors.secondary = hex;
      return n;
    });
  };
  const setGradientAngle = (angle) => {
    setB((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      const cur = n.gradients?.[0] || { name: "Brand", type: "linear", angle: 90, stops: [{ color: n.colors.primary, position: 0 }, { color: n.colors.secondary, position: 100 }] };
      n.gradients = [{ ...cur, type: "linear", angle }];
      return n;
    });
  };
  const setPrimaryAsGradient = (on) => {
    setB((prev) => {
      const n = JSON.parse(JSON.stringify(prev));
      n.primary_as_gradient = on;
      if (on) {
        const gg = n.gradients?.[0];
        const angle = typeof gg?.angle === "number" ? gg.angle : 90;
        n.gradients = [{ name: gg?.name || "Brand", type: "linear", angle, stops: [{ color: n.colors.primary, position: 0 }, { color: n.colors.secondary, position: 100 }] }];
      }
      return n;
    });
  };
  const primaryAsGradient = b.primary_as_gradient !== false;
  const previewPrimaryFill = primaryAsGradient ? brandGradientCss : b.colors.primary;
  const save = () => { if (!b.name || !b.company_name) return; onSave({ ...b, id: b.id || "brand-" + Date.now() }); onClose(); };
  const sections = [{ id: "basics", label: "Basics", lucide: "Sparkles" }, { id: "colors", label: "Colors", lucide: "Palette" }, { id: "typography", label: "Type", lucide: "Type" }, { id: "tone", label: "Tone", lucide: "Theater" }, { id: "audience", label: "Audience", lucide: "Users" }, { id: "visual", label: "Visual", lucide: "Image" }, { id: "assets", label: "Assets", lucide: "Paperclip" }];
  const CInput = ({ label, value, onChange }) => (<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", flexShrink: 0 }}><input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ position: "absolute", inset: -8, width: 52, height: 52, cursor: "pointer", border: "none" }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#6B7084", marginBottom: 2 }}>{label}</div><input value={value} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, padding: "6px 10px", fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} /></div></div>);
  const Tags = ({ items, onAdd, onRemove, placeholder, stateKey }) => (<div><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: items.length ? 8 : 0 }}>{items.map((t, i) => (<span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "rgba(108,43,217,0.12)", color: "#C4B5FD" }}>{t}<span onClick={() => onRemove(i)} style={{ cursor: "pointer", opacity: 0.6, fontSize: 14 }}>×</span></span>))}</div><div style={{ display: "flex", gap: 6 }}><input value={tagInput[stateKey]} onChange={e => setTagInput(p => ({ ...p, [stateKey]: e.target.value }))} placeholder={placeholder} onKeyDown={e => { if (e.key === "Enter" && tagInput[stateKey].trim()) { onAdd(tagInput[stateKey].trim()); setTagInput(p => ({ ...p, [stateKey]: "" })); } }} style={{ ...fieldStyle, padding: "8px 12px", fontSize: 13, flex: 1 }} /><button onClick={() => { if (tagInput[stateKey].trim()) { onAdd(tagInput[stateKey].trim()); setTagInput(p => ({ ...p, [stateKey]: "" })); } }} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "rgba(108,43,217,0.15)", color: "#C4B5FD", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Add</button></div></div>);
  const lbl = { fontSize: 12, fontWeight: 600, color: "#8B8DA3", marginBottom: 6, display: "block" }; const secT = { fontSize: 11, fontWeight: 700, color: "#52556B", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, marginTop: 24 };
  return (<div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end", fontFamily: "'DM Sans', sans-serif" }}><div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={onClose} /><div style={{ position: "relative", width: 640, height: "100%", background: "#11121A", borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,0.4)" }}>
    <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}><div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#F1F1F4" }}>{editBrand ? "Edit Brand" : "New Brand"}</h2>{editBrand && isEnkryptStudioBrand(editBrand) && <p style={{ margin: "6px 0 0", fontSize: 11, color: "#6B7084", lineHeight: 1.45, maxWidth: 420 }}>Defaults from <code style={{ color: "#8B8DA3" }}>lib/brand/enkrypt-defaults.js</code> (designer + enkrypt-frontend-design). Empty fields were filled; save to persist logos and copy to your device.</p>}</div><button type="button" aria-label="Close" onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#8B8DA3", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}><StudioLucide name="X" size={18} color="#8B8DA3" /></button></div>
    <div style={{ display: "flex", gap: 2, padding: "10px 20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", flexShrink: 0 }}>{sections.map(s => (<button key={s.id} type="button" onClick={() => setSec(s.id)} style={{ padding: "8px 12px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, background: "transparent", color: sec === s.id ? "#E2E4EA" : "#6B7084", borderBottom: sec === s.id ? "2px solid #6C2BD9" : "2px solid transparent", borderRadius: 0 }}><StudioLucide name={s.lucide} size={14} color={sec === s.id ? "#E2E4EA" : "#6B7084"} /> {s.label}</button>))}</div>
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      {sec === "basics" && <div><label style={lbl}>Brand Name *</label><input value={b.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Enkrypt AI" style={{ ...fieldStyle, marginBottom: 16 }} /><label style={lbl}>Company *</label><input value={b.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Company" style={{ ...fieldStyle, marginBottom: 16 }} /><label style={lbl}>Tagline</label><input value={b.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Tagline" style={{ ...fieldStyle, marginBottom: 16 }} /><label style={lbl}>Elevator Pitch</label><textarea value={b.elevator_pitch} onChange={e => set("elevator_pitch", e.target.value)} placeholder="1-2 sentences..." rows={3} style={{ ...fieldStyle, resize: "vertical" }} /></div>}
      {sec === "colors" && <div><div style={secT}>Primary treatment</div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}><span style={{ fontSize: 12, color: "#8B8DA3", fontWeight: 600 }}>Marketing primary</span><div style={{ display: "inline-flex", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}><button type="button" onClick={() => setPrimaryAsGradient(false)} style={{ padding: "8px 16px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, background: !primaryAsGradient ? "rgba(108,43,217,0.15)" : "transparent", color: !primaryAsGradient ? "#C4B5FD" : "#6B7084" }}>Solid</button><button type="button" onClick={() => setPrimaryAsGradient(true)} style={{ padding: "8px 16px", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600, borderLeft: "1px solid rgba(255,255,255,0.08)", background: primaryAsGradient ? "rgba(108,43,217,0.15)" : "transparent", color: primaryAsGradient ? "#C4B5FD" : "#6B7084" }}>Gradient</button></div></div>{primaryAsGradient ? <><div style={secT}>Brand gradient (primary)</div><div style={{ fontSize: 11, color: "#6B7084", marginBottom: 12, lineHeight: 1.5 }}>Your marketing primary is this linear gradient (e.g. Enkrypt orange → pink). Start and end stay in sync with <strong style={{ color: "#8B8DA3" }}>primary</strong> / <strong style={{ color: "#8B8DA3" }}>secondary</strong> for prompts and exports.</div><div style={{ height: 44, borderRadius: 12, marginBottom: 16, border: "1px solid rgba(255,255,255,0.12)", background: brandGradientCss, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)" }} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: 8 }}><CInput label="Gradient start → primary" value={b.colors.primary} onChange={v => setGradientStop(0, v)} /><CInput label="Gradient end → secondary" value={b.colors.secondary} onChange={v => setGradientStop(1, v)} /></div><label style={{ ...lbl, marginTop: 4 }}>Gradient angle</label><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>{[{ a: 90, l: "→" }, { a: 135, l: "↘" }, { a: 180, l: "↓" }, { a: 45, l: "↗" }].map(({ a, l }) => (<button key={a} type="button" onClick={() => setGradientAngle(a)} style={{ padding: "8px 14px", borderRadius: 8, border: (b.gradients?.[0]?.angle ?? 90) === a ? "1px solid rgba(108,43,217,0.5)" : "1px solid rgba(255,255,255,0.08)", background: (b.gradients?.[0]?.angle ?? 90) === a ? "rgba(108,43,217,0.12)" : "rgba(255,255,255,0.03)", color: (b.gradients?.[0]?.angle ?? 90) === a ? "#C4B5FD" : "#6B7084", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{l} {a}°</button>))}</div></> : <><div style={secT}>Primary & secondary (solids)</div><div style={{ fontSize: 11, color: "#6B7084", marginBottom: 16, lineHeight: 1.5 }}>Primary is a solid brand color (CTAs, key emphasis). Secondary is separate — do not treat the pair as one gradient unless you switch to Gradient above.</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px", marginBottom: 20 }}><CInput label="Primary" value={b.colors.primary} onChange={v => set("colors.primary", v)} /><CInput label="Secondary" value={b.colors.secondary} onChange={v => set("colors.secondary", v)} /></div></>}<div style={secT}>Other colors</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}><CInput label="Accent" value={b.colors.accent} onChange={v => set("colors.accent", v)} /><CInput label="Background" value={b.colors.background} onChange={v => set("colors.background", v)} /><CInput label="Surface" value={b.colors.surface} onChange={v => set("colors.surface", v)} /><CInput label="Heading" value={b.colors.text_heading} onChange={v => set("colors.text_heading", v)} /><CInput label="Body" value={b.colors.text_body} onChange={v => set("colors.text_body", v)} /></div><div style={secT}>Preview</div><div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}><div style={{ padding: 24, background: b.colors.background }}><div style={{ height: 10, width: "65%", borderRadius: 5, background: previewPrimaryFill, marginBottom: 16 }} /><div style={{ fontSize: 18, fontWeight: 700, color: b.colors.text_heading, marginBottom: 6 }}>Heading</div><div style={{ fontSize: 13, color: b.colors.text_body, marginBottom: 16, lineHeight: 1.6 }}>Body text preview.</div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><div style={{ padding: "8px 18px", borderRadius: 8, background: previewPrimaryFill, color: "white", fontSize: 13, fontWeight: 600 }}>CTA</div>{!primaryAsGradient && <div style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${b.colors.secondary}`, color: b.colors.secondary, fontSize: 12, fontWeight: 600 }}>Secondary</div>}</div></div></div></div>}
      {sec === "typography" && <div><div style={secT}>Fonts</div><label style={lbl}>Heading</label><select value={b.typography.heading_font} onChange={e => set("typography.heading_font", e.target.value)} style={{ ...fieldStyle, marginBottom: 16, cursor: "pointer" }}>{GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ background: "#1A1B23", color: "#E2E4EA" }}>{f}</option>)}</select><label style={lbl}>Body</label><select value={b.typography.body_font} onChange={e => set("typography.body_font", e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}>{GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ background: "#1A1B23", color: "#E2E4EA" }}>{f}</option>)}</select></div>}
      {sec === "tone" && <div><div style={secT}>Descriptors</div><Tags items={b.tone.descriptors} onAdd={t => set("tone.descriptors", [...b.tone.descriptors, t])} onRemove={i => set("tone.descriptors", b.tone.descriptors.filter((_, j) => j !== i))} placeholder="e.g. Authoritative..." stateKey="tone" /><div style={{ ...secT, marginTop: 28 }}>CTA Style</div><input value={b.tone.cta_style} onChange={e => set("tone.cta_style", e.target.value)} placeholder="Action-oriented" style={fieldStyle} /><div style={{ ...secT, marginTop: 28 }}>Use</div><Tags items={b.tone.words_to_use || []} onAdd={t => set("tone.words_to_use", [...(b.tone.words_to_use || []), t])} onRemove={i => set("tone.words_to_use", (b.tone.words_to_use || []).filter((_, j) => j !== i))} placeholder="Preferred..." stateKey="use" /><div style={{ ...secT, marginTop: 28 }}>Avoid</div><Tags items={b.tone.words_to_avoid || []} onAdd={t => set("tone.words_to_avoid", [...(b.tone.words_to_avoid || []), t])} onRemove={i => set("tone.words_to_avoid", (b.tone.words_to_avoid || []).filter((_, j) => j !== i))} placeholder="Never use..." stateKey="avoid" /></div>}
      {sec === "audience" && <div><div style={secT}>Target Audience</div><label style={lbl}>Persona</label><input value={b.audience.persona_name} onChange={e => set("audience.persona_name", e.target.value)} placeholder="CISO, VP Eng" style={{ ...fieldStyle, marginBottom: 16 }} /><label style={lbl}>Industry</label><input value={b.audience.industry} onChange={e => set("audience.industry", e.target.value)} placeholder="Enterprise Tech" style={{ ...fieldStyle, marginBottom: 16 }} /><label style={lbl}>Register</label><div style={{ display: "flex", gap: 8 }}>{["technical", "business", "casual"].map(r => (<button key={r} onClick={() => set("audience.language_register", r)} style={{ flex: 1, padding: 10, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", border: b.audience.language_register === r ? "1px solid rgba(108,43,217,0.4)" : "1px solid rgba(255,255,255,0.06)", background: b.audience.language_register === r ? "rgba(108,43,217,0.1)" : "rgba(255,255,255,0.02)", color: b.audience.language_register === r ? "#C4B5FD" : "#6B7084", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{r}</button>))}</div></div>}
      {sec === "visual" && <div><div style={secT}>Image Style</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>{[["photographic", "Camera"], ["illustrated", "Palette"], ["abstract", "Layers"], ["minimal", "Square"]].map(([s, lucideName]) => (<button key={s} type="button" onClick={() => set("visual_style.image_style", s)} style={{ padding: 16, borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "center", border: b.visual_style.image_style === s ? "1px solid rgba(108,43,217,0.4)" : "1px solid rgba(255,255,255,0.06)", background: b.visual_style.image_style === s ? "rgba(108,43,217,0.1)" : "rgba(255,255,255,0.02)", color: b.visual_style.image_style === s ? "#C4B5FD" : "#6B7084", fontSize: 13, fontWeight: 600 }}><div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><StudioLucide name={lucideName} size={24} color={b.visual_style.image_style === s ? "#C4B5FD" : "#6B7084"} /></div>{s}</button>))}</div></div>}
      {sec === "assets" && <div>
        <div style={secT}>{BRAND_EDITOR_LOGO.sectionTitle}</div>
        <label style={lbl}>{BRAND_EDITOR_LOGO.primaryLabel}</label>
        <div style={{ fontSize: 11, color: "#52556B", marginBottom: 8, lineHeight: 1.45 }}>{BRAND_EDITOR_LOGO.primaryHelp}</div>
        <input value={b.logos.primary || ""} onChange={e => set("logos.primary", e.target.value || null)} placeholder={BRAND_EDITOR_LOGO.urlPlaceholder} style={{ ...fieldStyle, marginBottom: 12, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }} />
        <label style={lbl}>{BRAND_EDITOR_LOGO.darkLabel}</label>
        <div style={{ fontSize: 11, color: "#52556B", marginBottom: 8, lineHeight: 1.45 }}>{BRAND_EDITOR_LOGO.darkHelp}</div>
        <input value={b.logos.dark || ""} onChange={e => set("logos.dark", e.target.value || null)} placeholder={BRAND_EDITOR_LOGO.urlPlaceholder} style={{ ...fieldStyle, marginBottom: 12, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }} />
        <label style={lbl}>{BRAND_EDITOR_LOGO.descriptionLabel}</label>
        <textarea value={b.logos.description || ""} onChange={e => set("logos.description", e.target.value)} placeholder={BRAND_EDITOR_LOGO.descriptionPlaceholder} rows={2} style={{ ...fieldStyle, resize: "vertical", marginBottom: 12 }} />
        {(b.logos.primary || b.logos.dark) && <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {b.logos.primary && <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", flex: 1, textAlign: "center" }}><img src={b.logos.primary} alt="Light surface" style={{ maxHeight: 48, maxWidth: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} /><div style={{ fontSize: 10, color: "#52556B", marginTop: 6 }}>{BRAND_EDITOR_LOGO.previewCaptionPrimary}</div></div>}
          {b.logos.dark && <div style={{ padding: 12, borderRadius: 10, background: b.colors.background, border: "1px solid rgba(255,255,255,0.06)", flex: 1, textAlign: "center" }}><img src={b.logos.dark} alt="Dark surface" style={{ maxHeight: 48, maxWidth: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} /><div style={{ fontSize: 10, color: "#52556B", marginTop: 6 }}>{BRAND_EDITOR_LOGO.previewCaptionDark}</div></div>}
        </div>}

        <label style={lbl}>Logo Placement</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>{["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"].map(p => (
          <button key={p} onClick={() => set("logo_placement", p)} style={{ flex: 1, padding: "8px 4px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 600, textTransform: "capitalize", border: b.logo_placement === p ? "1px solid rgba(108,43,217,0.4)" : "1px solid rgba(255,255,255,0.06)", background: b.logo_placement === p ? "rgba(108,43,217,0.1)" : "rgba(255,255,255,0.02)", color: b.logo_placement === p ? "#C4B5FD" : "#6B7084" }}>{p.replace("-", " ")}</button>
        ))}</div>

        <div style={secT}>Sample Backgrounds</div>
        <div style={{ fontSize: 12, color: "#6B7084", marginBottom: 12, lineHeight: 1.5 }}>Add URLs to background images or templates used for LinkedIn posts and social media. These guide the AI to match your brand's visual style.</div>
        {(b.sample_backgrounds || []).map((url, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input value={url} onChange={e => { const arr = [...(b.sample_backgrounds || [])]; arr[i] = e.target.value; set("sample_backgrounds", arr); }} placeholder="https://..." style={{ ...fieldStyle, flex: 1, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
            {url && <div style={{ width: 40, height: 40, borderRadius: 6, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.08)" }}><img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} /></div>}
            <button onClick={() => { const arr = (b.sample_backgrounds || []).filter((_, j) => j !== i); set("sample_backgrounds", arr); }} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "rgba(239,68,68,0.1)", color: "#FCA5A5", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
          </div>
        ))}
        <button onClick={() => set("sample_backgrounds", [...(b.sample_backgrounds || []), ""])} style={{ padding: "8px 14px", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.1)", background: "transparent", color: "#6B7084", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", width: "100%", marginBottom: 24 }}>+ Add Background URL</button>

        <div style={secT}>Sample Templates</div>
        <div style={{ fontSize: 12, color: "#6B7084", marginBottom: 12, lineHeight: 1.5 }}>Add URLs to sample post templates or image layouts. The AI will reference these when generating visual content to maintain consistency.</div>
        {(b.sample_templates || []).map((url, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input value={url} onChange={e => { const arr = [...(b.sample_templates || [])]; arr[i] = e.target.value; set("sample_templates", arr); }} placeholder="https://..." style={{ ...fieldStyle, flex: 1, fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} />
            {url && <div style={{ width: 40, height: 40, borderRadius: 6, overflow: "hidden", flexShrink: 0, border: "1px solid rgba(255,255,255,0.08)" }}><img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { e.target.style.display = "none"; }} /></div>}
            <button onClick={() => { const arr = (b.sample_templates || []).filter((_, j) => j !== i); set("sample_templates", arr); }} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "rgba(239,68,68,0.1)", color: "#FCA5A5", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
          </div>
        ))}
        <button onClick={() => set("sample_templates", [...(b.sample_templates || []), ""])} style={{ padding: "8px 14px", borderRadius: 8, border: "1px dashed rgba(255,255,255,0.1)", background: "transparent", color: "#6B7084", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", width: "100%" }}>+ Add Template URL</button>
      </div>}
    </div>
    <div style={{ padding: "16px 28px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}><button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#8B8DA3", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button><button onClick={save} disabled={!b.name || !b.company_name} style={{ padding: "10px 24px", borderRadius: 9, border: "none", background: (b.name && b.company_name) ? "linear-gradient(135deg,#6C2BD9,#5B21B6)" : "rgba(255,255,255,0.06)", color: (b.name && b.company_name) ? "white" : "#52556B", fontSize: 13, fontWeight: 600, cursor: (b.name && b.company_name) ? "pointer" : "default", fontFamily: "inherit" }}>Save Brand</button></div>
  </div></div>);
}

// ─── Generation Output Card ─────────────────────────────────────────────
function GenerationCard({ bundle, channels, onUpdateBundle, onCopy, onRegenerate, onGenerateImage, onOpenDesigner, isGenerating, activeBrand, designerPostSizeId = "1080x1080-trns", designerWhiteBg = true, designerHideLogo = false }) {
  const [activeChTab, setActiveChTab] = useState(channels[0]);
  const chData = bundle[activeChTab]; if (!chData) return null;
  const ch = CHANNELS.find(c => c.id === activeChTab);
  const selectText = (idx) => { onUpdateBundle(prev => ({ ...prev, [activeChTab]: { ...prev[activeChTab], selectedTextIdx: idx } })); };
  const selectVisual = (si, vi) => {
    onUpdateBundle((prev) => {
      const n = { ...prev };
      const slots = [...n[activeChTab].visualSlots];
      const cur = slots[si];
      const current = getVisualSelectedIndices(cur);
      const next = current.includes(vi)
        ? current.filter((i) => i !== vi)
        : [...current, vi].sort((a, b) => a - b);
      const { selectedIdx: _legacy, ...rest } = cur;
      slots[si] = { ...rest, selectedIndices: next };
      n[activeChTab] = { ...n[activeChTab], visualSlots: slots };
      return n;
    });
  };
  const currentText = chData.textVariants[chData.selectedTextIdx]?.text || "";
  const designerThumbLogoUrl = designerWhiteBg
    ? (activeBrand?.logos?.primary || activeBrand?.logos?.dark || null)
    : (activeBrand?.logos?.dark || activeBrand?.logos?.primary || null);
  const pill = (active, color) => ({ padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: "inherit", background: active ? (color || "rgba(108,43,217,0.2)") : "rgba(255,255,255,0.04)", color: active ? "white" : "#6B7084" });
  return (<div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
    <div style={{ display: "flex", gap: 2, padding: "8px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
      {channels.map(chId => { const c = CHANNELS.find(x => x.id === chId); if (!c) return null; return (<button key={chId} onClick={() => setActiveChTab(chId)} style={{ padding: "5px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, background: activeChTab === chId ? c.color + "20" : "transparent", color: activeChTab === chId ? c.color : "#52556B" }}><span style={{ width: 14, height: 14, borderRadius: 3, fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", background: activeChTab === chId ? c.color : "rgba(255,255,255,0.08)", color: activeChTab === chId ? "white" : "#52556B" }}>{c.icon}</span>{c.label}</button>); })}
    </div>
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#52556B", textTransform: "uppercase", letterSpacing: "0.5px" }}>Text · {chData.textVariants.length} variant{chData.textVariants.length !== 1 ? "s" : ""}</span>
          <div style={{ display: "flex", gap: 4 }}>{chData.textVariants.map((tv, i) => (<button key={tv.id} onClick={() => selectText(i)} style={pill(chData.selectedTextIdx === i, ch?.color)}>{tv.label}</button>))}</div>
        </div>
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: "#C4C6D0", lineHeight: 1.7, maxHeight: 200, overflowY: "auto", ...(!["blog","article","landing","html-video"].includes(activeChTab) ? { whiteSpace: "pre-wrap" } : {}) }}>{activeChTab === "html-video" || activeChTab === "landing" ? <pre style={{ margin: 0, fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 10, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{currentText.length > 6000 ? `${currentText.slice(0, 6000)}…` : currentText}</pre> : ["blog","article"].includes(activeChTab) ? <SimpleMarkdown text={currentText} /> : currentText}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <button type="button" onClick={() => onCopy?.(currentText)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: "#6B7084", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5 }}><StudioLucide name="Copy" size={13} color="#6B7084" /> Copy</button>
          <button type="button" onClick={() => onRegenerate?.(activeChTab)} disabled={isGenerating} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: isGenerating ? "#3A3B44" : "#6B7084", fontSize: 11, fontWeight: 500, cursor: isGenerating ? "default" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 5 }}>{isGenerating ? <StudioLucide name="Loader2" size={13} color="#3A3B44" /> : <StudioLucide name="RefreshCw" size={13} color="#6B7084" />} Regen</button>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#52556B" }}>{wc(currentText)} words · {cc(currentText)} chars</span>
        </div>
      </div>
      {chData.visualSlots?.length > 0 && <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#52556B", textTransform: "uppercase", letterSpacing: "0.5px" }}>Visuals · {chData.visualSlots.length} slots · multi-select</span>
          <button type="button" onClick={() => onGenerateImage?.(activeChTab)} disabled={isGenerating} style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: isGenerating ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg,rgba(108,43,217,0.3),rgba(20,184,166,0.3))", color: isGenerating ? "#52556B" : "#C4B5FD", fontSize: 11, fontWeight: 600, cursor: isGenerating ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }} title="Click v1/v2/… to multi-select; generates only checked thumbnails that are still empty">{isGenerating ? <><StudioLucide name="Loader2" size={14} color="#52556B" /> Generating...</> : <><StudioLucide name="Image" size={14} color="#C4B5FD" /> Generate selected</>}</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {chData.visualSlots.map((slot, si) => (<div key={slot.slot} style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#8B8DA3", textTransform: "capitalize", display: "block", marginBottom: 8 }}>{slot.slot.replace(/-/g, " ")}</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{slot.variants.map((v, vi) => {
              const hasImage = !!v.url;
              const picked = getVisualSelectedIndices(slot).includes(vi);
              return (<div key={v.id} title={picked ? "Click to deselect" : "Click to add to selection"} onClick={() => selectVisual(si, vi)} style={{ width: 72, height: 72, borderRadius: 10, cursor: "pointer", overflow: "hidden", background: hasImage ? "transparent" : `linear-gradient(${135 + vi * 30}deg,hsl(${v.hue},40%,25%),hsl(${v.hue + 40},50%,18%))`, border: picked ? `2px solid ${ch?.color}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, flexShrink: 0, position: "relative" }}>
                {hasImage ? <DesignerPreviewThumb imageUrl={v.url} sourceText={currentText} logoUrl={designerThumbLogoUrl} postSizeId={designerPostSizeId} whiteBg={designerWhiteBg} hideLogo={designerHideLogo} designerContent={v.designerContent} /> : <>v{vi + 1}</>}
                {picked && <div style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: "50%", background: ch?.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}><StudioLucide name="Check" size={10} color="white" strokeWidth={3} /></div>}
              </div>);
            })}{(() => {
              const idxs = getVisualSelectedIndices(slot);
              const di = idxs.find((i) => slot.variants[i]?.url);
              return typeof di === "number" ? (
                <button type="button" onClick={(e) => { e.stopPropagation(); const v = slot.variants[di]; onOpenDesigner?.(v.url, v.designerContent, bundle[activeChTab]?.visualSlots); }} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(108,43,217,0.35)", background: "rgba(108,43,217,0.12)", color: "#C4B5FD", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", marginLeft: 4, display: "inline-flex", alignItems: "center", gap: 5 }}><StudioLucide name="Palette" size={14} color="#C4B5FD" /> Designer</button>
              ) : null;
            })()}</div>
          </div>))}
        </div>
      </div>}
    </div>
  </div>);
}

// ─── Left Panel ─────────────────────────────────────────────────────────
function LeftPanel({ activeTab, setActiveTab, collapsed, brands, activeBrandId, onOpenBrandEditor, onSelectBrand, projects, onSelectProject, activeProjectId, onNewProject, onSelectTemplate, selectedTemplateId, width = 280 }) {
  const [search, setSearch] = useState(""); const [tplFilter, setTplFilter] = useState("All");
  const cats = ["All", "Thought Leadership", "Product & Company", "Personal Brand", "Educational", "Landing Pages", "Video"];
  const filtered = TEMPLATES.filter(t => (tplFilter === "All" || t.category === tplFilter) && (!search || t.name.toLowerCase().includes(search.toLowerCase())));
  if (collapsed) return null;
  return (<div style={{ width, minWidth: 200, height: "100%", background: "rgba(255,255,255,0.02)", borderRight: "none", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <div style={{ padding: "16px 16px 12px" }}><button onClick={onNewProject} style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid rgba(108,43,217,0.3)", background: "rgba(108,43,217,0.1)", color: "#C4B5FD", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>+ New Project</button></div>
    <div style={{ display: "flex", margin: "0 16px", padding: 3, borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}>{["projects", "templates", "brands"].map(t => (<button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: "7px 4px", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", background: activeTab === t ? "rgba(255,255,255,0.08)" : "transparent", color: activeTab === t ? "#E2E4EA" : "#6B7084", textTransform: "capitalize" }}>{t}</button>))}</div>
    <div style={{ padding: "12px 16px 8px" }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}><StudioLucide name="Search" size={16} color="#6B7084" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${activeTab}...`} style={{ border: "none", background: "transparent", color: "#E2E4EA", fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%" }} /></div></div>
    <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px 16px" }}>
      {activeTab === "projects" && projects.map(p => (<div key={p.id} onClick={() => onSelectProject(p.id)} style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", background: activeProjectId === p.id ? "rgba(108,43,217,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${activeProjectId === p.id ? "rgba(108,43,217,0.3)" : "rgba(255,255,255,0.04)"}`, marginBottom: 6 }} onMouseEnter={e => { if (activeProjectId !== p.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }} onMouseLeave={e => { if (activeProjectId !== p.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.title}</div>{p.messageCount > 0 && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "#6B7084", flexShrink: 0, marginLeft: 8 }}>{p.messageCount}</span>}</div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", gap: 4 }}>{(p.channels || []).map(ch => { const c = CHANNELS.find(x => x.id === ch); return c ? <span key={ch} style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.color + "20", color: c.color }}>{c.label.split(" ")[0]}</span> : null; })}</div><span style={{ fontSize: 11, color: "#6B7084" }}>{p.updatedAt ? timeAgo(p.updatedAt) : ""}</span></div></div>))}
      {activeTab === "templates" && <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>{cats.map(c => <button key={c} type="button" onClick={() => setTplFilter((prev) => (c !== "All" && prev === c ? "All" : c))} style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", background: tplFilter === c ? "rgba(108,43,217,0.2)" : "rgba(255,255,255,0.04)", color: tplFilter === c ? "#C4B5FD" : "#6B7084" }}>{c}</button>)}</div>
        {filtered.map(t => (<div key={t.id} onClick={() => onSelectTemplate(t)} style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", background: selectedTemplateId === t.id ? "rgba(108,43,217,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${selectedTemplateId === t.id ? "rgba(108,43,217,0.3)" : "rgba(255,255,255,0.04)"}`, marginBottom: 6, transition: "all 0.15s" }} onMouseEnter={e => { if (selectedTemplateId !== t.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }} onMouseLeave={e => { if (selectedTemplateId !== t.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><StudioLucide name={t.lucide} size={18} color="#C4B5FD" /><span style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA" }}>{t.name}</span></div>
          <div style={{ fontSize: 12, color: "#6B7084", marginBottom: 8, lineHeight: 1.4 }}>{t.description}</div>
          <div style={{ display: "flex", gap: 4 }}>{t.channels.map(ch => { const c = CHANNELS.find(x => x.id === ch); return c ? <span key={ch} style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.color + "15", color: c.color }}>{c.label.split(" ")[0]}</span> : null; })}</div>
        </div>))}
      </div>}
      {activeTab === "brands" && <div>{brands.map(brand => (<div key={brand.id} onClick={() => onSelectBrand(brand.id)} style={{ padding: 14, borderRadius: 10, cursor: "pointer", background: brand.id === activeBrandId ? "rgba(108,43,217,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${brand.id === activeBrandId ? "rgba(108,43,217,0.3)" : "rgba(255,255,255,0.04)"}`, marginBottom: 6 }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: brandGradientCss(brand), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white" }}>{brandInitial(brand)}</div><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA" }}>{brand.name}</div><div style={{ fontSize: 11, color: "#6B7084" }}>{brand.tagline}</div></div><button type="button" onClick={e => { e.stopPropagation(); onOpenBrandEditor(brand); }} aria-label="Edit brand" style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.06)", color: "#6B7084", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}><StudioLucide name="Pencil" size={14} color="#6B7084" /></button></div><div style={{ display: "flex", gap: 6, marginBottom: 8 }}>{["primary", "secondary", "accent"].map(k => <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 14, height: 14, borderRadius: 3, background: brand.colors?.[k] ?? "transparent", border: "1px solid rgba(255,255,255,0.1)" }} /><span style={{ fontSize: 10, color: "#52556B", textTransform: "capitalize" }}>{k}</span></div>)}</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{(brand.tone?.descriptors ?? []).map(t => <span key={t} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", color: "#8B8DA3" }}>{t}</span>)}</div></div>))}<button onClick={() => onOpenBrandEditor(null)} style={{ padding: 14, borderRadius: 10, cursor: "pointer", background: "transparent", border: "1px dashed rgba(255,255,255,0.1)", color: "#6B7084", fontSize: 13, fontWeight: 500, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(108,43,217,0.4)"; e.currentTarget.style.color = "#C4B5FD"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#6B7084"; }}>+ Add Brand</button></div>}
    </div>
  </div>);
}

// ─── Center Panel ───────────────────────────────────────────────────────
function CenterPanel({ activeChannels, setActiveChannels, setActiveChannel, linkedinIncludeCarousel, setLinkedinIncludeCarousel, activeBrand, apiKeys, serverStatus, onSelectPreview, messages, setMessages, projectTitle, selectedTemplateId, setSelectedTemplateId, inputMode, setInputMode, tone, setTone, isGenerating, setIsGenerating, generationPhase, setGenerationPhase, addToast, onRegenerate, onGenerateImage, onOpenDesigner, designerPostSizeId, setDesignerPostSizeId, designerWhiteBg, setDesignerWhiteBg, designerThemeId, setDesignerThemeId, designerHideLogo = false, studioTextModel }) {
  const [inputValue, setInputValue] = useState("");
  const [uploadFile, setUploadFile] = useState(null);
  const [numText, setNumText] = useState(3); const [numVisual, setNumVisual] = useState(3); const [welcome, setWelcome] = useState(true);
  const ref = useRef(null); const endRef = useRef(null); const fileInputRef = useRef(null);
  const wasLandingOnlyRef = useRef(false);
  useEffect(() => {
    const landingOrVideoOnly =
      activeChannels.length === 1 &&
      (activeChannels[0] === "landing" || activeChannels[0] === "html-video");
    if (landingOrVideoOnly && !wasLandingOnlyRef.current) setNumVisual(0);
    if (landingOrVideoOnly) setNumText(1);
    wasLandingOnlyRef.current = landingOrVideoOnly;
  }, [activeChannels]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isGenerating]);
  useEffect(() => { setWelcome(messages.length === 0); }, [messages]);
  const selectedTpl = selectedTemplateId ? TEMPLATES.find(t => t.id === selectedTemplateId) : null;
  const cfgModels = AI_MODELS.filter(m => apiKeys[m.keyField] || serverStatus?.[m.id]);
  const placeholder = selectedTpl?.placeholder || (inputMode === "url" ? "Paste a URL..." : inputMode === "topic" ? "Enter a topic..." : inputMode === "upload" ? "Optional notes to include with your file (Shift+Enter for newline)..." : "Write your content brief...");
  const canSend =
    !isGenerating &&
    (inputMode === "upload" ? !!uploadFile : !!inputValue.trim());

  const send = async () => {
    if (!canSend) return;
    if (activeChannels.length === 0) { addToast("Select at least one channel", "warning"); return; }

    const rawInput = inputValue.trim();
    let displayContent = inputMode === "upload"
      ? `Attachment: ${uploadFile?.name || "file"}${rawInput ? `\n\n${rawInput}` : ""}`
      : rawInput;
    let preparedInput = null;
    let contentInput = inputMode === "upload" ? "" : rawInput;

    const userMsgId = "msg-" + Date.now();
    const userMsg = {
      id: userMsgId,
      role: "user",
      content: displayContent,
      mode: inputMode,
      tone,
      channels: [...activeChannels],
      templateId: selectedTemplateId,
      numText,
      numVisual,
      linkedinIncludeCarousel,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(p => [...p, userMsg]);
    if (inputMode !== "upload") setInputValue("");
    setIsGenerating(true);

    try {
      if (inputMode === "url") {
        setGenerationPhase("url");
        try {
          const parsed = await parseUrl(rawInput, apiKeys);
          const merged = `Source: ${parsed.title || rawInput}\n\n${parsed.content || parsed.excerpt || ""}`;
          addToast("Article fetched", "success");
          if (shouldSkipChannelBriefForUrl(activeChannels)) {
            contentInput = merged;
            addToast("Brief step skipped for landing / HTML video — using article text directly", "info");
          } else {
            addToast("Analyzing for your channels…", "info");
            setGenerationPhase("prepare");
            try {
              const prep = await prepareSourceArticle({
                title: parsed.title || "",
                content: merged,
                channels: activeChannels,
                templateId: selectedTemplateId || null,
                willGenerateImages: numVisual > 0,
                apiKeys,
              });
              preparedInput = prep.preparedInput;
              addToast("Channel-aware brief ready", "success");
            } catch (e) {
              preparedInput = merged;
              addToast(e?.message ? `Brief step skipped: ${e.message}` : "Brief step skipped — using article text", "warning");
            }
            contentInput = preparedInput || merged;
          }
        } catch {
          addToast("URL fetch failed — using pasted text only", "warning");
          contentInput = rawInput;
        }
        setGenerationPhase("text");
      } else if (inputMode === "upload") {
        setGenerationPhase("prepare");
        const fd = new FormData();
        fd.append("file", uploadFile);
        fd.append("channels", JSON.stringify(activeChannels));
        fd.append("templateId", selectedTemplateId || "");
        fd.append("willGenerateImages", numVisual > 0 ? "true" : "false");
        const analyzed = await analyzeUploadedFile(fd, apiKeys);
        preparedInput = analyzed.preparedInput;
        contentInput = preparedInput;
        if (rawInput) {
          contentInput = `${contentInput}\n\n---\nUser notes:\n${rawInput}`;
        }
        const note = analyzed.note ? ` (${analyzed.note})` : "";
        addToast(`File analyzed${note}`, "success");
        setUploadFile(null);
        setInputValue("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setGenerationPhase("text");
      } else {
        contentInput = inputMode === "topic" || inputMode === "text" ? rawInput : contentInput;
        setGenerationPhase("text");
      }

      setMessages((p) =>
        p.map((m) => (m.id === userMsgId ? { ...m, preparedInput: contentInput } : m)),
      );

      const bundle = await generateContentBundle({
        input: contentInput,
        channels: activeChannels,
        templateId: selectedTemplateId || null,
        brand: activeBrand || null,
        numTextVariants: numText,
        tone,
        apiKeys,
        textModel: studioTextModel,
      });

      for (const channelId of activeChannels) {
        if (bundle[channelId]) {
          if (numVisual <= 0) {
            bundle[channelId].visualSlots = [];
          } else {
            const slotNames = getChannelVisualSlotNames(channelId, {
              includeLinkedinCarousel: linkedinIncludeCarousel,
            });
            bundle[channelId].visualSlots = slotNames.map((slotName) => ({
              slot: slotName,
              variants: Array.from({ length: numVisual }, (_, j) => ({ id: `vs-${channelId}-${slotName}-${j}`, hue: (channelId.charCodeAt(0) * 37 + j * 60 + slotName.charCodeAt(0) * 13) % 360, prompt: `${activeBrand?.name || "Brand"} ${slotName} v${j + 1}` })),
              selectedIndices: [0],
            }));
          }
        }
      }

      const aiMsg = { id: "msg-" + (Date.now() + 1), role: "assistant", channels: [...activeChannels], bundle, createdAt: new Date().toISOString(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setMessages(p => [...p, aiMsg]);
      if (onSelectPreview && activeChannels.length > 0) { const fc = activeChannels[0]; onSelectPreview({ channel: fc, text: bundle[fc]?.textVariants[0]?.text, visualSlots: bundle[fc]?.visualSlots }); }
      addToast(`Generated for ${activeChannels.length} channel${activeChannels.length > 1 ? "s" : ""}`, "success");
    } catch (error) {
      setMessages(p => [...p, { id: "msg-" + (Date.now() + 1), role: "error", content: error.message || "Generation failed. Check your API keys in Settings (gear icon in the top bar).", createdAt: new Date().toISOString(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      addToast(error.message || "Generation failed", "error");
    } finally { setIsGenerating(false); setGenerationPhase(null); }
  };

  const handleBundleUpdate = (msgId, updater) => { setMessages(p => p.map(m => m.id === msgId ? { ...m, bundle: updater(m.bundle) } : m)); };
  const handleCopy = (text) => { clipCopy(text).then(ok => addToast(ok ? "Copied!" : "Copy failed", ok ? "success" : "error")); };

  return (<div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", minWidth: 0, minHeight: 0 }}>
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column" }}>
      {welcome ? (<div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,rgba(108,43,217,0.2),rgba(20,184,166,0.2))", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(108,43,217,0.2)" }}><StudioLucide name="Sparkles" size={32} color="#C4B5FD" /></div>
        <div><h2 style={{ fontSize: 22, fontWeight: 700, color: "#E2E4EA", margin: "0 0 8px" }}>What would you like to create?</h2><p style={{ fontSize: 14, color: "#6B7084", margin: 0, lineHeight: 1.6 }}>Paste a URL, write a thought, pick a topic, or choose a template from the left panel.</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", marginTop: 8 }}>
          {INPUT_MODES.map((m) => (<button key={m.id} type="button" onClick={() => { setInputMode(m.id); ref.current?.focus(); }} style={{ padding: 16, borderRadius: 12, cursor: "pointer", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "left", fontFamily: "inherit", color: "#E2E4EA", display: "flex", flexDirection: "column", alignItems: "flex-start" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(108,43,217,0.3)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}><span style={{ display: "flex", marginBottom: 8 }}><StudioLucide name={m.lucide} size={22} color="#C4B5FD" /></span><span style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m.label}</span><span style={{ fontSize: 11, color: "#6B7084" }}>{m.description}</span></button>))}
        </div>
        {cfgModels.length === 0 && <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", width: "100%", textAlign: "left" }}><div style={{ fontSize: 13, color: "#FBBF24", fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}><StudioLucide name="AlertTriangle" size={18} color="#FBBF24" /> No AI providers configured</div><div style={{ fontSize: 12, color: "#D4A574", lineHeight: 1.5 }}>Open Settings (gear icon) in the top bar to add API keys, or set them in .env.local on the server.</div></div>}
      </div>) : (<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map(msg => (<div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
          {msg.role === "user" ? (<div style={{ maxWidth: "80%", padding: "14px 18px", borderRadius: 14, background: "linear-gradient(135deg,rgba(108,43,217,0.2),rgba(108,43,217,0.1))", border: "1px solid rgba(108,43,217,0.2)" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}><span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "#8B8DA3", textTransform: "uppercase" }}>{msg.mode}</span><span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#FBBF24" }}>{msg.tone}</span>{msg.templateId && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(108,43,217,0.15)", color: "#C4B5FD" }}>{TEMPLATES.find(t => t.id === msg.templateId)?.name || msg.templateId}</span>}<span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(20,184,166,0.15)", color: "#5EEAD4" }}>{msg.numText}T · {msg.numVisual}V</span>{msg.channels?.includes("linkedin") && msg.linkedinIncludeCarousel === false && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(10,102,194,0.2)", color: "#93C5FD" }}>LI · no carousel</span>}</div>
            <div style={{ fontSize: 14, color: "#E2E4EA", lineHeight: 1.6 }}>{msg.content}</div>
          </div>) : msg.role === "error" ? (<div style={{ maxWidth: "80%", padding: "14px 18px", borderRadius: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div style={{ fontSize: 13, color: "#FCA5A5", lineHeight: 1.6, display: "flex", alignItems: "flex-start", gap: 8 }}><StudioLucide name="AlertCircle" size={18} color="#FCA5A5" style={{ flexShrink: 0, marginTop: 2 }} /><span>{msg.content}</span></div>
          </div>) : (<div style={{ maxWidth: "95%", width: "100%" }}><GenerationCard bundle={msg.bundle} channels={msg.channels} onUpdateBundle={(updater) => handleBundleUpdate(msg.id, updater)} onCopy={handleCopy} onRegenerate={(chId) => onRegenerate(msg.id, chId)} onGenerateImage={(chId) => onGenerateImage?.(msg.id, chId)} onOpenDesigner={onOpenDesigner} isGenerating={isGenerating} activeBrand={activeBrand} designerPostSizeId={designerPostSizeId} designerWhiteBg={designerWhiteBg} designerHideLogo={designerHideLogo} /></div>)}
          <span style={{ fontSize: 10, color: "#52556B", padding: "0 4px" }}>{msg.time}</span>
        </div>))}
        {isGenerating && (<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}><div style={{ padding: "20px 24px", borderRadius: 14, background: "rgba(108,43,217,0.06)", border: "1px solid rgba(108,43,217,0.15)", width: "100%" }}><LoadingDots text={generationPhase === "url" ? "Fetching article" : generationPhase === "prepare" ? "Claude: channel-aware brief" : generationPhase === "text" ? loadingTextForTextPhase(activeChannels) : generationPhase === "images" ? "Generating images" : "Working"} /><div style={{ marginTop: 10, display: "flex", gap: 6 }}>{activeChannels.map(chId => { const c = CHANNELS.find(x => x.id === chId); return c ? <span key={chId} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: c.color + "15", color: c.color }}>{c.label}</span> : null; })}</div></div></div>)}
        <div ref={endRef} />
      </div>)}
    </div>

    {/* Input Area — flexShrink:0 + z-index so this strip is never covered or squashed by the message list */}
    <div style={{ flexShrink: 0, position: "relative", zIndex: 8, padding: "16px 24px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)", boxShadow: "0 -8px 24px rgba(0,0,0,0.35)" }}>
      {selectedTpl && (<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(108,43,217,0.08)", border: "1px solid rgba(108,43,217,0.15)", marginBottom: 10 }}><StudioLucide name={selectedTpl.lucide} size={18} color="#C4B5FD" /><span style={{ fontSize: 12, fontWeight: 600, color: "#C4B5FD" }}>{selectedTpl.name}</span><span style={{ fontSize: 11, color: "#6B7084" }}>· {selectedTpl.channels.length} channels</span><button type="button" aria-label="Clear template" onClick={() => setSelectedTemplateId(null)} style={{ marginLeft: "auto", color: "#6B7084", background: "none", border: "none", cursor: "pointer", padding: "2px 6px", display: "flex", alignItems: "center" }}><StudioLucide name="X" size={16} color="#6B7084" /></button></div>)}
      <div style={{ marginBottom: 6 }} onMouseDown={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#52556B", fontWeight: 600 }}>CHANNELS</span>
          <span style={{ fontSize: 10, color: "#6B7084" }}>Uncheck to exclude from the next run</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {CHANNELS.map((ch) => {
            const on = activeChannels.includes(ch.id);
            const boxId = `ce-chan-${ch.id}`;
            return (
              <label
                key={ch.id}
                htmlFor={boxId}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 10px 6px 8px",
                  borderRadius: 8,
                  cursor: "pointer",
                  userSelect: "none",
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  background: on ? ch.color + "18" : "rgba(255,255,255,0.04)",
                  color: on ? ch.color : "#8B8DA3",
                  border: on ? `1px solid ${ch.color}55` : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <input
                  id={boxId}
                  type="checkbox"
                  checked={on}
                  onChange={(e) => {
                    e.stopPropagation();
                    const checked = e.target.checked;
                    setActiveChannels((prev) => {
                      if (checked) return prev.includes(ch.id) ? prev : [...prev, ch.id];
                      return prev.filter((id) => id !== ch.id);
                    });
                    if (checked && setActiveChannel) setActiveChannel(ch.id);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ width: 16, height: 16, accentColor: ch.color, cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{ width: 14, height: 14, borderRadius: 3, fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", background: on ? ch.color : "rgba(255,255,255,0.08)", color: on ? "white" : "#52556B" }}>{ch.icon}</span>
                {ch.label}
              </label>
            );
          })}
        </div>
        {activeChannels.includes("linkedin") && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <label
              htmlFor="ce-li-carousel"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none", fontSize: 11, fontWeight: 600, fontFamily: "inherit", color: "#93C5FD" }}
            >
              <input
                id="ce-li-carousel"
                type="checkbox"
                checked={linkedinIncludeCarousel}
                onChange={(e) => {
                  e.stopPropagation();
                  setLinkedinIncludeCarousel(e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                style={{ width: 16, height: 16, accentColor: "#0A66C2", cursor: "pointer", flexShrink: 0 }}
              />
              LinkedIn carousel (3 slide visuals)
            </label>
            <div style={{ fontSize: 10, color: "#6B7084", marginTop: 4, marginLeft: 24, lineHeight: 1.4 }}>
              Unchecked = only the hero visual is created (no carousel-1 / carousel-2 / carousel-3).
            </div>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#52556B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>Visual designer (same as designer app)</div>
        <div style={{ fontSize: 10, color: "#6B7084", lineHeight: 1.4, marginBottom: 8 }}>Post size, white background, and template are sent to the structure step and the image model (including white-bg vs transparent vs gradient rules).</div>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#6B7084", fontWeight: 600 }}>Post size</span>
          {DESIGNER_POST_SIZE_OPTIONS.map((o) => (<button key={o.id} type="button" onClick={() => setDesignerPostSizeId(o.id)} style={{ padding: "4px 10px", borderRadius: 6, border: designerPostSizeId === o.id ? "1px solid rgba(108,43,217,0.5)" : "1px solid rgba(255,255,255,0.08)", background: designerPostSizeId === o.id ? "rgba(108,43,217,0.15)" : "rgba(255,255,255,0.03)", color: designerPostSizeId === o.id ? "#C4B5FD" : "#8B8DA3", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{o.label}</button>))}
          <button type="button" onClick={() => setDesignerWhiteBg((v) => !v)} style={{ padding: "4px 10px", borderRadius: 6, border: designerWhiteBg ? "1px solid rgba(108,43,217,0.5)" : "1px solid rgba(255,255,255,0.08)", background: designerWhiteBg ? "rgba(108,43,217,0.2)" : "rgba(255,255,255,0.03)", color: designerWhiteBg ? "#C4B5FD" : "#8B8DA3", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>White bg {designerWhiteBg ? "On" : "Off"}</button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#6B7084", fontWeight: 600 }}>
            Template
            <select value={designerThemeId} onChange={(e) => setDesignerThemeId(e.target.value)} style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.1)", background: "#1A1B23", color: "#E2E4EA", fontSize: 11, fontFamily: "inherit", maxWidth: 200 }}>
              {DESIGNER_THEME_OPTIONS.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
            </select>
          </label>
        </div>
      </div>
      <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" }}>
          <select
            value={inputMode}
            onChange={(e) => {
              setInputMode(e.target.value);
              ref.current?.focus();
            }}
            disabled={isGenerating}
            aria-label="Input mode"
            style={{
              padding: "5px 30px 5px 12px",
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.08)",
              backgroundColor: "rgba(255,255,255,0.04)",
              backgroundImage: NATIVE_SELECT_CHEVRON,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              backgroundSize: "12px 12px",
              color: "#E2E4EA",
              fontSize: 12,
              fontWeight: 600,
              cursor: isGenerating ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: isGenerating ? 0.45 : 1,
              appearance: "none",
              WebkitAppearance: "none",
              minWidth: 160,
              maxWidth: 240,
              colorScheme: "dark",
            }}
          >
            {INPUT_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            disabled={isGenerating}
            aria-label="Writing tone"
            style={{
              padding: "5px 30px 5px 12px",
              borderRadius: 7,
              border: "1px solid rgba(245,158,11,0.2)",
              backgroundColor: "rgba(245,158,11,0.08)",
              backgroundImage: NATIVE_SELECT_CHEVRON,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 10px center",
              backgroundSize: "12px 12px",
              color: "#FBBF24",
              fontSize: 12,
              fontWeight: 600,
              cursor: isGenerating ? "default" : "pointer",
              fontFamily: "inherit",
              opacity: isGenerating ? 0.45 : 1,
              appearance: "none",
              WebkitAppearance: "none",
              minWidth: 140,
              colorScheme: "dark",
            }}
          >
            {TONES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}><span style={{ fontSize: 10, color: "#6B7084", fontWeight: 600, padding: "0 4px" }}>Text</span>{[1, 2, 3, 4].map(n => (<button key={n} onClick={() => setNumText(n)} style={{ width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit", background: numText === n ? "rgba(108,43,217,0.3)" : "transparent", color: numText === n ? "#C4B5FD" : "#52556B" }}>{n}</button>))}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} title="0 = text only, no image slots or auto-generation"><span style={{ fontSize: 10, color: "#6B7084", fontWeight: 600, padding: "0 2px 0 4px" }}>Visual</span>{[0, 1, 2, 3, 4].map(n => (<button key={n} type="button" onClick={() => setNumVisual(n)} style={{ minWidth: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit", background: numVisual === n ? "rgba(20,184,166,0.3)" : "transparent", color: numVisual === n ? "#5EEAD4" : "#52556B", padding: "0 4px" }}>{n}</button>))}</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>{cfgModels.map(m => <span key={m.id} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: m.color + "18", color: m.color, fontWeight: 600 }}>{m.name}</span>)}{cfgModels.length === 0 && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "rgba(239,68,68,0.12)", color: "#FCA5A5", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}><StudioLucide name="Settings" size={12} color="#FCA5A5" /> No models</span>}</div>
        </div>
        {inputMode === "upload" && (
          <div style={{ padding: "8px 14px 0", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,image/png,image/jpeg,image/jpg,image/webp,image/gif"
              disabled={isGenerating}
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                setUploadFile(f || null);
              }}
            />
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
                color: "#C4B5FD",
                fontSize: 12,
                fontWeight: 600,
                cursor: isGenerating ? "default" : "pointer",
                fontFamily: "inherit",
              }}
            >
              Choose file
            </button>
            <span style={{ fontSize: 11, color: uploadFile ? "#8B8DA3" : "#52556B" }}>
              {uploadFile ? uploadFile.name : "PDF, Word (.docx), or image — analyzed with Claude, then posts / landing / images"}
            </span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "flex-end", padding: 4 }}><textarea ref={ref} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { if (inputMode === "upload" && !uploadFile) return; e.preventDefault(); send(); } }} placeholder={placeholder} disabled={isGenerating} style={{ flex: 1, padding: "12px 14px", border: "none", background: "transparent", color: "#E2E4EA", fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "none", minHeight: 48, maxHeight: 160, lineHeight: 1.5, opacity: isGenerating ? 0.5 : 1 }} rows={2} /><div style={{ padding: 8 }}><button onClick={send} disabled={!canSend} style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: canSend ? "linear-gradient(135deg,#6C2BD9,#5B21B6)" : "rgba(255,255,255,0.04)", color: canSend ? "white" : "#52556B", cursor: canSend ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>{isGenerating ? <LoadingDots text="" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>}</button></div></div>
      </div>
    </div>
  </div>);
}

// ─── Right Panel ────────────────────────────────────────────────────────
function RightPanel({ activeChannels, setActiveChannels, activeChannel, setActiveChannel, collapsed, previewData, addToast, activeBrand, onTextEdit, onOpenDesigner, designerPostSizeId = "1080x1080-trns", designerWhiteBg = true, designerHideLogo = false, width = 380, apiKeys = {}, tone = "Professional", selectedTemplateId = null, studioTextModel }) {
  if (collapsed) return null;
  const pd = previewData || {};
  const text = pd.text != null && pd.text !== "" ? pd.text : "Your generated content will appear here...";
  const slots = pd.visualSlots || [];
  const [editing, setEditing] = useState(false); const [editText, setEditText] = useState(text); const [versionIdx, setVersionIdx] = useState(0); const [versions, setVersions] = useState([{ text, time: "now" }]);
  const [landingRevisePrompt, setLandingRevisePrompt] = useState("");
  const [landingReviseBusy, setLandingReviseBusy] = useState(false);
  const [htmlVideoOverlayOpen, setHtmlVideoOverlayOpen] = useState(false);
  const [htmlVideoOverlayScale, setHtmlVideoOverlayScale] = useState(1);
  const htmlVideoOverlayWrapRef = useRef(null);

  useEffect(() => { setEditText(text); setVersions([{ text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]); setVersionIdx(0); setEditing(false); }, [text]);

  useEffect(() => {
    if (activeChannel !== "html-video") setHtmlVideoOverlayOpen(false);
  }, [activeChannel]);

  useEffect(() => {
    if (!htmlVideoOverlayOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setHtmlVideoOverlayOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [htmlVideoOverlayOpen]);

  useEffect(() => {
    if (!htmlVideoOverlayOpen) return;
    const el = htmlVideoOverlayWrapRef.current;
    if (!el) return;
    const update = () => {
      const pad = 32;
      const w = Math.max(0, el.clientWidth - pad);
      const h = Math.max(0, el.clientHeight - pad);
      const s = Math.min(w / 1280, h / 720, 1);
      setHtmlVideoOverlayScale(s > 0 ? s : 1);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [htmlVideoOverlayOpen]);

  const saveEdit = () => {
    const newVer = { text: editText, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setVersions(p => [...p, newVer]); setVersionIdx(versions.length); setEditing(false);
    onTextEdit?.(editText);
  };
  const revertTo = (idx) => { setVersionIdx(idx); setEditText(versions[idx].text); };
  const curText = versions[versionIdx]?.text || text;
  const htmlVideoDoc = activeChannel === "html-video" ? extractHtmlVideoDocument(curText) : "";
  const htmlVideoValid = /<!DOCTYPE\s+html/i.test(htmlVideoDoc) || /<html[\s>]/i.test(htmlVideoDoc);
  const hasLandingSource =
    activeChannel === "landing" &&
    isFullLandingHtml(curText) &&
    !/^Your generated content will appear here/i.test(curText.trim());
  const runLandingRevise = async () => {
    const instr = landingRevisePrompt.trim();
    if (!hasLandingSource || !instr || landingReviseBusy) return;
    setLandingReviseBusy(true);
    try {
      const result = await reviseLandingPage({
        sectionsHtml: curText,
        instructions: instr,
        templateId: selectedTemplateId,
        brand: activeBrand,
        tone,
        numVariants: 1,
        apiKeys,
        textModel: studioTextModel,
      });
      const newText = result.variants?.[0]?.text?.trim();
      if (!newText) throw new Error("Empty response from model");
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const newVer = { text: newText, time };
      let newIndex = 0;
      setVersions((prev) => {
        newIndex = prev.length;
        return [...prev, newVer];
      });
      setVersionIdx(newIndex);
      setEditText(newText);
      setLandingRevisePrompt("");
      setEditing(false);
      onTextEdit?.(newText);
      addToast("Landing page updated from your instructions", "success");
    } catch (err) {
      addToast(err?.message || "Could not update landing page", "error");
    } finally {
      setLandingReviseBusy(false);
    }
  };
  const brandHFont = activeBrand?.typography?.heading_font;
  const brandBFont = activeBrand?.typography?.body_font;

  const renderVisualSlot = (s, i, height = 140) => {
    const indices = getVisualSelectedIndices(s);
    const hasPick = indices.length > 0;
    const previewIdx = hasPick ? (indices.find((ix) => s.variants?.[ix]?.url) ?? indices[0]) : -1;
    const sel = previewIdx >= 0 ? s.variants[previewIdx] : null;
    if (sel?.url) {
      return (
        <DesignerMiniPreview
          key={i}
          imageUrl={sel.url}
          sourceText={curText}
          postSizeId={designerPostSizeId}
          whiteBg={designerWhiteBg}
          hideLogo={designerHideLogo}
          designerContent={sel.designerContent}
          heightPx={height}
          onOpenDesigner={onOpenDesigner}
          slotLabel={slots.length > 1 ? s.slot : undefined}
          visualSlots={slots}
        />
      );
    }
    if (!hasPick) {
      return (
        <div key={i} style={{ marginTop: 12, height, borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 600 }}>{s.slot.replace(/-/g, " ")}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)" }}>No visual selected</span>
        </div>
      );
    }
    return <div key={i} style={{ marginTop: 12, height, borderRadius: 10, background: `linear-gradient(${135 + i * 20}deg,hsl(${sel?.hue || 250},35%,22%),hsl(${(sel?.hue || 250) + 40},45%,16%))`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{s.slot}</span><span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>v{previewIdx + 1} of {s.variants.length}{indices.length > 1 ? ` (+${indices.length - 1})` : ""}</span></div>;
  };

  const htmlVideoExpandedPortal =
    typeof document !== "undefined" &&
    htmlVideoOverlayOpen &&
    activeChannel === "html-video" &&
    htmlVideoValid &&
    !editing
      ? createPortal(
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 10000,
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "stretch",
            }}
          >
            <button
              type="button"
              aria-label="Close expanded preview"
              onClick={() => setHtmlVideoOverlayOpen(false)}
              style={{
                flex: 1,
                minWidth: 40,
                border: "none",
                background: "rgba(0,0,0,0.5)",
                cursor: "pointer",
              }}
            />
            <div
              style={{
                width: "min(960px, 100vw)",
                maxWidth: "100%",
                height: "100%",
                background: "#08090f",
                borderLeft: "1px solid rgba(255,255,255,0.12)",
                boxShadow: "-12px 0 48px rgba(0,0,0,0.55)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 700, color: "#E2E4EA" }}>HTML video · expanded</span>
                <button
                  type="button"
                  onClick={() => setHtmlVideoOverlayOpen(false)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#C4B5FD",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <StudioLucide name="X" size={14} color="#C4B5FD" />
                  Close
                </button>
              </div>
              <div
                ref={htmlVideoOverlayWrapRef}
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 16,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: 1280 * htmlVideoOverlayScale,
                    height: 720 * htmlVideoOverlayScale,
                    position: "relative",
                    flexShrink: 0,
                  }}
                >
                  <iframe
                    srcDoc={htmlVideoDoc}
                    sandbox="allow-scripts allow-same-origin"
                    title="HTML Video expanded"
                    style={{
                      width: 1280,
                      height: 720,
                      border: "none",
                      transform: `scale(${htmlVideoOverlayScale})`,
                      transformOrigin: "top left",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                  />
                </div>
              </div>
              <p style={{ margin: 0, padding: "10px 16px 14px", fontSize: 11, color: "#6B7084", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                ← → Space · step scenes · <span style={{ fontFamily: "monospace", color: "#A855F7" }}>a</span> · resume autoplay · Esc closes
              </p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div style={{ width, minWidth: 280, height: "100%", borderLeft: "none", display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
    <div style={{ display: "flex", padding: "8px 12px", gap: 6, borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", alignItems: "center" }}>
      {CHANNELS.filter((c) => activeChannels.includes(c.id)).map((ch) => (
        <div
          key={ch.id}
          style={{
            display: "flex",
            alignItems: "center",
            borderRadius: 8,
            overflow: "hidden",
            flexShrink: 0,
            background: activeChannel === ch.id ? ch.color + "18" : "rgba(255,255,255,0.04)",
            border: `1px solid ${activeChannel === ch.id ? ch.color + "55" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveChannel(ch.id)}
            style={{
              padding: "6px 10px",
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "transparent",
              color: activeChannel === ch.id ? ch.color : "#6B7084",
            }}
          >
            <span style={{ width: 16, height: 16, borderRadius: 4, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", background: activeChannel === ch.id ? ch.color : "rgba(255,255,255,0.08)", color: activeChannel === ch.id ? "white" : "#52556B" }}>{ch.icon}</span>
            {ch.label}
          </button>
          <button
            type="button"
            title={`Remove ${ch.label} from next generation`}
            aria-label={`Remove ${ch.label}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveChannels?.((prev) => prev.filter((id) => id !== ch.id));
            }}
            style={{
              padding: "4px 8px",
              border: "none",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              cursor: "pointer",
              fontSize: 14,
              lineHeight: 1,
              fontWeight: 600,
              fontFamily: "inherit",
              background: "rgba(0,0,0,0.15)",
              color: "#8B8DA3",
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
    <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
      <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
        {activeChannel === "linkedin" && <div style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#6C2BD9,#14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "white" }}>P</div><div><div style={{ fontSize: 14, fontWeight: 700, color: "#E2E4EA" }}>Prashanth Kumar</div><div style={{ fontSize: 12, color: "#6B7084" }}>CTO & Co-founder at Enkrypt AI</div><div style={{ fontSize: 11, color: "#52556B", display: "flex", alignItems: "center", gap: 6 }}>Just now · <StudioLucide name="Globe" size={12} color="#52556B" /></div></div></div>
          {editing ? <div><textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: "100%", minHeight: 120, padding: 12, borderRadius: 10, border: "1px solid rgba(108,43,217,0.3)", background: "rgba(108,43,217,0.05)", color: "#E2E4EA", fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7, outline: "none", resize: "vertical", boxSizing: "border-box" }} /><div style={{ display: "flex", gap: 6, marginTop: 8 }}><button onClick={saveEdit} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#6C2BD9,#5B21B6)", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button><button onClick={() => { setEditing(false); setEditText(versions[versionIdx].text); }} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#8B8DA3", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button></div></div> : <div onClick={() => setEditing(true)} style={{ fontSize: 13, color: "#C4C6D0", lineHeight: 1.7, cursor: "text", whiteSpace: "pre-wrap", padding: 4, borderRadius: 8, transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(108,43,217,0.05)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{curText}</div>}
          {slots.length > 0 ? slots.map((s, i) => renderVisualSlot(s, i)) : null}
          <div style={{ display: "flex", gap: 16, marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)", alignItems: "center", flexWrap: "wrap" }}>{[{ label: "Like", lucide: "ThumbsUp" }, { label: "Comment", lucide: "MessageCircle" }, { label: "Repost", lucide: "Repeat2" }, { label: "Send", lucide: "Send" }].map(({ label, lucide }) => (<span key={label} style={{ fontSize: 12, color: "#52556B", display: "inline-flex", alignItems: "center", gap: 5 }}><StudioLucide name={lucide} size={14} color="#52556B" />{label}</span>))}</div>
        </div>}
        {activeChannel === "twitter" && <div style={{ padding: 16 }}><div style={{ display: "flex", gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#6C2BD9,#14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "white", flexShrink: 0 }}>P</div><div style={{ flex: 1 }}><div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 14, fontWeight: 700, color: "#E2E4EA" }}>Prashanth</span><span style={{ fontSize: 13, color: "#52556B" }}>@prashanth_ai · now</span></div>{editing ? <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: "100%", minHeight: 80, padding: 8, borderRadius: 8, border: "1px solid rgba(29,155,240,0.3)", background: "rgba(29,155,240,0.05)", color: "#E2E4EA", fontSize: 14, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, outline: "none", resize: "vertical", marginTop: 6, boxSizing: "border-box" }} /> : <div onClick={() => setEditing(true)} style={{ fontSize: 14, color: "#C4C6D0", lineHeight: 1.6, marginTop: 6, cursor: "text" }}>{curText.slice(0, 280)}</div>}{cc(curText) > 280 && <div style={{ fontSize: 11, color: "#FCA5A5", marginTop: 4, fontWeight: 600 }}>{cc(curText)}/280 — over limit</div>}</div></div></div>}
        {activeChannel === "landing" && <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#E2E4EA", margin: 0, ...(brandHFont ? { fontFamily: `'${brandHFont}', sans-serif` } : {}) }}>Landing Page Preview</h2>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setEditing(!editing)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: editing ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.03)", color: editing ? "#EC4899" : "#8B8DA3", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{editing ? "Preview" : "Edit Source"}</button>
              <button onClick={() => { const html = extractLandingPageDocument(curText); const blob = new Blob([html], { type: "text/html" }); const url = URL.createObjectURL(blob); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60000); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(236,72,153,0.3)", background: "rgba(236,72,153,0.1)", color: "#EC4899", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Open Full</button>
            </div>
          </div>
          {hasLandingSource && (
            <div style={{ marginBottom: 12, padding: 12, borderRadius: 10, border: "1px solid rgba(236,72,153,0.2)", background: "rgba(236,72,153,0.04)" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#F9A8D4", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <StudioLucide name="Sparkles" size={14} color="#F9A8D4" />
                Edit with AI
              </div>
              <p style={{ margin: "0 0 8px", fontSize: 11, color: "#8B8DA3", lineHeight: 1.5 }}>
                Describe what to change — e.g. shorten the hero headline, add a FAQ about pricing, or change the primary CTA label. The model updates your sections and leaves unrelated parts as unchanged as possible.
              </p>
              <textarea
                value={landingRevisePrompt}
                onChange={(e) => setLandingRevisePrompt(e.target.value)}
                placeholder="What should change on this landing page?"
                disabled={landingReviseBusy}
                rows={3}
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(0,0,0,0.25)",
                  color: "#E2E4EA",
                  fontSize: 12,
                  fontFamily: "'DM Sans', sans-serif",
                  lineHeight: 1.5,
                  outline: "none",
                  resize: "vertical",
                  boxSizing: "border-box",
                  marginBottom: 8,
                  opacity: landingReviseBusy ? 0.6 : 1,
                }}
              />
              <button
                type="button"
                onClick={() => runLandingRevise()}
                disabled={landingReviseBusy || !landingRevisePrompt.trim()}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    landingReviseBusy || !landingRevisePrompt.trim()
                      ? "rgba(255,255,255,0.08)"
                      : "linear-gradient(135deg,#EC4899,#6C2BD9)",
                  color: landingReviseBusy || !landingRevisePrompt.trim() ? "#52556B" : "white",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: landingReviseBusy || !landingRevisePrompt.trim() ? "default" : "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {landingReviseBusy ? (
                  <>
                    <LoadingDots text="Updating" />
                  </>
                ) : (
                  <>
                    <StudioLucide name="PenLine" size={14} color="white" />
                    Apply changes
                  </>
                )}
              </button>
            </div>
          )}
          {editing ? <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: "100%", minHeight: 300, padding: 12, borderRadius: 10, border: "1px solid rgba(236,72,153,0.3)", background: "rgba(236,72,153,0.03)", color: "#E2E4EA", fontSize: 12, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box", tabSize: 2 }} /> :
          <div style={{ borderRadius: 10, overflow: "auto", border: "1px solid rgba(255,255,255,0.08)", background: "#0C0D14", height: 600, position: "relative" }}>
            <iframe
              srcDoc={
                hasLandingSource
                  ? extractLandingPageDocument(curText)
                  : "<!DOCTYPE html><html><head><meta charset='utf-8'><style>body{font-family:system-ui;margin:40px;color:#888;background:#0C0D14}</style></head><body><p>Generate a landing page to preview. The model returns a full HTML document.</p></body></html>"
              }
              sandbox="allow-scripts allow-same-origin"
              style={{ width: "200%", height: 3000, border: "none", transform: "scale(0.5)", transformOrigin: "top left", display: "block", pointerEvents: "auto" }}
              title="Landing Page Preview"
            />
          </div>}
          {editing && <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button onClick={saveEdit} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#EC4899,#6C2BD9)", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save Changes</button><button onClick={() => { setEditing(false); setEditText(versions[versionIdx].text); }} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#8B8DA3", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button></div>}
        </div>}
        {activeChannel === "html-video" && <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#E2E4EA", margin: 0, ...(brandHFont ? { fontFamily: `'${brandHFont}', sans-serif` } : {}) }}>HTML Video Preview</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEditing(!editing)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: editing ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.03)", color: editing ? "#C4B5FD" : "#8B8DA3", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{editing ? "Preview" : "Edit Source"}</button>
              <button
                type="button"
                disabled={!htmlVideoValid || editing}
                onClick={() => setHtmlVideoOverlayOpen(true)}
                title={!htmlVideoValid ? "Generate or paste HTML first" : "Open wide preview on the right"}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid rgba(168,85,247,0.35)",
                  background: !htmlVideoValid || editing ? "rgba(255,255,255,0.04)" : "rgba(168,85,247,0.12)",
                  color: !htmlVideoValid || editing ? "#52556B" : "#C4B5FD",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: !htmlVideoValid || editing ? "default" : "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <StudioLucide name="Maximize2" size={12} color={!htmlVideoValid || editing ? "#52556B" : "#C4B5FD"} />
                Expand
              </button>
              <button type="button" onClick={() => { const html = extractHtmlVideoDocument(curText); const blob = new Blob([html], { type: "text/html" }); const url = URL.createObjectURL(blob); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60000); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(168,85,247,0.35)", background: "rgba(168,85,247,0.12)", color: "#C4B5FD", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Open Full</button>
            </div>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 11, color: "#8B8DA3", lineHeight: 1.55 }}>1280×720 scene sequencer — in the preview use arrow keys or Space to step scenes, <span style={{ fontFamily: "monospace", color: "#A855F7" }}>a</span> to resume autoplay.</p>
          {!editing && !htmlVideoValid && (
            <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 8, background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", fontSize: 11, color: "#C4B5FD", lineHeight: 1.5 }}>
              No HTML video document yet for this project. Include <strong style={{ fontWeight: 600 }}>HTML Video</strong> in your channel list and run <strong style={{ fontWeight: 600 }}>Generate</strong>, or use <strong style={{ fontWeight: 600 }}>Edit Source</strong> to paste a full HTML file.
            </div>
          )}
          {editing ? <textarea value={editText} onChange={(e) => setEditText(e.target.value)} style={{ width: "100%", minHeight: 300, padding: 12, borderRadius: 10, border: "1px solid rgba(168,85,247,0.35)", background: "rgba(168,85,247,0.06)", color: "#E2E4EA", fontSize: 12, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box", tabSize: 2 }} /> : (
            <div style={{ borderRadius: 10, overflow: "auto", border: "1px solid rgba(255,255,255,0.08)", background: "#000", height: 600, position: "relative" }}>
              <iframe srcDoc={htmlVideoDoc} sandbox="allow-scripts allow-same-origin" style={{ width: "200%", height: 2200, border: "none", transform: "scale(0.5)", transformOrigin: "top left", display: "block", pointerEvents: "auto" }} title="HTML Video Preview" />
            </div>
          )}
          {editing && <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button type="button" onClick={saveEdit} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#A855F7,#6C2BD9)", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save Changes</button><button type="button" onClick={() => { setEditing(false); setEditText(versions[versionIdx].text); }} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#8B8DA3", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button></div>}
        </div>}
        {["blog", "article"].includes(activeChannel) && <div style={{ padding: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#E2E4EA", margin: "0 0 8px", ...(brandHFont ? { fontFamily: `'${brandHFont}', sans-serif` } : {}) }}>{activeChannel === "blog" ? "Blog Post" : "Article"}</h2>
          {slots.length > 0 && renderVisualSlot(slots[0], 0)}
          {editing ? <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: "100%", minHeight: 200, padding: 12, borderRadius: 10, border: "1px solid rgba(16,185,129,0.3)", background: "rgba(16,185,129,0.03)", color: "#E2E4EA", fontSize: 14, fontFamily: brandBFont ? `'${brandBFont}', sans-serif` : "'DM Sans',sans-serif", lineHeight: 1.8, outline: "none", resize: "vertical", boxSizing: "border-box", marginTop: 16 }} /> : <div onClick={() => setEditing(true)} style={{ cursor: "text", marginTop: 16 }}><SimpleMarkdown text={curText} headingFont={brandHFont} bodyFont={brandBFont} /></div>}
          {slots.length > 1 && <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>{slots.slice(1).map((s, i) => renderVisualSlot(s, i + 1))}</div>}
        </div>}
      </div>

      {/* Quick Actions */}
      <div style={{ marginTop: 16, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#52556B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Quick Actions</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button type="button" onClick={() => setEditing(true)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: "#8B8DA3", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><StudioLucide name="Pencil" size={14} color="#8B8DA3" /> Edit</button>
          {slots.some((s) => getVisualSelectedIndices(s).some((ix) => s.variants?.[ix]?.url)) && <button type="button" onClick={() => { for (const s of slots) { const idxs = getVisualSelectedIndices(s); const hit = idxs.find((ix) => s.variants?.[ix]?.url); if (hit != null) { const v = s.variants[hit]; onOpenDesigner?.(v.url, v.designerContent, slots); break; } } }} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(108,43,217,0.35)", background: "rgba(108,43,217,0.08)", color: "#C4B5FD", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><StudioLucide name="Palette" size={14} color="#C4B5FD" /> Visual designer</button>}
          <button type="button" onClick={() => { clipCopy(curText).then(ok => addToast(ok ? "Copied!" : "Copy failed", ok ? "success" : "error")); }} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: "#8B8DA3", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><StudioLucide name="Copy" size={14} color="#8B8DA3" /> Copy</button>
          <button type="button" onClick={() => { if (activeChannel === "html-video") { downloadFile(extractHtmlVideoDocument(curText), `${activeBrand?.company_name || "HTML-Video"}.html`, "text/html"); addToast("Downloaded HTML video", "success"); } else if (activeChannel === "landing") { downloadFile(extractLandingPageDocument(curText), `${activeBrand?.company_name || "Landing-Page"}.html`, "text/html"); addToast("Downloaded landing HTML", "success"); } else { downloadFile(curText, `${activeChannel}-content.md`, "text/markdown"); addToast("Downloaded!", "success"); } }} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: "#8B8DA3", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 6 }}><StudioLucide name="Download" size={14} color="#8B8DA3" /> {activeChannel === "html-video" || activeChannel === "landing" ? "Download .html" : "Download"}</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 16 }}>
        <span style={{ fontSize: 11, color: "#52556B" }}>{wc(curText)} words</span>
        <span style={{ fontSize: 11, color: "#52556B" }}>{cc(curText)} chars</span>
        {activeChannel === "twitter" && <span style={{ fontSize: 11, color: cc(curText) > 280 ? "#FCA5A5" : "#52556B", fontWeight: cc(curText) > 280 ? 600 : 400 }}>{cc(curText)}/280</span>}
      </div>

      {/* Version History */}
      <div style={{ marginTop: 12, padding: 14, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#52556B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>Version History · {versions.length}</div>
        {versions.length > 1 ? <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{versions.map((v, i) => (<div key={i} onClick={() => revertTo(i)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 8, cursor: "pointer", background: versionIdx === i ? "rgba(108,43,217,0.1)" : "transparent", border: versionIdx === i ? "1px solid rgba(108,43,217,0.2)" : "1px solid transparent" }} onMouseEnter={e => { if (versionIdx !== i) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }} onMouseLeave={e => { if (versionIdx !== i) e.currentTarget.style.background = "transparent"; }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: versionIdx === i ? "#6C2BD9" : "rgba(255,255,255,0.15)" }} /><span style={{ fontSize: 12, color: versionIdx === i ? "#C4B5FD" : "#6B7084", fontWeight: versionIdx === i ? 600 : 400 }}>v{i + 1}</span><span style={{ fontSize: 11, color: "#52556B", marginLeft: "auto" }}>{v.time}</span></div>))}</div> : <div style={{ display: "flex", alignItems: "center", gap: 8 }}><div style={{ flex: 1, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", position: "relative" }}><div style={{ width: 12, height: 12, borderRadius: "50%", background: "#6C2BD9", position: "absolute", top: -4, left: "0%", border: "2px solid #1A1B23" }} /></div><span style={{ fontSize: 11, color: "#52556B", whiteSpace: "nowrap" }}>v1 of 1</span></div>}
      </div>
    </div>
  </div>
  {htmlVideoExpandedPortal}
  </>
  );
}

// ─── Main Workspace ─────────────────────────────────────────────────────
export default function Workspace({ user, onLogout }) {
  const [leftCollapsed, setLeftCollapsed] = useState(false); const [rightCollapsed, setRightCollapsed] = useState(false); const [leftTab, setLeftTab] = useState("templates");
  const [leftWidth, setLeftWidth] = useState(280); const [rightWidth, setRightWidth] = useState(380);
  const [activeChannels, setActiveChannels] = useState(["linkedin", "twitter"]); const [activeChannel, setActiveChannel] = useState("linkedin");
  /** When false (default), LinkedIn bundle gets hero visual only — no carousel-1/2/3 slots. */
  const [linkedinIncludeCarousel, setLinkedinIncludeCarousel] = useState(false);
  const [inputMode, setInputMode] = useState("text"); const [tone, setTone] = useState("Professional"); const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [activeBrandId, setActiveBrandId] = useState("brand-1"); const [brandDrop, setBrandDrop] = useState(false);
  const brandBtnRef = useRef(null);
  const brandMenuRef = useRef(null);
  const [brands, setBrands] = useState(defaultBrands); const [showApiKeys, setShowApiKeys] = useState(false); const [apiKeys, setApiKeys] = useState({});
  const [brandEditorOpen, setBrandEditorOpen] = useState(false); const [editingBrand, setEditingBrand] = useState(null);
  const [previewData, setPreviewData] = useState(null); const [showExport, setShowExport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState(null);
  const [serverStatus, setServerStatus] = useState({});
  const [toasts, setToasts] = useState([]);
  const [designerOverlay, setDesignerOverlay] = useState({
    open: false,
    embedKey: 0,
    visualOptions: [],
    activeVisualIndex: 0,
  });
  const [designerPostSizeId, setDesignerPostSizeId] = useState("1080x1080-trns");
  const [designerWhiteBg, setDesignerWhiteBg] = useState(true);
  const [designerThemeId, setDesignerThemeId] = useState("none");
  const [designerHideLogo, setDesignerHideLogo] = useState(false);
  const [studioTextModel, setStudioTextModel] = useState(() =>
    normalizeStudioTextModel(loadStudioModelPrefs()?.textModel)
  );
  const [studioImageModel, setStudioImageModel] = useState(() =>
    normalizeStudioImageModel(loadStudioModelPrefs()?.imageModel)
  );
  const [studioVideoModel, setStudioVideoModel] = useState(() =>
    normalizeStudioVideoModel(loadStudioModelPrefs()?.videoModel)
  );
  const [modelsMenuOpen, setModelsMenuOpen] = useState(false);
  const modelsBtnRef = useRef(null);
  const modelsMenuRef = useRef(null);
  const addToast = (message, type = "info") => { const id = Date.now() + Math.random(); setToasts(p => [...p, { id, message, type }]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500); };
  const designerLayoutForEmbed = () => ({
    postSizeId: designerPostSizeId,
    designerWhiteBg,
    themeId: designerThemeId,
    hideLogo: designerHideLogo,
  });
  const openDesignerWithImage = (url, designerContent, visualSlotsArg) => {
    const lastAi = [...currentMessages].reverse().find((m) => m.role === "assistant");
    const ch = previewData?.channel || activeChannel;
    const fromArg = Array.isArray(visualSlotsArg) ? visualSlotsArg : [];
    const fromBundle = lastAi?.bundle?.[ch]?.visualSlots || [];
    const useSlots = fromArg.length ? fromArg : fromBundle;
    const { options, activeIndex } = buildDesignerVisualPickerOptions(useSlots, url);
    const list =
      options.length > 0
        ? options
        : url
          ? [{ url, designerContent: designerContent || null, label: "Visual" }]
          : [];
    if (!list.length) return;
    const idx = options.length > 0 ? activeIndex : 0;
    const cur = list[idx];
    primeDesignerEmbed(cur.url, cur.designerContent ?? designerContent ?? null, designerLayoutForEmbed(), activeBrand || null);
    setDesignerOverlay({
      open: true,
      embedKey: Date.now(),
      visualOptions: list,
      activeVisualIndex: idx,
    });
  };
  const closeDesignerOverlay = () =>
    setDesignerOverlay((p) => ({
      ...p,
      open: false,
      visualOptions: [],
      activeVisualIndex: 0,
    }));
  const setDesignerOverlayVisualIndex = (next) => {
    setDesignerOverlay((p) => {
      const n = p.visualOptions?.length ?? 0;
      if (n < 2) return p;
      const i = typeof next === "function" ? next(p.activeVisualIndex) : next;
      const clamped = ((Number(i) % n) + n) % n;
      return { ...p, activeVisualIndex: clamped };
    });
  };
  const handleDesignerEmbedSettings = (payload) => {
    const allowed = ["1080x1080", "1080x1080-trns", "1920x1080"];
    if (payload?.postSizeId && allowed.includes(payload.postSizeId)) {
      setDesignerPostSizeId(payload.postSizeId);
    }
    if (typeof payload?.designerWhiteBg === "boolean") {
      setDesignerWhiteBg(payload.designerWhiteBg);
    }
    if (payload?.themeId && typeof payload.themeId === "string") {
      setDesignerThemeId(payload.themeId);
    }
    if (typeof payload?.hideLogo === "boolean") {
      setDesignerHideLogo(payload.hideLogo);
    }
  };

  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [projectTitle, setProjectTitle] = useState("Untitled Project");
  const saveTimerRef = useRef(null);

  useEffect(() => {
    try { const s = localStorage.getItem("ce_api_keys"); if (s) setApiKeys(JSON.parse(s)); } catch {}
    try { const b = localStorage.getItem("ce_active_brand"); if (b) setActiveBrandId(b); } catch {}
    checkProviderStatus().then(setServerStatus).catch(() => {});
    loadBrands()
      .then((saved) => {
        if (saved && saved.length > 0) {
          const migrated = saved.map((b) => {
            try {
              return isEnkryptStudioBrand(b) ? syncEnkryptMarketingPrimaryToCanonical(b) : b;
            } catch {
              return b;
            }
          });
          setBrands(migrated);
          migrated.forEach((b, i) => {
            if (!isEnkryptStudioBrand(b)) return;
            const prev = saved[i];
            const sig = (x) =>
              JSON.stringify({
                primary: x.colors?.primary,
                secondary: x.colors?.secondary,
                gradients: x.gradients,
              });
            if (sig(b) !== sig(prev)) saveBrand(b).catch(() => {});
          });
        } else defaultBrands.forEach((b) => saveBrand(b));
      })
      .catch(() => {});
    loadProjects().then(async (saved) => {
      if (saved && saved.length > 0) {
        setProjects(saved);
        let restoreId = null;
        try { restoreId = localStorage.getItem("ce_active_project"); } catch {}
        const target = restoreId && saved.find(p => p.id === restoreId) ? restoreId : saved[0].id;
        setActiveProjectId(target);
        try {
          const msgs = await loadProjectMessages(target);
          if (msgs && msgs.length > 0) {
            setCurrentMessages(msgs);
            setProjectTitle(saved.find(p => p.id === target)?.title || "Untitled Project");
          } else {
            setProjectTitle(saved.find(p => p.id === target)?.title || "Untitled Project");
          }
        } catch {}
      } else {
        const id = "proj-" + Date.now();
        const firstProj = { id, title: "Untitled Project", brand: "brand-1", channels: [], messageCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        setProjects([firstProj]);
        setActiveProjectId(id);
        saveProject(firstProj, []).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  useEffect(() => { try { localStorage.setItem("ce_active_brand", activeBrandId); } catch {} }, [activeBrandId]);
  useEffect(() => { if (activeProjectId) try { localStorage.setItem("ce_active_project", activeProjectId); } catch {} }, [activeProjectId]);

  useEffect(() => {
    saveStudioModelPrefs({
      textModel: studioTextModel,
      imageModel: studioImageModel,
      videoModel: studioVideoModel,
    });
  }, [studioTextModel, studioImageModel, studioVideoModel]);

  useEffect(() => {
    if (!activeProjectId || isGenerating) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const proj = projects.find(p => p.id === activeProjectId);
      if (!proj) return;
      const projData = { ...proj, title: projectTitle, brand: activeBrandId, channels: activeChannels, messageCount: currentMessages.length };
      saveProject(projData, currentMessages).catch(() => {});
      setProjects(p => p.map(pr => pr.id === activeProjectId ? projData : pr));
    }, 2000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [currentMessages, projectTitle, activeProjectId]);

  const activeBrand = brands.find(b => b.id === activeBrandId);
  const handleSaveBrand = (brand) => { setBrands(p => { const i = p.findIndex(b => b.id === brand.id); if (i >= 0) { const n = [...p]; n[i] = brand; return n; } return [...p, brand]; }); saveBrand(brand).catch(() => {}); addToast("Brand saved", "success"); };
  const openBrandEditor = (brand) => { setEditingBrand(brand); setBrandEditorOpen(true); };

  const selectTemplate = (template) => {
    if (selectedTemplateId === template.id) {
      setSelectedTemplateId(null);
      addToast("Template cleared", "info");
      return;
    }
    setSelectedTemplateId(template.id);
    setInputMode(template.defaultMode || "text");
    setTone(template.defaultTone || "Professional");
    const chans = template.channels || ["linkedin"];
    setActiveChannels(chans);
    if (chans[0]) setActiveChannel(chans[0]);
    addToast(`Template: ${template.name}`, "info");
  };

  const newProject = async () => {
    if (currentMessages.length > 0 && activeProjectId) {
      const oldProj = projects.find(p => p.id === activeProjectId);
      if (oldProj) {
        const updated = { ...oldProj, title: projectTitle, brand: activeBrandId, channels: activeChannels, messageCount: currentMessages.length, updatedAt: new Date().toISOString() };
        setProjects(p => p.map(pr => pr.id === activeProjectId ? updated : pr));
        await saveProject(updated, currentMessages).catch(() => {});
      }
    }
    const id = "proj-" + Date.now();
    const newProj = { id, title: "Untitled Project", brand: activeBrandId, channels: [], messageCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setProjects(p => [newProj, ...p]);
    await saveProject(newProj, []).catch(() => {});
    setActiveProjectId(id); setCurrentMessages([]); setProjectTitle("Untitled Project"); setPreviewData(null); setSelectedTemplateId(null);
  };

  const selectProject = async (id) => {
    if (currentMessages.length > 0 && activeProjectId) {
      const oldProj = projects.find(p => p.id === activeProjectId);
      if (oldProj) {
        const updated = { ...oldProj, title: projectTitle, brand: activeBrandId, channels: activeChannels, messageCount: currentMessages.length, updatedAt: new Date().toISOString() };
        setProjects(p => p.map(pr => pr.id === activeProjectId ? updated : pr));
        await saveProject(updated, currentMessages).catch(() => {});
      }
    }
    const proj = projects.find(p => p.id === id);
    if (proj) {
      setActiveProjectId(id); setProjectTitle(proj.title || "Untitled Project"); setPreviewData(null);
      try {
        const msgs = await loadProjectMessages(id);
        setCurrentMessages(msgs && msgs.length > 0 ? msgs : []);
      } catch { setCurrentMessages([]); }
    }
  };

  useEffect(() => {
    if (currentMessages.length === 1 && currentMessages[0].role === "user" && projectTitle === "Untitled Project") {
      const t = currentMessages[0].content.slice(0, 40) + (currentMessages[0].content.length > 40 ? "..." : "");
      setProjectTitle(t);
    }
  }, [currentMessages, projectTitle]);

  useEffect(() => {
    if (activeChannels.length > 0 && !activeChannels.includes(activeChannel)) {
      setActiveChannel(activeChannels[0]);
    }
  }, [activeChannels, activeChannel]);

  useEffect(() => {
    if (!brandDrop) return;
    const onKey = (e) => {
      if (e.key === "Escape") setBrandDrop(false);
    };
    const onDocDown = (e) => {
      const menu = brandMenuRef.current;
      const btn = brandBtnRef.current;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      if (path.length > 0) {
        if (menu && path.includes(menu)) return;
        if (btn && path.includes(btn)) return;
      } else {
        let t = e.target;
        if (t && t.nodeType === Node.TEXT_NODE) t = t.parentElement;
        if (!t) return;
        if (menu && menu.contains(t)) return;
        if (btn && btn.contains(t)) return;
      }
      setBrandDrop(false);
    };
    window.addEventListener("keydown", onKey);
    const tid = window.setTimeout(() => document.addEventListener("mousedown", onDocDown), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(tid);
      document.removeEventListener("mousedown", onDocDown);
    };
  }, [brandDrop]);

  useEffect(() => {
    if (!modelsMenuOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setModelsMenuOpen(false);
    };
    const onDocDown = (e) => {
      const menu = modelsMenuRef.current;
      const btn = modelsBtnRef.current;
      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      if (path.length > 0) {
        if (menu && path.includes(menu)) return;
        if (btn && path.includes(btn)) return;
      } else {
        let t = e.target;
        if (t && t.nodeType === Node.TEXT_NODE) t = t.parentElement;
        if (!t) return;
        if (menu && menu.contains(t)) return;
        if (btn && btn.contains(t)) return;
      }
      setModelsMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const tid = window.setTimeout(() => document.addEventListener("mousedown", onDocDown), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(tid);
      document.removeEventListener("mousedown", onDocDown);
    };
  }, [modelsMenuOpen]);

  useEffect(() => {
    const lastAi = [...currentMessages].reverse().find(m => m.role === "assistant");
    if (!lastAi?.bundle) return;
    const ch = activeChannel;
    const chData = lastAi.bundle[ch];
    if (chData) {
      setPreviewData({ channel: ch, text: chData.textVariants?.[chData.selectedTextIdx]?.text, visualSlots: chData.visualSlots });
    } else {
      /* Avoid showing another channel’s text when this tab has no bundle yet (e.g. HTML Video just enabled). */
      setPreviewData({ channel: ch, text: null, visualSlots: [] });
    }
  }, [currentMessages, activeChannel]);

  const autoImageRef = useRef(new Set());
  useEffect(() => {
    if (isGenerating) return;
    const lastAi = [...currentMessages].reverse().find(m => m.role === "assistant");
    if (!lastAi?.bundle || autoImageRef.current.has(lastAi.id)) return;
    const longFormChannels = (lastAi.channels || []).filter(ch => ["blog", "article", "landing"].includes(ch));
    const needsImages = longFormChannels.filter((ch) => {
      const slots = lastAi.bundle[ch]?.visualSlots || [];
      return slots.length > 0 && slots.some((s) => getVisualSelectedIndices(s).some((ix) => !s.variants?.[ix]?.url));
    });
    if (needsImages.length > 0) {
      autoImageRef.current.add(lastAi.id);
      (async () => {
        for (const chId of needsImages) {
          await generateAllImages(lastAi.id, chId);
        }
      })();
    }
  }, [currentMessages, isGenerating]);

  const regenerateChannel = async (messageId, channelId) => {
    const aiIdx = currentMessages.findIndex(m => m.id === messageId);
    if (aiIdx < 0) return;
    const userMsg = currentMessages.slice(0, aiIdx).reverse().find(m => m.role === "user");
    if (!userMsg) { addToast("No source message found", "warning"); return; }
    setIsGenerating(true); setGenerationPhase("text");
    try {
      const sourceText = userMsg.preparedInput || userMsg.content;
      const requestedNv = userMsg.numText || 3;
      const numVariants =
        channelId === "landing" || channelId === "html-video" ? 1 : requestedNv;
      const result = await generateText({
        input: sourceText,
        channel: channelId,
        templateId: userMsg.templateId || selectedTemplateId,
        brand: activeBrand,
        numVariants,
        tone: userMsg.tone || tone,
        apiKeys,
        textModel: studioTextModel,
      });
      setCurrentMessages(p => p.map(m => { if (m.id !== messageId) return m; const bundle = { ...m.bundle }; bundle[channelId] = { ...bundle[channelId], textVariants: result.variants, selectedTextIdx: 0 }; return { ...m, bundle }; }));
      addToast(`Regenerated ${CHANNELS.find(c => c.id === channelId)?.label || channelId}`, "success");
    } catch (error) { addToast(`Regen failed: ${error.message}`, "error"); }
    finally { setIsGenerating(false); setGenerationPhase(null); }
  };

  const generateAllImages = async (messageId, channelId) => {
    const msg = currentMessages.find(m => m.id === messageId);
    if (!msg?.bundle?.[channelId]) return;
    const allSlots = msg.bundle[channelId].visualSlots || [];
    if (allSlots.length === 0) return;
    const textContent = msg.bundle[channelId].textVariants?.[msg.bundle[channelId].selectedTextIdx]?.text || "";
    const userMsg = currentMessages.slice(0, currentMessages.indexOf(msg)).reverse().find(m => m.role === "user");
    const userTopic = userMsg?.preparedInput || userMsg?.content || "";
    const contentSummary = [
      userTopic ? `Topic/Input: ${userTopic}` : "",
      textContent ? `Generated content:\n${textContent.slice(0, 1500)}` : "",
    ].filter(Boolean).join("\n\n");
    const jobs = [];
    for (let si = 0; si < allSlots.length; si++) {
      const s = allSlots[si];
      for (const idx of getVisualSelectedIndices(s)) {
        if (s.variants?.[idx]?.url) continue;
        jobs.push({ si, vi: idx, slotData: s });
      }
    }
    const totalPlanned = jobs.length;
    setIsGenerating(true); setGenerationPhase("images");
    if (totalPlanned === 0) {
      const anySelected = allSlots.some((s) => getVisualSelectedIndices(s).length > 0);
      addToast(
        anySelected
          ? "Selected visuals already have images"
          : "Select a thumbnail (v1, v2…) in each slot you want to generate",
        anySelected ? "info" : "warning",
      );
      setIsGenerating(false); setGenerationPhase(null);
      return;
    }
    addToast(`Generating ${totalPlanned} selected image${totalPlanned !== 1 ? "s" : ""}...`, "info");
    let successCount = 0;
    let firstGeneratedUrl = null;

    let extractedForImages = extractGeneratedContentFromSummary(contentSummary);
    try {
      const structured = await generateDesignerStructure({
        rawContent: contentSummary,
        themeId: designerThemeId,
        postSizeId: designerPostSizeId,
        designerWhiteBg,
        brand: activeBrand || null,
        apiKeys,
      });
      if (structured?.heading || structured?.subheading || structured?.footer) {
        extractedForImages = {
          heading: structured.heading,
          subheading: structured.subheading,
          footer: structured.footer,
        };
      }
    } catch (e) {
      console.warn("Designer structure step failed, using markdown extract fallback", e);
    }

    for (const { si, vi, slotData } of jobs) {
      try {
        const result = await generateImage({
          channel: channelId,
          slot: slotData.slot,
          brand: activeBrand,
          contentSummary,
          provider: "openai",
          numVariants: 1,
          apiKeys,
          designerOptions: {
            postSizeId: designerPostSizeId,
            designerWhiteBg,
            designerThemeId,
            designerHideLogo,
            extractedContent: extractedForImages,
            designerImage: true,
            omitContentTextInImage: true,
            openaiImageModel: studioImageModel,
          },
        });
        if (result.images?.[0]?.url) {
          if (!firstGeneratedUrl) firstGeneratedUrl = result.images[0].url;
          setCurrentMessages((p) =>
            p.map((m) => {
              if (m.id !== messageId) return m;
              const bundle = { ...m.bundle };
              const chData = { ...bundle[channelId] };
              const slots = [...chData.visualSlots];
              const slot = { ...slots[si] };
              const variants = [...slot.variants];
              variants[vi] = {
                ...variants[vi],
                url: result.images[0].url,
                revisedPrompt: result.images[0].revisedPrompt,
                designerContent: extractedForImages,
              };
              slot.variants = variants;
              slots[si] = slot;
              chData.visualSlots = slots;
              bundle[channelId] = chData;
              return { ...m, bundle };
            }),
          );
          successCount++;
        }
      } catch (error) {
        addToast(`Failed: ${slotData.slot} v${vi + 1} — ${error.message}`, "error");
      }
    }
    setIsGenerating(false); setGenerationPhase(null);
    if (successCount > 0) {
      addToast(`Generated ${successCount}/${totalPlanned} selected image${totalPlanned !== 1 ? "s" : ""}`, "success");
      setCurrentMessages(latest => {
        const updatedMsg = latest.find(m => m.id === messageId);
        if (updatedMsg?.bundle?.[channelId]) {
          const chData = updatedMsg.bundle[channelId];
          setPreviewData({ channel: channelId, text: chData.textVariants?.[chData.selectedTextIdx]?.text, visualSlots: chData.visualSlots });
        }
        return latest;
      });
      if (firstGeneratedUrl) {
        setCurrentMessages((latest) => {
          const updatedMsg = latest.find((m) => m.id === messageId);
          const slots = updatedMsg?.bundle?.[channelId]?.visualSlots || [];
          const { options, activeIndex } = buildDesignerVisualPickerOptions(slots, firstGeneratedUrl);
          const list =
            options.length > 0
              ? options
              : [{ url: firstGeneratedUrl, designerContent: extractedForImages, label: "Visual" }];
          const idx = options.length > 0 ? activeIndex : 0;
          const cur = list[idx];
          primeDesignerEmbed(cur.url, cur.designerContent ?? extractedForImages, {
            postSizeId: designerPostSizeId,
            designerWhiteBg,
            themeId: designerThemeId,
          }, activeBrand || null);
          setDesignerOverlay({
            open: true,
            embedKey: Date.now(),
            visualOptions: list,
            activeVisualIndex: idx,
          });
          return latest;
        });
      }
    }
  };

  const getCurrentBundle = () => { const last = [...currentMessages].reverse().find(m => m.role === "assistant"); return last?.bundle || {}; };

  const handlePreviewTextEdit = (newText) => {
    const lastAi = [...currentMessages].reverse().find(m => m.role === "assistant");
    if (!lastAi?.bundle) return;
    const ch = activeChannel;
    if (!lastAi.bundle[ch]) return;
    setCurrentMessages(p => p.map(m => {
      if (m.id !== lastAi.id) return m;
      const bundle = { ...m.bundle };
      const chData = { ...bundle[ch] };
      const variants = [...chData.textVariants];
      variants[chData.selectedTextIdx] = { ...variants[chData.selectedTextIdx], text: newText };
      chData.textVariants = variants;
      bundle[ch] = chData;
      return { ...m, bundle };
    }));
  };

  return (<div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0C0D14", color: "#E2E4EA", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
    {/* Top Bar */}
    <div style={{ height: 56, minHeight: 56, display: "flex", alignItems: "center", padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", gap: 12, zIndex: 50 }}>
      <button onClick={() => setLeftCollapsed(!leftCollapsed)} style={{ width: 32, height: 32, borderRadius: 7, border: "none", background: "rgba(255,255,255,0.04)", color: "#8B8DA3", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>☰</button>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg,#6C2BD9,#14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white" }}>C</div><span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.3px" }}>ContentEngine</span></div>
      <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
      <input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} style={{ background: "transparent", border: "none", color: "#8B8DA3", fontSize: 14, fontWeight: 500, fontFamily: "inherit", outline: "none", padding: "4px 8px", borderRadius: 6, maxWidth: 200 }} onFocus={e => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.color = "#E2E4EA"; }} onBlur={e => { e.target.style.background = "transparent"; e.target.style.color = "#8B8DA3"; }} />
      <div style={{ flex: 1 }} />
      <div style={{ position: "relative" }}>
        <button
          type="button"
          ref={modelsBtnRef}
          onClick={() => setModelsMenuOpen((o) => !o)}
          title="Choose models for content, images, and video APIs"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 2,
            padding: "5px 12px",
            borderRadius: 9,
            border: "1px solid rgba(255,255,255,0.08)",
            background: modelsMenuOpen ? "rgba(108,43,217,0.12)" : "rgba(255,255,255,0.03)",
            cursor: "pointer",
            fontFamily: "inherit",
            maxWidth: 220,
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#A0A3B1", textTransform: "uppercase", letterSpacing: "0.04em" }}>Models</span>
          <span style={{ fontSize: 10, color: "#6B7084", lineHeight: 1.3, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
            {studioModelShort(STUDIO_TEXT_MODEL_OPTIONS, studioTextModel)} · {studioModelShort(STUDIO_IMAGE_MODEL_OPTIONS, studioImageModel)} · {studioModelShort(STUDIO_VIDEO_MODEL_OPTIONS, studioVideoModel)}
          </span>
        </button>
        {modelsMenuOpen && (
          <div
            ref={modelsMenuRef}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              top: "110%",
              right: 0,
              zIndex: 200,
              background: "#1A1B23",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "12px 14px",
              minWidth: 280,
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "#52556B", textTransform: "uppercase", marginBottom: 14, letterSpacing: "0.5px" }}>Generation models</div>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ display: "block", fontSize: 11, color: "#8B8DA3", marginBottom: 6 }}>Content (Claude)</span>
              <select value={studioTextModel} onChange={(e) => setStudioTextModel(normalizeStudioTextModel(e.target.value))} style={STUDIO_MODEL_SELECT_STYLE}>
                {STUDIO_TEXT_MODEL_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", marginBottom: 12 }}>
              <span style={{ display: "block", fontSize: 11, color: "#8B8DA3", marginBottom: 6 }}>Image (OpenAI)</span>
              <select value={studioImageModel} onChange={(e) => setStudioImageModel(normalizeStudioImageModel(e.target.value))} style={STUDIO_MODEL_SELECT_STYLE}>
                {STUDIO_IMAGE_MODEL_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "block", marginBottom: 4 }}>
              <span style={{ display: "block", fontSize: 11, color: "#8B8DA3", marginBottom: 6 }}>Video (Kling)</span>
              <select value={studioVideoModel} onChange={(e) => setStudioVideoModel(normalizeStudioVideoModel(e.target.value))} style={STUDIO_MODEL_SELECT_STYLE}>
                {STUDIO_VIDEO_MODEL_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </label>
            <p style={{ margin: "10px 0 0", fontSize: 10, color: "#52556B", lineHeight: 1.45 }}>
              Video model is sent with POST /api/generate/video when you call video generation from the app.
            </p>
          </div>
        )}
      </div>
      <div style={{ position: "relative" }}><button type="button" ref={brandBtnRef} onClick={() => setBrandDrop(!brandDrop)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", cursor: "pointer", fontFamily: "inherit" }}><div style={{ width: 22, height: 22, borderRadius: 5, background: activeBrand ? brandGradientCss(activeBrand) : "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white" }}>{brandInitial(activeBrand)}</div><span style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA" }}>{activeBrand?.name || "Brand"}</span><span style={{ fontSize: 10, color: "#6B7084" }}>▾</span></button>
        {brandDrop && (<div ref={brandMenuRef} style={{ position: "absolute", top: "110%", right: 0, zIndex: 200, background: "#1A1B23", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 6, minWidth: 240, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>{brands.map(brand => (<button key={brand.id} type="button" onClick={() => { setActiveBrandId(brand.id); setBrandDrop(false); }} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", background: activeBrandId === brand.id ? "rgba(108,43,217,0.15)" : "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }} onMouseEnter={e => { if (activeBrandId !== brand.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }} onMouseLeave={e => { if (activeBrandId !== brand.id) e.currentTarget.style.background = "transparent"; }}><div style={{ width: 28, height: 28, borderRadius: 6, background: brandGradientCss(brand), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white" }}>{brandInitial(brand)}</div><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA" }}>{brand.name}</div><div style={{ fontSize: 11, color: "#6B7084" }}>{brand.tagline}</div></div>{activeBrandId === brand.id && <span style={{ color: "#6C2BD9" }}>✓</span>}</button>))}<div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0", padding: "4px 0 0" }}><button type="button" onClick={() => { setBrandDrop(false); openBrandEditor(null); }} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "#6B7084", fontSize: 12, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.color = "#C4B5FD"} onMouseLeave={e => e.currentTarget.style.color = "#6B7084"}>+ New Brand</button></div></div>)}
      </div>
      <button type="button" onClick={() => setShowApiKeys(true)} title="AI Provider Settings" aria-label="AI Provider Settings" style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#8B8DA3", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, position: "relative" }}><StudioLucide name="Settings" size={18} color="#8B8DA3" />{(Object.values(apiKeys).filter(Boolean).length > 0 || Object.values(serverStatus).filter(Boolean).length > 0) && <div style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: "50%", background: "#34D399", border: "2px solid #0C0D14" }} />}</button>
      <button type="button" onClick={() => setShowExport(true)} disabled={isGenerating} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 9, border: "none", cursor: isGenerating ? "default" : "pointer", fontFamily: "inherit", background: "linear-gradient(135deg,#6C2BD9,#5B21B6)", color: "white", fontSize: 13, fontWeight: 600, opacity: isGenerating ? 0.5 : 1 }}><StudioLucide name="Download" size={16} color="white" /> Export</button>
      <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />
      <button onClick={() => setRightCollapsed(!rightCollapsed)} style={{ width: 32, height: 32, borderRadius: 7, border: "none", background: rightCollapsed ? "rgba(108,43,217,0.15)" : "rgba(255,255,255,0.04)", color: rightCollapsed ? "#C4B5FD" : "#8B8DA3", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>◧</button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}><div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#6C2BD9,#14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white" }}>{(user?.name || user?.email || "?")[0].toUpperCase()}</div><button onClick={onLogout} style={{ background: "none", border: "none", color: "#52556B", cursor: "pointer", fontSize: 14, padding: 4 }}>⏻</button></div>
    </div>

    {/* Panels */}
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <LeftPanel activeTab={leftTab} setActiveTab={setLeftTab} collapsed={leftCollapsed} brands={brands} activeBrandId={activeBrandId} onOpenBrandEditor={openBrandEditor} onSelectBrand={setActiveBrandId} projects={projects} onSelectProject={selectProject} activeProjectId={activeProjectId} onNewProject={newProject} onSelectTemplate={selectTemplate} selectedTemplateId={selectedTemplateId} width={leftWidth} />
      {!leftCollapsed && <PanelDivider onDrag={(dx) => setLeftWidth(w => Math.max(200, Math.min(500, w + dx)))} />}
      <CenterPanel activeChannels={activeChannels} setActiveChannels={setActiveChannels} setActiveChannel={setActiveChannel} linkedinIncludeCarousel={linkedinIncludeCarousel} setLinkedinIncludeCarousel={setLinkedinIncludeCarousel} activeBrand={activeBrand} apiKeys={apiKeys} serverStatus={serverStatus} onSelectPreview={setPreviewData} messages={currentMessages} setMessages={setCurrentMessages} projectTitle={projectTitle} selectedTemplateId={selectedTemplateId} setSelectedTemplateId={setSelectedTemplateId} inputMode={inputMode} setInputMode={setInputMode} tone={tone} setTone={setTone} isGenerating={isGenerating} setIsGenerating={setIsGenerating} generationPhase={generationPhase} setGenerationPhase={setGenerationPhase} addToast={addToast} onRegenerate={regenerateChannel} onGenerateImage={generateAllImages} onOpenDesigner={openDesignerWithImage} designerPostSizeId={designerPostSizeId} setDesignerPostSizeId={setDesignerPostSizeId} designerWhiteBg={designerWhiteBg} setDesignerWhiteBg={setDesignerWhiteBg} designerThemeId={designerThemeId} setDesignerThemeId={setDesignerThemeId} designerHideLogo={designerHideLogo} studioTextModel={studioTextModel} />
      {!rightCollapsed && <PanelDivider onDrag={(dx) => setRightWidth(w => Math.max(280, Math.min(600, w - dx)))} />}
      <RightPanel activeChannels={activeChannels} setActiveChannels={setActiveChannels} activeChannel={activeChannel} setActiveChannel={setActiveChannel} collapsed={rightCollapsed} previewData={previewData} addToast={addToast} activeBrand={activeBrand} onTextEdit={handlePreviewTextEdit} onOpenDesigner={openDesignerWithImage} designerPostSizeId={designerPostSizeId} designerWhiteBg={designerWhiteBg} designerHideLogo={designerHideLogo} width={rightWidth} apiKeys={apiKeys} tone={tone} selectedTemplateId={selectedTemplateId} studioTextModel={studioTextModel} />
    </div>

    <ApiKeysModal open={showApiKeys} onClose={() => setShowApiKeys(false)} apiKeys={apiKeys} setApiKeys={setApiKeys} serverStatus={serverStatus} addToast={addToast} />
    <BrandEditor open={brandEditorOpen} onClose={() => { setBrandEditorOpen(false); setEditingBrand(null); }} onSave={handleSaveBrand} editBrand={editingBrand} />
    <ExportModal open={showExport} onClose={() => setShowExport(false)} activeChannels={activeChannels} currentBundle={getCurrentBundle()} addToast={addToast} activeBrand={activeBrand} />
    <ToastContainer toasts={toasts} />
    <DesignerOverlay
      open={designerOverlay.open}
      embedKey={designerOverlay.embedKey}
      onClose={closeDesignerOverlay}
      onEmbedSettings={handleDesignerEmbedSettings}
      visualOptions={designerOverlay.visualOptions}
      activeVisualIndex={designerOverlay.activeVisualIndex}
      onActiveVisualIndexChange={setDesignerOverlayVisualIndex}
    />
  </div>);
}
