"use client";
import { useState, useEffect, useRef } from "react";
import { CHANNELS, TEMPLATES, TONES, INPUT_MODES, AI_MODELS } from "@/config/constants";
import { generateContentBundle, generateText, generateImage, parseUrl, checkProviderStatus } from "@/lib/ai/orchestrator";
import { saveBrand, loadBrands, saveProject, loadProjects, loadProjectMessages } from "@/lib/db/index";
import { buildLandingPageHtml } from "@/lib/templates/landing-template";

function landingExportOptions() {
  if (typeof window === "undefined") return {};
  return { assetBaseUrl: window.location.origin };
}

// ─── Shared Data ────────────────────────────────────────────────────────
const GOOGLE_FONTS = ["DM Sans","Plus Jakarta Sans","Outfit","Manrope","Sora","Poppins","Nunito Sans","Lato","Raleway","Montserrat","Playfair Display","Crimson Pro","Merriweather","Source Serif 4","Space Grotesk","JetBrains Mono","IBM Plex Sans","Work Sans","Libre Franklin","Fira Code"];
const defaultBrands = [
  { id: "brand-1", name: "Enkrypt AI", company_name: "Enkrypt AI", tagline: "Secure AI, Everywhere", elevator_pitch: "The world's most comprehensive AI security platform.", colors: { primary: "#6C2BD9", secondary: "#14B8A6", accent: "#F59E0B", background: "#0C0D14", surface: "#1A1B23", text_heading: "#F1F1F4", text_body: "#C4C6D0" }, gradients: [{ name: "Hero", type: "linear", angle: 135, stops: [{ color: "#6C2BD9", position: 0 }, { color: "#14B8A6", position: 100 }] }], typography: { heading_font: "DM Sans", body_font: "DM Sans" }, layout: { max_width: "1200px", border_radius_sm: "6px", border_radius_md: "12px", border_radius_lg: "20px", nav_style: "sticky" }, tone: { descriptors: ["Authoritative","Technical","Approachable"], cta_style: "Action-oriented", words_to_use: ["secure","protect","trust"], words_to_avoid: ["cheap","basic"] }, audience: { persona_name: "CISO / AI Platform Lead", industry: "Enterprise Technology", language_register: "technical" }, visual_style: { image_style: "minimal", icon_style: "outlined" }, logos: { primary: null, dark: null, description: "Purple shield icon with gradient glow, representing AI security" }, sample_backgrounds: [], sample_templates: [], logo_placement: "top-left" },
  { id: "brand-2", name: "KOAN News", company_name: "KOAN", tagline: "AI News, Distilled", elevator_pitch: "Daily AI intelligence digest.", colors: { primary: "#DC2626", secondary: "#1E293B", accent: "#FBBF24", background: "#0F0F0F", surface: "#1C1C1C", text_heading: "#FFFFFF", text_body: "#B0B0B0" }, gradients: [], typography: { heading_font: "Space Grotesk", body_font: "DM Sans" }, layout: { max_width: "960px", border_radius_sm: "4px", border_radius_md: "8px", border_radius_lg: "16px", nav_style: "solid" }, tone: { descriptors: ["Sharp","Concise","Insightful"], cta_style: "Direct", words_to_use: [], words_to_avoid: [] }, audience: { persona_name: "AI Practitioner", industry: "Technology", language_register: "business" }, visual_style: { image_style: "photographic", icon_style: "filled" }, logos: { primary: null, dark: null, description: "Red bold sans-serif KOAN wordmark on dark background" }, sample_backgrounds: [], sample_templates: [], logo_placement: "top-left" },
];
const fieldStyle = { padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#E2E4EA", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%", boxSizing: "border-box" };

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
    {toasts.map(t => (<div key={t.id} style={{ padding: "12px 20px", borderRadius: 10, pointerEvents: "auto", background: t.type === "error" ? "rgba(239,68,68,0.15)" : t.type === "success" ? "rgba(52,211,153,0.15)" : t.type === "warning" ? "rgba(245,158,11,0.15)" : "rgba(108,43,217,0.15)", border: `1px solid ${t.type === "error" ? "rgba(239,68,68,0.3)" : t.type === "success" ? "rgba(52,211,153,0.3)" : t.type === "warning" ? "rgba(245,158,11,0.3)" : "rgba(108,43,217,0.3)"}`, color: t.type === "error" ? "#FCA5A5" : t.type === "success" ? "#6EE7B7" : t.type === "warning" ? "#FBBF24" : "#C4B5FD", fontSize: 13, fontFamily: "'DM Sans', sans-serif", backdropFilter: "blur(12px)", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
      {t.type === "success" ? "✓ " : t.type === "error" ? "✕ " : t.type === "warning" ? "⚠ " : ""}{t.message}
    </div>))}
  </div>);
}

// ─── Image Lightbox ─────────────────────────────────────────────────────
function Lightbox({ url, alt, onClose }) {
  useEffect(() => {
    if (!url) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [url, onClose]);
  if (!url) return null;
  return (<div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: 40 }}>
    <img src={url} alt={alt || "Preview"} style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, boxShadow: "0 24px 80px rgba(0,0,0,0.6)", objectFit: "contain" }} onClick={e => e.stopPropagation()} />
    <button onClick={onClose} style={{ position: "absolute", top: 20, right: 24, width: 40, height: 40, borderRadius: 10, border: "none", background: "rgba(255,255,255,0.1)", color: "white", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }}>✕</button>
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
  const save = () => { setApiKeys(local); try { localStorage.setItem("ce_api_keys", JSON.stringify(local)); } catch {} addToast("API keys saved", "success"); onClose(); };
  return (<div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', sans-serif" }}><div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }} onClick={onClose} /><div style={{ position: "relative", width: 560, maxHeight: "90vh", overflowY: "auto", background: "#14151E", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 20, boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
    <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#F1F1F4" }}>AI Provider Settings</h2><p style={{ margin: "6px 0 0", fontSize: 13, color: "#6B7084" }}>Keys are stored locally and sent to provider APIs via server routes</p></div><button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#8B8DA3", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div>
    <div style={{ padding: "24px 32px" }}>{AI_MODELS.map(m => { const hasC = !!local[m.keyField]; const hasS = !!serverStatus[m.id]; return (<div key={m.id} style={{ marginBottom: 20, padding: 18, borderRadius: 14, background: "rgba(255,255,255,0.02)", border: `1px solid ${(hasC || hasS) ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.06)"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><div style={{ width: 36, height: 36, borderRadius: 9, background: m.color + "20", display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: m.color }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: "#E2E4EA" }}>{m.name}</div><div style={{ fontSize: 12, color: "#6B7084" }}>{m.provider} · {m.type}</div></div>
        {hasS && <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "rgba(20,184,166,0.12)", color: "#14B8A6", textTransform: "uppercase" }}>Server ✓</span>}
        {hasC && <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: "rgba(52,211,153,0.12)", color: "#34D399", textTransform: "uppercase" }}>Client ✓</span>}
      </div>
      <div style={{ position: "relative" }}><input type={showKey[m.id] ? "text" : "password"} value={local[m.keyField] || ""} onChange={e => setLocal(p => ({ ...p, [m.keyField]: e.target.value }))} placeholder={hasS ? "Server key set — add client override (optional)" : `${m.provider} API key...`} style={{ ...fieldStyle, paddingRight: 80, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }} /><button onClick={() => setShowKey(p => ({ ...p, [m.id]: !p[m.id] }))} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: "4px 10px", borderRadius: 6, border: "none", background: "rgba(255,255,255,0.06)", color: "#8B8DA3", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{showKey[m.id] ? "Hide" : "Show"}</button></div>
    </div>); })}</div>
    <div style={{ padding: "16px 32px 24px", display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid rgba(255,255,255,0.06)" }}><button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#8B8DA3", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button><button onClick={save} style={{ padding: "10px 24px", borderRadius: 9, border: "none", background: "linear-gradient(135deg,#6C2BD9,#5B21B6)", color: "white", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save Keys</button></div>
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
  const formats = { linkedin: [{ label: "Copy Text", icon: "📋", act: "copy" }, { label: "Download Markdown", icon: "📝", act: "md" }], twitter: [{ label: "Copy Tweet", icon: "📋", act: "copy" }], blog: [{ label: "Download Markdown", icon: "📝", act: "md" }, { label: "Download HTML", icon: "🌐", act: "html" }, { label: "Copy Text", icon: "📋", act: "copy" }], article: [{ label: "Download Markdown", icon: "📝", act: "md" }, { label: "Download HTML", icon: "🌐", act: "html" }, { label: "Copy Text", icon: "📋", act: "copy" }], landing: [{ label: "Download Animated HTML", icon: "🌐", act: "html" }, { label: "Open Preview in Browser", icon: "🚀", act: "preview" }, { label: "Copy Source", icon: "📋", act: "copy" }] };
  const doExport = (chId, act) => {
    const d = currentBundle?.[chId]; if (!d?.textVariants?.length) { addToast("No content to export", "warning"); return; }
    const text = d.textVariants[d.selectedTextIdx]?.text || ""; const ch = CHANNELS.find(c => c.id === chId);
    if (act === "copy") clipCopy(text).then(ok => addToast(ok ? "Copied!" : "Copy failed", ok ? "success" : "error"));
    else if (act === "md") { downloadFile(text, `${ch?.label || chId}.md`, "text/markdown"); addToast("Downloaded Markdown", "success"); }
    else if (act === "preview" && chId === "landing") {
      const html = buildLandingPageHtml(text, activeBrand, landingExportOptions());
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      addToast("Opened landing page preview", "success");
    }
    else if (act === "html") {
      if (chId === "landing") {
        const html = buildLandingPageHtml(text, activeBrand, landingExportOptions());
        downloadFile(html, `${activeBrand?.company_name || "Landing-Page"}.html`, "text/html"); addToast("Downloaded animated landing page", "success");
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
    <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#F1F1F4" }}>Export Content</h2><p style={{ margin: "6px 0 0", fontSize: 13, color: "#6B7084" }}>Download or copy your generated content</p></div><button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#8B8DA3", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div>
    <div style={{ padding: "20px 32px 28px" }}>{activeChannels.map(chId => { const ch = CHANNELS.find(c => c.id === chId); const fmts = formats[chId] || []; const has = !!currentBundle?.[chId]?.textVariants?.length; return (<div key={chId} style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}><span style={{ width: 20, height: 20, borderRadius: 5, fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", background: ch.color, color: "white" }}>{ch.icon}</span><span style={{ fontSize: 14, fontWeight: 600, color: "#E2E4EA" }}>{ch.label}</span>{!has && <span style={{ fontSize: 11, color: "#52556B", fontStyle: "italic" }}>No content yet</span>}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{fmts.map(f => (<button key={f.label} onClick={() => doExport(chId, f.act)} disabled={!has} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", cursor: has ? "pointer" : "default", fontFamily: "inherit", textAlign: "left", width: "100%", opacity: has ? 1 : 0.4, transition: "all 0.15s" }} onMouseEnter={e => { if (has) { e.currentTarget.style.background = "rgba(255,255,255,0.05)"; e.currentTarget.style.borderColor = "rgba(108,43,217,0.3)"; } }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}><span style={{ fontSize: 18 }}>{f.icon}</span><div style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA" }}>{f.label}</div><span style={{ marginLeft: "auto", fontSize: 11, color: "#6B7084" }}>→</span></button>))}</div>
    </div>); })}</div>
  </div></div>);
}

// ─── Brand Editor ───────────────────────────────────────────────────────
function BrandEditor({ open, onClose, onSave, editBrand }) {
  const empty = { id: "", name: "", company_name: "", tagline: "", elevator_pitch: "", colors: { primary: "#6C2BD9", secondary: "#14B8A6", accent: "#F59E0B", background: "#0C0D14", surface: "#1A1B23", text_heading: "#F1F1F4", text_body: "#C4C6D0" }, gradients: [], typography: { heading_font: "DM Sans", body_font: "DM Sans" }, layout: { max_width: "1200px", border_radius_sm: "6px", border_radius_md: "12px", border_radius_lg: "20px", nav_style: "sticky" }, tone: { descriptors: [], cta_style: "", words_to_use: [], words_to_avoid: [] }, audience: { persona_name: "", industry: "", language_register: "business" }, visual_style: { image_style: "minimal", icon_style: "outlined" }, logos: { primary: null, dark: null, description: "" }, sample_backgrounds: [], sample_templates: [], logo_placement: "top-left" };
  const [b, setB] = useState(empty); const [sec, setSec] = useState("basics"); const [tagInput, setTagInput] = useState({ tone: "", use: "", avoid: "" });
  useEffect(() => { if (open) { if (editBrand) { const m = JSON.parse(JSON.stringify(empty)); Object.keys(editBrand).forEach(k => { if (typeof editBrand[k] === "object" && editBrand[k] !== null && !Array.isArray(editBrand[k])) { m[k] = { ...m[k], ...editBrand[k] }; } else { m[k] = editBrand[k]; } }); setB(m); } else { setB(JSON.parse(JSON.stringify(empty))); } setSec("basics"); } }, [open]);
  if (!open) return null;
  const set = (path, val) => { setB(prev => { const n = JSON.parse(JSON.stringify(prev)); const p = path.split("."); let o = n; for (let i = 0; i < p.length - 1; i++) o = o[p[i]]; o[p[p.length - 1]] = val; return n; }); };
  const save = () => { if (!b.name || !b.company_name) return; onSave({ ...b, id: b.id || "brand-" + Date.now() }); onClose(); };
  const sections = [{ id: "basics", label: "Basics", icon: "✦" }, { id: "colors", label: "Colors", icon: "🎨" }, { id: "typography", label: "Type", icon: "Aa" }, { id: "tone", label: "Tone", icon: "🎭" }, { id: "audience", label: "Audience", icon: "👥" }, { id: "visual", label: "Visual", icon: "🖼" }, { id: "assets", label: "Assets", icon: "📎" }];
  const CInput = ({ label, value, onChange }) => (<div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}><div style={{ position: "relative", width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", overflow: "hidden", flexShrink: 0 }}><input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ position: "absolute", inset: -8, width: 52, height: 52, cursor: "pointer", border: "none" }} /></div><div style={{ flex: 1 }}><div style={{ fontSize: 11, color: "#6B7084", marginBottom: 2 }}>{label}</div><input value={value} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, padding: "6px 10px", fontSize: 12, fontFamily: "'JetBrains Mono',monospace" }} /></div></div>);
  const Tags = ({ items, onAdd, onRemove, placeholder, stateKey }) => (<div><div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: items.length ? 8 : 0 }}>{items.map((t, i) => (<span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "rgba(108,43,217,0.12)", color: "#C4B5FD" }}>{t}<span onClick={() => onRemove(i)} style={{ cursor: "pointer", opacity: 0.6, fontSize: 14 }}>×</span></span>))}</div><div style={{ display: "flex", gap: 6 }}><input value={tagInput[stateKey]} onChange={e => setTagInput(p => ({ ...p, [stateKey]: e.target.value }))} placeholder={placeholder} onKeyDown={e => { if (e.key === "Enter" && tagInput[stateKey].trim()) { onAdd(tagInput[stateKey].trim()); setTagInput(p => ({ ...p, [stateKey]: "" })); } }} style={{ ...fieldStyle, padding: "8px 12px", fontSize: 13, flex: 1 }} /><button onClick={() => { if (tagInput[stateKey].trim()) { onAdd(tagInput[stateKey].trim()); setTagInput(p => ({ ...p, [stateKey]: "" })); } }} style={{ padding: "8px 14px", borderRadius: 10, border: "none", background: "rgba(108,43,217,0.15)", color: "#C4B5FD", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Add</button></div></div>);
  const lbl = { fontSize: 12, fontWeight: 600, color: "#8B8DA3", marginBottom: 6, display: "block" }; const secT = { fontSize: 11, fontWeight: 700, color: "#52556B", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 12, marginTop: 24 };
  return (<div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end", fontFamily: "'DM Sans', sans-serif" }}><div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }} onClick={onClose} /><div style={{ position: "relative", width: 640, height: "100%", background: "#11121A", borderLeft: "1px solid rgba(255,255,255,0.08)", display: "flex", flexDirection: "column", boxShadow: "-20px 0 60px rgba(0,0,0,0.4)" }}>
    <div style={{ padding: "24px 28px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}><div><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#F1F1F4" }}>{editBrand ? "Edit Brand" : "New Brand"}</h2></div><button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)", color: "#8B8DA3", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button></div>
    <div style={{ display: "flex", gap: 2, padding: "10px 20px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto", flexShrink: 0 }}>{sections.map(s => (<button key={s.id} onClick={() => setSec(s.id)} style={{ padding: "8px 12px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5, background: "transparent", color: sec === s.id ? "#E2E4EA" : "#6B7084", borderBottom: sec === s.id ? "2px solid #6C2BD9" : "2px solid transparent", borderRadius: 0 }}><span style={{ fontSize: 13 }}>{s.icon}</span> {s.label}</button>))}</div>
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
      {sec === "basics" && <div><label style={lbl}>Brand Name *</label><input value={b.name} onChange={e => set("name", e.target.value)} placeholder="e.g. Enkrypt AI" style={{ ...fieldStyle, marginBottom: 16 }} /><label style={lbl}>Company *</label><input value={b.company_name} onChange={e => set("company_name", e.target.value)} placeholder="Company" style={{ ...fieldStyle, marginBottom: 16 }} /><label style={lbl}>Tagline</label><input value={b.tagline} onChange={e => set("tagline", e.target.value)} placeholder="Tagline" style={{ ...fieldStyle, marginBottom: 16 }} /><label style={lbl}>Elevator Pitch</label><textarea value={b.elevator_pitch} onChange={e => set("elevator_pitch", e.target.value)} placeholder="1-2 sentences..." rows={3} style={{ ...fieldStyle, resize: "vertical" }} /></div>}
      {sec === "colors" && <div><div style={secT}>Brand Colors</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}><CInput label="Primary" value={b.colors.primary} onChange={v => set("colors.primary", v)} /><CInput label="Secondary" value={b.colors.secondary} onChange={v => set("colors.secondary", v)} /><CInput label="Accent" value={b.colors.accent} onChange={v => set("colors.accent", v)} /><CInput label="Background" value={b.colors.background} onChange={v => set("colors.background", v)} /><CInput label="Surface" value={b.colors.surface} onChange={v => set("colors.surface", v)} /><CInput label="Heading" value={b.colors.text_heading} onChange={v => set("colors.text_heading", v)} /><CInput label="Body" value={b.colors.text_body} onChange={v => set("colors.text_body", v)} /></div><div style={secT}>Preview</div><div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}><div style={{ padding: 24, background: b.colors.background }}><div style={{ height: 8, width: "60%", borderRadius: 4, background: `linear-gradient(90deg,${b.colors.primary},${b.colors.secondary})`, marginBottom: 16 }} /><div style={{ fontSize: 18, fontWeight: 700, color: b.colors.text_heading, marginBottom: 6 }}>Heading</div><div style={{ fontSize: 13, color: b.colors.text_body, marginBottom: 16, lineHeight: 1.6 }}>Body text preview.</div><div style={{ display: "flex", gap: 8 }}><div style={{ padding: "8px 18px", borderRadius: 8, background: b.colors.primary, color: "white", fontSize: 13, fontWeight: 600 }}>CTA</div></div></div></div></div>}
      {sec === "typography" && <div><div style={secT}>Fonts</div><label style={lbl}>Heading</label><select value={b.typography.heading_font} onChange={e => set("typography.heading_font", e.target.value)} style={{ ...fieldStyle, marginBottom: 16, cursor: "pointer" }}>{GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ background: "#1A1B23", color: "#E2E4EA" }}>{f}</option>)}</select><label style={lbl}>Body</label><select value={b.typography.body_font} onChange={e => set("typography.body_font", e.target.value)} style={{ ...fieldStyle, cursor: "pointer" }}>{GOOGLE_FONTS.map(f => <option key={f} value={f} style={{ background: "#1A1B23", color: "#E2E4EA" }}>{f}</option>)}</select></div>}
      {sec === "tone" && <div><div style={secT}>Descriptors</div><Tags items={b.tone.descriptors} onAdd={t => set("tone.descriptors", [...b.tone.descriptors, t])} onRemove={i => set("tone.descriptors", b.tone.descriptors.filter((_, j) => j !== i))} placeholder="e.g. Authoritative..." stateKey="tone" /><div style={{ ...secT, marginTop: 28 }}>CTA Style</div><input value={b.tone.cta_style} onChange={e => set("tone.cta_style", e.target.value)} placeholder="Action-oriented" style={fieldStyle} /><div style={{ ...secT, marginTop: 28 }}>Use</div><Tags items={b.tone.words_to_use || []} onAdd={t => set("tone.words_to_use", [...(b.tone.words_to_use || []), t])} onRemove={i => set("tone.words_to_use", (b.tone.words_to_use || []).filter((_, j) => j !== i))} placeholder="Preferred..." stateKey="use" /><div style={{ ...secT, marginTop: 28 }}>Avoid</div><Tags items={b.tone.words_to_avoid || []} onAdd={t => set("tone.words_to_avoid", [...(b.tone.words_to_avoid || []), t])} onRemove={i => set("tone.words_to_avoid", (b.tone.words_to_avoid || []).filter((_, j) => j !== i))} placeholder="Never use..." stateKey="avoid" /></div>}
      {sec === "audience" && <div><div style={secT}>Target Audience</div><label style={lbl}>Persona</label><input value={b.audience.persona_name} onChange={e => set("audience.persona_name", e.target.value)} placeholder="CISO, VP Eng" style={{ ...fieldStyle, marginBottom: 16 }} /><label style={lbl}>Industry</label><input value={b.audience.industry} onChange={e => set("audience.industry", e.target.value)} placeholder="Enterprise Tech" style={{ ...fieldStyle, marginBottom: 16 }} /><label style={lbl}>Register</label><div style={{ display: "flex", gap: 8 }}>{["technical", "business", "casual"].map(r => (<button key={r} onClick={() => set("audience.language_register", r)} style={{ flex: 1, padding: 10, borderRadius: 10, cursor: "pointer", fontFamily: "inherit", border: b.audience.language_register === r ? "1px solid rgba(108,43,217,0.4)" : "1px solid rgba(255,255,255,0.06)", background: b.audience.language_register === r ? "rgba(108,43,217,0.1)" : "rgba(255,255,255,0.02)", color: b.audience.language_register === r ? "#C4B5FD" : "#6B7084", fontSize: 13, fontWeight: 600, textTransform: "capitalize" }}>{r}</button>))}</div></div>}
      {sec === "visual" && <div><div style={secT}>Image Style</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>{[["photographic", "📷"], ["illustrated", "🎨"], ["abstract", "🌀"], ["minimal", "◻️"]].map(([s, e]) => (<button key={s} onClick={() => set("visual_style.image_style", s)} style={{ padding: 16, borderRadius: 12, cursor: "pointer", fontFamily: "inherit", textAlign: "center", border: b.visual_style.image_style === s ? "1px solid rgba(108,43,217,0.4)" : "1px solid rgba(255,255,255,0.06)", background: b.visual_style.image_style === s ? "rgba(108,43,217,0.1)" : "rgba(255,255,255,0.02)", color: b.visual_style.image_style === s ? "#C4B5FD" : "#6B7084", fontSize: 13, fontWeight: 600 }}><div style={{ fontSize: 24, marginBottom: 4 }}>{e}</div>{s}</button>))}</div></div>}
      {sec === "assets" && <div>
        <div style={secT}>Logo</div>
        <label style={lbl}>Primary Logo URL</label>
        <input value={b.logos.primary || ""} onChange={e => set("logos.primary", e.target.value || null)} placeholder="https://example.com/logo.png" style={{ ...fieldStyle, marginBottom: 12, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }} />
        <label style={lbl}>Dark Variant Logo URL</label>
        <input value={b.logos.dark || ""} onChange={e => set("logos.dark", e.target.value || null)} placeholder="https://example.com/logo-dark.png (optional)" style={{ ...fieldStyle, marginBottom: 12, fontSize: 13, fontFamily: "'JetBrains Mono',monospace" }} />
        <label style={lbl}>Logo Description (for AI image generation)</label>
        <textarea value={b.logos.description || ""} onChange={e => set("logos.description", e.target.value)} placeholder="Describe the logo so AI can reference it when generating visuals. E.g. 'Purple shield icon with gradient glow, clean sans-serif wordmark below'" rows={2} style={{ ...fieldStyle, resize: "vertical", marginBottom: 12 }} />
        {(b.logos.primary || b.logos.dark) && <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {b.logos.primary && <div style={{ padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", flex: 1, textAlign: "center" }}><img src={b.logos.primary} alt="Primary" style={{ maxHeight: 48, maxWidth: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} /><div style={{ fontSize: 10, color: "#52556B", marginTop: 6 }}>Primary</div></div>}
          {b.logos.dark && <div style={{ padding: 12, borderRadius: 10, background: b.colors.background, border: "1px solid rgba(255,255,255,0.06)", flex: 1, textAlign: "center" }}><img src={b.logos.dark} alt="Dark" style={{ maxHeight: 48, maxWidth: "100%", objectFit: "contain" }} onError={e => { e.target.style.display = "none"; }} /><div style={{ fontSize: 10, color: "#52556B", marginTop: 6 }}>Dark</div></div>}
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
function GenerationCard({ bundle, channels, onUpdateBundle, onCopy, onRegenerate, onGenerateImage, isGenerating }) {
  const [activeChTab, setActiveChTab] = useState(channels[0]);
  const chData = bundle[activeChTab]; if (!chData) return null;
  const ch = CHANNELS.find(c => c.id === activeChTab);
  const selectText = (idx) => { onUpdateBundle(prev => ({ ...prev, [activeChTab]: { ...prev[activeChTab], selectedTextIdx: idx } })); };
  const selectVisual = (si, vi) => { onUpdateBundle(prev => { const n = { ...prev }; const slots = [...n[activeChTab].visualSlots]; slots[si] = { ...slots[si], selectedIdx: vi }; n[activeChTab] = { ...n[activeChTab], visualSlots: slots }; return n; }); };
  const currentText = chData.textVariants[chData.selectedTextIdx]?.text || "";
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
        <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", fontSize: 13, color: "#C4C6D0", lineHeight: 1.7, maxHeight: 200, overflowY: "auto", ...(!["blog","article","landing"].includes(activeChTab) ? { whiteSpace: "pre-wrap" } : {}) }}>{["blog","article","landing"].includes(activeChTab) ? <SimpleMarkdown text={currentText} /> : currentText}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <button onClick={() => onCopy?.(currentText)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: "#6B7084", fontSize: 11, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>📋 Copy</button>
          <button onClick={() => onRegenerate?.(activeChTab)} disabled={isGenerating} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", color: isGenerating ? "#3A3B44" : "#6B7084", fontSize: 11, fontWeight: 500, cursor: isGenerating ? "default" : "pointer", fontFamily: "inherit" }}>{isGenerating ? "⏳" : "🔄"} Regen</button>
          <span style={{ marginLeft: "auto", fontSize: 10, color: "#52556B" }}>{wc(currentText)} words · {cc(currentText)} chars</span>
        </div>
      </div>
      {chData.visualSlots?.length > 0 && <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#52556B", textTransform: "uppercase", letterSpacing: "0.5px" }}>Visuals · {chData.visualSlots.length} slots</span>
          <button onClick={() => onGenerateImage?.(activeChTab)} disabled={isGenerating} style={{ padding: "5px 14px", borderRadius: 7, border: "none", background: isGenerating ? "rgba(255,255,255,0.04)" : "linear-gradient(135deg,rgba(108,43,217,0.3),rgba(20,184,166,0.3))", color: isGenerating ? "#52556B" : "#C4B5FD", fontSize: 11, fontWeight: 600, cursor: isGenerating ? "default" : "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6 }}>{isGenerating ? "⏳ Generating..." : "🖼 Generate All Images"}</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {chData.visualSlots.map((slot, si) => (<div key={slot.slot} style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#8B8DA3", textTransform: "capitalize", display: "block", marginBottom: 8 }}>{slot.slot.replace(/-/g, " ")}</span>
            <div style={{ display: "flex", gap: 8 }}>{slot.variants.map((v, vi) => {
              const hasImage = !!v.url;
              return (<div key={v.id} onClick={() => selectVisual(si, vi)} style={{ width: 72, height: 72, borderRadius: 10, cursor: "pointer", overflow: "hidden", background: hasImage ? "transparent" : `linear-gradient(${135 + vi * 30}deg,hsl(${v.hue},40%,25%),hsl(${v.hue + 40},50%,18%))`, border: slot.selectedIdx === vi ? `2px solid ${ch?.color}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "rgba(255,255,255,0.5)", fontWeight: 600, flexShrink: 0, position: "relative" }}>
                {hasImage ? <img src={v.url} alt={slot.slot} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <>v{vi + 1}</>}
                {slot.selectedIdx === vi && <div style={{ position: "absolute", top: 4, right: 4, width: 14, height: 14, borderRadius: "50%", background: ch?.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "white" }}>✓</div>}
              </div>);
            })}</div>
          </div>))}
        </div>
      </div>}
    </div>
  </div>);
}

// ─── Fixed Dropdown ─────────────────────────────────────────────────────
function FixedDropdown({ anchorRef, open, onClose, children, minWidth = 180 }) {
  const [pos, setPos] = useState({ top: 0, left: 0 });
  useEffect(() => { if (open && anchorRef.current) { const r = anchorRef.current.getBoundingClientRect(); setPos({ top: r.top - 8, left: r.left }); } }, [open]);
  if (!open) return null;
  return (<><div style={{ position: "fixed", inset: 0, zIndex: 9990 }} onClick={onClose} /><div style={{ position: "fixed", bottom: `calc(100vh - ${pos.top}px)`, left: pos.left, zIndex: 9991, background: "#1A1B23", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 6, minWidth, boxShadow: "0 -12px 48px rgba(0,0,0,0.7)", maxHeight: 320, overflowY: "auto" }}>{children}</div></>);
}

// ─── Left Panel ─────────────────────────────────────────────────────────
function LeftPanel({ activeTab, setActiveTab, collapsed, brands, activeBrandId, onOpenBrandEditor, onSelectBrand, projects, onSelectProject, activeProjectId, onNewProject, onSelectTemplate, selectedTemplateId, width = 280 }) {
  const [search, setSearch] = useState(""); const [tplFilter, setTplFilter] = useState("All");
  const cats = ["All", "Thought Leadership", "Product & Company", "Personal Brand", "Educational", "Landing Pages"];
  const filtered = TEMPLATES.filter(t => (tplFilter === "All" || t.category === tplFilter) && (!search || t.name.toLowerCase().includes(search.toLowerCase())));
  if (collapsed) return null;
  return (<div style={{ width, minWidth: 200, height: "100%", background: "rgba(255,255,255,0.02)", borderRight: "none", display: "flex", flexDirection: "column", overflow: "hidden" }}>
    <div style={{ padding: "16px 16px 12px" }}><button onClick={onNewProject} style={{ width: "100%", padding: 11, borderRadius: 10, border: "1px solid rgba(108,43,217,0.3)", background: "rgba(108,43,217,0.1)", color: "#C4B5FD", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>+ New Project</button></div>
    <div style={{ display: "flex", margin: "0 16px", padding: 3, borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.04)" }}>{["projects", "templates", "brands"].map(t => (<button key={t} onClick={() => setActiveTab(t)} style={{ flex: 1, padding: "7px 4px", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", background: activeTab === t ? "rgba(255,255,255,0.08)" : "transparent", color: activeTab === t ? "#E2E4EA" : "#6B7084", textTransform: "capitalize" }}>{t}</button>))}</div>
    <div style={{ padding: "12px 16px 8px" }}><div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}><span style={{ color: "#6B7084", fontSize: 14 }}>⌕</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${activeTab}...`} style={{ border: "none", background: "transparent", color: "#E2E4EA", fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%" }} /></div></div>
    <div style={{ flex: 1, overflowY: "auto", padding: "4px 12px 16px" }}>
      {activeTab === "projects" && projects.map(p => (<div key={p.id} onClick={() => onSelectProject(p.id)} style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", background: activeProjectId === p.id ? "rgba(108,43,217,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${activeProjectId === p.id ? "rgba(108,43,217,0.3)" : "rgba(255,255,255,0.04)"}`, marginBottom: 6 }} onMouseEnter={e => { if (activeProjectId !== p.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }} onMouseLeave={e => { if (activeProjectId !== p.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.title}</div>{p.messageCount > 0 && <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(255,255,255,0.06)", color: "#6B7084", flexShrink: 0, marginLeft: 8 }}>{p.messageCount}</span>}</div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><div style={{ display: "flex", gap: 4 }}>{(p.channels || []).map(ch => { const c = CHANNELS.find(x => x.id === ch); return c ? <span key={ch} style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.color + "20", color: c.color }}>{c.label.split(" ")[0]}</span> : null; })}</div><span style={{ fontSize: 11, color: "#6B7084" }}>{p.updatedAt ? timeAgo(p.updatedAt) : ""}</span></div></div>))}
      {activeTab === "templates" && <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>{cats.map(c => <button key={c} onClick={() => setTplFilter(c)} style={{ padding: "5px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", background: tplFilter === c ? "rgba(108,43,217,0.2)" : "rgba(255,255,255,0.04)", color: tplFilter === c ? "#C4B5FD" : "#6B7084" }}>{c}</button>)}</div>
        {filtered.map(t => (<div key={t.id} onClick={() => onSelectTemplate(t)} style={{ padding: "12px 14px", borderRadius: 10, cursor: "pointer", background: selectedTemplateId === t.id ? "rgba(108,43,217,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${selectedTemplateId === t.id ? "rgba(108,43,217,0.3)" : "rgba(255,255,255,0.04)"}`, marginBottom: 6, transition: "all 0.15s" }} onMouseEnter={e => { if (selectedTemplateId !== t.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }} onMouseLeave={e => { if (selectedTemplateId !== t.id) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}><span style={{ fontSize: 18 }}>{t.icon}</span><span style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA" }}>{t.name}</span></div>
          <div style={{ fontSize: 12, color: "#6B7084", marginBottom: 8, lineHeight: 1.4 }}>{t.description}</div>
          <div style={{ display: "flex", gap: 4 }}>{t.channels.map(ch => { const c = CHANNELS.find(x => x.id === ch); return c ? <span key={ch} style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: c.color + "15", color: c.color }}>{c.label.split(" ")[0]}</span> : null; })}</div>
        </div>))}
      </div>}
      {activeTab === "brands" && <div>{brands.map(brand => (<div key={brand.id} onClick={() => onSelectBrand(brand.id)} style={{ padding: 14, borderRadius: 10, cursor: "pointer", background: brand.id === activeBrandId ? "rgba(108,43,217,0.1)" : "rgba(255,255,255,0.02)", border: `1px solid ${brand.id === activeBrandId ? "rgba(108,43,217,0.3)" : "rgba(255,255,255,0.04)"}`, marginBottom: 6 }}><div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}><div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg,${brand.colors.primary},${brand.colors.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "white" }}>{brand.company_name[0]}</div><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA" }}>{brand.name}</div><div style={{ fontSize: 11, color: "#6B7084" }}>{brand.tagline}</div></div><button onClick={e => { e.stopPropagation(); onOpenBrandEditor(brand); }} style={{ width: 28, height: 28, borderRadius: 6, border: "none", background: "rgba(255,255,255,0.06)", color: "#6B7084", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✎</button></div><div style={{ display: "flex", gap: 6, marginBottom: 8 }}>{["primary", "secondary", "accent"].map(k => <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}><div style={{ width: 14, height: 14, borderRadius: 3, background: brand.colors[k], border: "1px solid rgba(255,255,255,0.1)" }} /><span style={{ fontSize: 10, color: "#52556B", textTransform: "capitalize" }}>{k}</span></div>)}</div><div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{brand.tone.descriptors.map(t => <span key={t} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", color: "#8B8DA3" }}>{t}</span>)}</div></div>))}<button onClick={() => onOpenBrandEditor(null)} style={{ padding: 14, borderRadius: 10, cursor: "pointer", background: "transparent", border: "1px dashed rgba(255,255,255,0.1)", color: "#6B7084", fontSize: 13, fontWeight: 500, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(108,43,217,0.4)"; e.currentTarget.style.color = "#C4B5FD"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#6B7084"; }}>+ Add Brand</button></div>}
    </div>
  </div>);
}

// ─── Center Panel ───────────────────────────────────────────────────────
function CenterPanel({ activeChannels, setActiveChannels, activeBrand, apiKeys, serverStatus, onSelectPreview, messages, setMessages, projectTitle, selectedTemplateId, setSelectedTemplateId, inputMode, setInputMode, tone, setTone, isGenerating, setIsGenerating, generationPhase, setGenerationPhase, addToast, onRegenerate, onGenerateImage }) {
  const [inputValue, setInputValue] = useState(""); const [showTone, setShowTone] = useState(false); const [showMode, setShowMode] = useState(false);
  const [numText, setNumText] = useState(3); const [numVisual, setNumVisual] = useState(3); const [welcome, setWelcome] = useState(true);
  const ref = useRef(null); const modeBtnRef = useRef(null); const toneBtnRef = useRef(null); const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isGenerating]);
  useEffect(() => { setWelcome(messages.length === 0); }, [messages]);

  const selectedTpl = selectedTemplateId ? TEMPLATES.find(t => t.id === selectedTemplateId) : null;
  const mode = INPUT_MODES.find(m => m.id === inputMode);
  const cfgModels = AI_MODELS.filter(m => apiKeys[m.keyField] || serverStatus?.[m.id]);
  const placeholder = selectedTpl?.placeholder || (inputMode === "url" ? "Paste a URL..." : inputMode === "topic" ? "Enter a topic..." : "Write your content brief...");

  const send = async () => {
    if (!inputValue.trim() || isGenerating) return;
    if (activeChannels.length === 0) { addToast("Select at least one channel", "warning"); return; }

    const userMsg = { id: "msg-" + Date.now(), role: "user", content: inputValue, mode: inputMode, tone, channels: [...activeChannels], templateId: selectedTemplateId, numText, numVisual, createdAt: new Date().toISOString(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setMessages(p => [...p, userMsg]); setInputValue(""); setIsGenerating(true); setGenerationPhase("text");

    try {
      let contentInput = inputValue;
      if (inputMode === "url") {
        setGenerationPhase("url");
        try {
          const parsed = await parseUrl(inputValue, apiKeys);
          contentInput = `Source: ${parsed.title || inputValue}\n\n${parsed.content || parsed.excerpt || ""}`;
          addToast("URL content extracted", "success");
        } catch { addToast("URL parsing failed — using raw input", "warning"); }
        setGenerationPhase("text");
      }

      const bundle = await generateContentBundle({ input: contentInput, channels: activeChannels, templateId: selectedTemplateId || null, brand: activeBrand || null, numTextVariants: numText, tone, apiKeys });

      for (const channelId of activeChannels) {
        if (bundle[channelId]) {
          const ch = CHANNELS.find(c => c.id === channelId);
          bundle[channelId].visualSlots = (ch?.slots || []).map(slotName => ({
            slot: slotName,
            variants: Array.from({ length: numVisual }, (_, j) => ({ id: `vs-${channelId}-${slotName}-${j}`, hue: (channelId.charCodeAt(0) * 37 + j * 60 + slotName.charCodeAt(0) * 13) % 360, prompt: `${activeBrand?.name || "Brand"} ${slotName} v${j + 1}` })),
            selectedIdx: 0,
          }));
        }
      }

      const aiMsg = { id: "msg-" + (Date.now() + 1), role: "assistant", channels: [...activeChannels], bundle, createdAt: new Date().toISOString(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
      setMessages(p => [...p, aiMsg]);
      if (onSelectPreview && activeChannels.length > 0) { const fc = activeChannels[0]; onSelectPreview({ channel: fc, text: bundle[fc]?.textVariants[0]?.text, visualSlots: bundle[fc]?.visualSlots }); }
      addToast(`Generated for ${activeChannels.length} channel${activeChannels.length > 1 ? "s" : ""}`, "success");
    } catch (error) {
      setMessages(p => [...p, { id: "msg-" + (Date.now() + 1), role: "error", content: error.message || "Generation failed. Check your API keys in Settings (⚙).", createdAt: new Date().toISOString(), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      addToast(error.message || "Generation failed", "error");
    } finally { setIsGenerating(false); setGenerationPhase(null); }
  };

  const handleBundleUpdate = (msgId, updater) => { setMessages(p => p.map(m => m.id === msgId ? { ...m, bundle: updater(m.bundle) } : m)); };
  const handleCopy = (text) => { clipCopy(text).then(ok => addToast(ok ? "Copied!" : "Copy failed", ok ? "success" : "error")); };

  return (<div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 32px", display: "flex", flexDirection: "column" }}>
      {welcome ? (<div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, maxWidth: 520, margin: "0 auto", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,rgba(108,43,217,0.2),rgba(20,184,166,0.2))", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(108,43,217,0.2)" }}><span style={{ fontSize: 28 }}>✦</span></div>
        <div><h2 style={{ fontSize: 22, fontWeight: 700, color: "#E2E4EA", margin: "0 0 8px" }}>What would you like to create?</h2><p style={{ fontSize: 14, color: "#6B7084", margin: 0, lineHeight: 1.6 }}>Paste a URL, write a thought, pick a topic, or choose a template from the left panel.</p></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%", marginTop: 8 }}>
          {INPUT_MODES.map(m => (<button key={m.id} onClick={() => { setInputMode(m.id); ref.current?.focus(); }} style={{ padding: 16, borderRadius: 12, cursor: "pointer", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "left", fontFamily: "inherit", color: "#E2E4EA" }} onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.borderColor = "rgba(108,43,217,0.3)"; }} onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}><div style={{ fontSize: 20, marginBottom: 8 }}>{m.emoji}</div><div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{m.label}</div><div style={{ fontSize: 11, color: "#6B7084" }}>{m.description}</div></button>))}
        </div>
        {cfgModels.length === 0 && <div style={{ padding: "14px 18px", borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", width: "100%", textAlign: "left" }}><div style={{ fontSize: 13, color: "#FBBF24", fontWeight: 600, marginBottom: 4 }}>⚠ No AI providers configured</div><div style={{ fontSize: 12, color: "#D4A574", lineHeight: 1.5 }}>Click ⚙ in the top bar to add API keys, or set them in .env.local on the server.</div></div>}
      </div>) : (<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {messages.map(msg => (<div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 6 }}>
          {msg.role === "user" ? (<div style={{ maxWidth: "80%", padding: "14px 18px", borderRadius: 14, background: "linear-gradient(135deg,rgba(108,43,217,0.2),rgba(108,43,217,0.1))", border: "1px solid rgba(108,43,217,0.2)" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}><span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.08)", color: "#8B8DA3", textTransform: "uppercase" }}>{msg.mode}</span><span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(245,158,11,0.15)", color: "#FBBF24" }}>{msg.tone}</span>{msg.templateId && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(108,43,217,0.15)", color: "#C4B5FD" }}>{TEMPLATES.find(t => t.id === msg.templateId)?.name || msg.templateId}</span>}<span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "rgba(20,184,166,0.15)", color: "#5EEAD4" }}>{msg.numText}T · {msg.numVisual}V</span></div>
            <div style={{ fontSize: 14, color: "#E2E4EA", lineHeight: 1.6 }}>{msg.content}</div>
          </div>) : msg.role === "error" ? (<div style={{ maxWidth: "80%", padding: "14px 18px", borderRadius: 14, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div style={{ fontSize: 13, color: "#FCA5A5", lineHeight: 1.6 }}>⚠ {msg.content}</div>
          </div>) : (<div style={{ maxWidth: "95%", width: "100%" }}><GenerationCard bundle={msg.bundle} channels={msg.channels} onUpdateBundle={(updater) => handleBundleUpdate(msg.id, updater)} onCopy={handleCopy} onRegenerate={(chId) => onRegenerate(msg.id, chId)} onGenerateImage={(chId) => onGenerateImage?.(msg.id, chId)} isGenerating={isGenerating} /></div>)}
          <span style={{ fontSize: 10, color: "#52556B", padding: "0 4px" }}>{msg.time}</span>
        </div>))}
        {isGenerating && (<div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}><div style={{ padding: "20px 24px", borderRadius: 14, background: "rgba(108,43,217,0.06)", border: "1px solid rgba(108,43,217,0.15)", width: "100%" }}><LoadingDots text={generationPhase === "url" ? "Parsing URL" : generationPhase === "text" ? `Generating text for ${activeChannels.length} channel${activeChannels.length > 1 ? "s" : ""}` : generationPhase === "images" ? "Generating images" : "Generating"} /><div style={{ marginTop: 10, display: "flex", gap: 6 }}>{activeChannels.map(chId => { const c = CHANNELS.find(x => x.id === chId); return c ? <span key={chId} style={{ fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: c.color + "15", color: c.color }}>{c.label}</span> : null; })}</div></div></div>)}
        <div ref={endRef} />
      </div>)}
    </div>

    {/* Input Area */}
    <div style={{ padding: "16px 24px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}>
      {selectedTpl && (<div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(108,43,217,0.08)", border: "1px solid rgba(108,43,217,0.15)", marginBottom: 10 }}><span style={{ fontSize: 16 }}>{selectedTpl.icon}</span><span style={{ fontSize: 12, fontWeight: 600, color: "#C4B5FD" }}>{selectedTpl.name}</span><span style={{ fontSize: 11, color: "#6B7084" }}>· {selectedTpl.channels.length} channels</span><button onClick={() => setSelectedTemplateId(null)} style={{ marginLeft: "auto", fontSize: 14, color: "#6B7084", background: "none", border: "none", cursor: "pointer", padding: "2px 6px" }}>✕</button></div>)}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}><span style={{ fontSize: 11, color: "#52556B", fontWeight: 600, marginRight: 4 }}>CHANNELS</span>
        {CHANNELS.map(ch => (<button key={ch.id} onClick={() => setActiveChannels(p => p.includes(ch.id) ? p.filter(c => c !== ch.id) : [...p, ch.id])} style={{ padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, background: activeChannels.includes(ch.id) ? ch.color + "20" : "rgba(255,255,255,0.04)", color: activeChannels.includes(ch.id) ? ch.color : "#52556B" }}><span style={{ width: 14, height: 14, borderRadius: 3, fontSize: 8, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", background: activeChannels.includes(ch.id) ? ch.color : "rgba(255,255,255,0.08)", color: activeChannels.includes(ch.id) ? "white" : "#52556B" }}>{ch.icon}</span>{ch.label}</button>))}
      </div>
      <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px 6px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexWrap: "wrap" }}>
          <button ref={modeBtnRef} onClick={() => { setShowMode(!showMode); setShowTone(false); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: showMode ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)", color: showMode ? "#E2E4EA" : "#8B8DA3", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>{mode?.emoji} {mode?.label} ▾</button>
          <button ref={toneBtnRef} onClick={() => { setShowTone(!showTone); setShowMode(false); }} style={{ padding: "5px 12px", borderRadius: 7, border: "1px solid rgba(245,158,11,0.2)", background: showTone ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.08)", color: "#FBBF24", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>🎭 {tone} ▾</button>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}><span style={{ fontSize: 10, color: "#6B7084", fontWeight: 600, padding: "0 4px" }}>Text</span>{[1, 2, 3, 4].map(n => (<button key={n} onClick={() => setNumText(n)} style={{ width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit", background: numText === n ? "rgba(108,43,217,0.3)" : "transparent", color: numText === n ? "#C4B5FD" : "#52556B" }}>{n}</button>))}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 4px", borderRadius: 7, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}><span style={{ fontSize: 10, color: "#6B7084", fontWeight: 600, padding: "0 4px" }}>Visual</span>{[1, 2, 3, 4].map(n => (<button key={n} onClick={() => setNumVisual(n)} style={{ width: 22, height: 22, borderRadius: 5, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: "inherit", background: numVisual === n ? "rgba(20,184,166,0.3)" : "transparent", color: numVisual === n ? "#5EEAD4" : "#52556B" }}>{n}</button>))}</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>{cfgModels.map(m => <span key={m.id} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: m.color + "18", color: m.color, fontWeight: 600 }}>{m.name}</span>)}{cfgModels.length === 0 && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: "rgba(239,68,68,0.12)", color: "#FCA5A5", fontWeight: 600 }}>No models ⚙</span>}</div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", padding: 4 }}><textarea ref={ref} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={placeholder} disabled={isGenerating} style={{ flex: 1, padding: "12px 14px", border: "none", background: "transparent", color: "#E2E4EA", fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "none", minHeight: 48, maxHeight: 160, lineHeight: 1.5, opacity: isGenerating ? 0.5 : 1 }} rows={2} /><div style={{ padding: 8 }}><button onClick={send} disabled={!inputValue.trim() || isGenerating} style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: (inputValue.trim() && !isGenerating) ? "linear-gradient(135deg,#6C2BD9,#5B21B6)" : "rgba(255,255,255,0.04)", color: (inputValue.trim() && !isGenerating) ? "white" : "#52556B", cursor: (inputValue.trim() && !isGenerating) ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center" }}>{isGenerating ? <LoadingDots text="" /> : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>}</button></div></div>
      </div>
    </div>

    <FixedDropdown anchorRef={modeBtnRef} open={showMode} onClose={() => setShowMode(false)} minWidth={220}>{INPUT_MODES.map(m => (<button key={m.id} onClick={() => { setInputMode(m.id); setShowMode(false); }} style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "none", background: inputMode === m.id ? "rgba(108,43,217,0.15)" : "transparent", color: inputMode === m.id ? "#C4B5FD" : "#C4C6D0", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }} onMouseEnter={e => { if (inputMode !== m.id) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }} onMouseLeave={e => { if (inputMode !== m.id) e.currentTarget.style.background = "transparent"; }}><span style={{ fontSize: 16 }}>{m.emoji}</span><div><div style={{ fontWeight: 600 }}>{m.label}</div><div style={{ fontSize: 11, color: "#6B7084", marginTop: 2 }}>{m.description}</div></div></button>))}</FixedDropdown>
    <FixedDropdown anchorRef={toneBtnRef} open={showTone} onClose={() => setShowTone(false)} minWidth={180}>{TONES.map(t => (<button key={t} onClick={() => { setTone(t); setShowTone(false); }} style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: "none", background: tone === t ? "rgba(245,158,11,0.15)" : "transparent", color: tone === t ? "#FBBF24" : "#C4C6D0", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }} onMouseEnter={e => { if (tone !== t) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }} onMouseLeave={e => { if (tone !== t) e.currentTarget.style.background = "transparent"; }}>{t}</button>))}</FixedDropdown>
  </div>);
}

// ─── Right Panel ────────────────────────────────────────────────────────
function RightPanel({ activeChannels, activeChannel, setActiveChannel, collapsed, previewData, addToast, activeBrand, onTextEdit, width = 380 }) {
  if (collapsed) return null;
  const pd = previewData || {}; const text = pd.text || "Your generated content will appear here..."; const slots = pd.visualSlots || [];
  const [editing, setEditing] = useState(false); const [editText, setEditText] = useState(text); const [versionIdx, setVersionIdx] = useState(0); const [versions, setVersions] = useState([{ text, time: "now" }]);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  useEffect(() => { setEditText(text); setVersions([{ text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]); setVersionIdx(0); setEditing(false); }, [text]);

  const saveEdit = () => {
    const newVer = { text: editText, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    setVersions(p => [...p, newVer]); setVersionIdx(versions.length); setEditing(false);
    onTextEdit?.(editText);
  };
  const revertTo = (idx) => { setVersionIdx(idx); setEditText(versions[idx].text); };
  const curText = versions[versionIdx]?.text || text;
  const brandHFont = activeBrand?.typography?.heading_font;
  const brandBFont = activeBrand?.typography?.body_font;

  const renderVisualSlot = (s, i, height = 140) => {
    const sel = s.variants[s.selectedIdx];
    if (sel?.url) return <div key={i} onClick={() => setLightboxUrl(sel.url)} style={{ marginTop: 12, borderRadius: 10, overflow: "hidden", cursor: "zoom-in", position: "relative" }} onMouseEnter={e => { const ov = e.currentTarget.querySelector(".zoom-hint"); if (ov) ov.style.opacity = "1"; }} onMouseLeave={e => { const ov = e.currentTarget.querySelector(".zoom-hint"); if (ov) ov.style.opacity = "0"; }}><img src={sel.url} alt={s.slot} style={{ width: "100%", height, objectFit: "cover", display: "block", borderRadius: 10 }} /><div className="zoom-hint" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, opacity: 0, transition: "opacity 0.2s", pointerEvents: "none" }}><span style={{ fontSize: 20, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>🔍</span></div></div>;
    return <div key={i} style={{ marginTop: 12, height, borderRadius: 10, background: `linear-gradient(${135 + i * 20}deg,hsl(${sel?.hue || 250},35%,22%),hsl(${(sel?.hue || 250) + 40},45%,16%))`, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 4 }}><span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>{s.slot}</span><span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>v{s.selectedIdx + 1} of {s.variants.length}</span></div>;
  };

  return (<div style={{ width, minWidth: 280, height: "100%", borderLeft: "none", display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
    <div style={{ display: "flex", padding: "8px 12px", gap: 4, borderBottom: "1px solid rgba(255,255,255,0.06)", overflowX: "auto" }}>{CHANNELS.filter(c => activeChannels.includes(c.id)).map(ch => (<button key={ch.id} onClick={() => setActiveChannel(ch.id)} style={{ padding: "6px 12px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 6, background: activeChannel === ch.id ? ch.color + "20" : "transparent", color: activeChannel === ch.id ? ch.color : "#6B7084" }}><span style={{ width: 16, height: 16, borderRadius: 4, fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", background: activeChannel === ch.id ? ch.color : "rgba(255,255,255,0.08)", color: activeChannel === ch.id ? "white" : "#52556B" }}>{ch.icon}</span>{ch.label}</button>))}</div>
    <div style={{ flex: 1, padding: 20, overflowY: "auto" }}>
      <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", overflow: "hidden" }}>
        {activeChannel === "linkedin" && <div style={{ padding: 16 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#6C2BD9,#14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: "white" }}>P</div><div><div style={{ fontSize: 14, fontWeight: 700, color: "#E2E4EA" }}>Prashanth Kumar</div><div style={{ fontSize: 12, color: "#6B7084" }}>CTO & Co-founder at Enkrypt AI</div><div style={{ fontSize: 11, color: "#52556B" }}>Just now · 🌍</div></div></div>
          {editing ? <div><textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: "100%", minHeight: 120, padding: 12, borderRadius: 10, border: "1px solid rgba(108,43,217,0.3)", background: "rgba(108,43,217,0.05)", color: "#E2E4EA", fontSize: 13, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.7, outline: "none", resize: "vertical", boxSizing: "border-box" }} /><div style={{ display: "flex", gap: 6, marginTop: 8 }}><button onClick={saveEdit} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#6C2BD9,#5B21B6)", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save</button><button onClick={() => { setEditing(false); setEditText(versions[versionIdx].text); }} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#8B8DA3", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button></div></div> : <div onClick={() => setEditing(true)} style={{ fontSize: 13, color: "#C4C6D0", lineHeight: 1.7, cursor: "text", whiteSpace: "pre-wrap", padding: 4, borderRadius: 8, transition: "all 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "rgba(108,43,217,0.05)"} onMouseLeave={e => e.currentTarget.style.background = "transparent"}>{curText}</div>}
          {slots.length > 0 ? slots.map((s, i) => renderVisualSlot(s, i)) : null}
          <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.06)" }}>{["👍 Like", "💬 Comment", "🔄 Repost", "📨 Send"].map(a => <span key={a} style={{ fontSize: 12, color: "#52556B" }}>{a}</span>)}</div>
        </div>}
        {activeChannel === "twitter" && <div style={{ padding: 16 }}><div style={{ display: "flex", gap: 12 }}><div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#6C2BD9,#14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "white", flexShrink: 0 }}>P</div><div style={{ flex: 1 }}><div style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ fontSize: 14, fontWeight: 700, color: "#E2E4EA" }}>Prashanth</span><span style={{ fontSize: 13, color: "#52556B" }}>@prashanth_ai · now</span></div>{editing ? <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: "100%", minHeight: 80, padding: 8, borderRadius: 8, border: "1px solid rgba(29,155,240,0.3)", background: "rgba(29,155,240,0.05)", color: "#E2E4EA", fontSize: 14, fontFamily: "'DM Sans',sans-serif", lineHeight: 1.6, outline: "none", resize: "vertical", marginTop: 6, boxSizing: "border-box" }} /> : <div onClick={() => setEditing(true)} style={{ fontSize: 14, color: "#C4C6D0", lineHeight: 1.6, marginTop: 6, cursor: "text" }}>{curText.slice(0, 280)}</div>}{cc(curText) > 280 && <div style={{ fontSize: 11, color: "#FCA5A5", marginTop: 4, fontWeight: 600 }}>{cc(curText)}/280 — over limit</div>}</div></div></div>}
        {activeChannel === "landing" && <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#E2E4EA", margin: 0, ...(brandHFont ? { fontFamily: `'${brandHFont}', sans-serif` } : {}) }}>Landing Page Preview</h2>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setEditing(!editing)} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.08)", background: editing ? "rgba(236,72,153,0.15)" : "rgba(255,255,255,0.03)", color: editing ? "#EC4899" : "#8B8DA3", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{editing ? "Preview" : "Edit Source"}</button>
              <button onClick={() => { const html = buildLandingPageHtml(curText, activeBrand, landingExportOptions()); const blob = new Blob([html], { type: "text/html" }); const url = URL.createObjectURL(blob); window.open(url, "_blank"); setTimeout(() => URL.revokeObjectURL(url), 60000); }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(236,72,153,0.3)", background: "rgba(236,72,153,0.1)", color: "#EC4899", fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Open Full</button>
            </div>
          </div>
          {editing ? <textarea value={editText} onChange={e => setEditText(e.target.value)} style={{ width: "100%", minHeight: 300, padding: 12, borderRadius: 10, border: "1px solid rgba(236,72,153,0.3)", background: "rgba(236,72,153,0.03)", color: "#E2E4EA", fontSize: 12, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.6, outline: "none", resize: "vertical", boxSizing: "border-box", tabSize: 2 }} /> :
          <div style={{ borderRadius: 10, overflow: "auto", border: "1px solid rgba(255,255,255,0.08)", background: "#0C0D14", height: 600, position: "relative" }}>
            <iframe srcDoc={buildLandingPageHtml(curText, activeBrand, landingExportOptions())} style={{ width: "200%", height: 3000, border: "none", transform: "scale(0.5)", transformOrigin: "top left", display: "block", pointerEvents: "auto" }} title="Landing Page Preview" />
          </div>}
          {editing && <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button onClick={saveEdit} style={{ padding: "6px 14px", borderRadius: 7, border: "none", background: "linear-gradient(135deg,#EC4899,#6C2BD9)", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Save Changes</button><button onClick={() => { setEditing(false); setEditText(versions[versionIdx].text); }} style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#8B8DA3", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button></div>}
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
          <button onClick={() => setEditing(true)} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: "#8B8DA3", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>✏️ Edit</button>
          <button onClick={() => { clipCopy(curText).then(ok => addToast(ok ? "Copied!" : "Copy failed", ok ? "success" : "error")); }} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: "#8B8DA3", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>📋 Copy</button>
          <button onClick={() => { downloadFile(curText, `${activeChannel}-content.md`, "text/markdown"); addToast("Downloaded!", "success"); }} style={{ padding: "6px 12px", borderRadius: 7, border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.03)", color: "#8B8DA3", fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>⬇️ Download</button>
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
    <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
  </div>);
}

// ─── Main Workspace ─────────────────────────────────────────────────────
export default function Workspace({ user, onLogout }) {
  const [leftCollapsed, setLeftCollapsed] = useState(false); const [rightCollapsed, setRightCollapsed] = useState(false); const [leftTab, setLeftTab] = useState("templates");
  const [leftWidth, setLeftWidth] = useState(280); const [rightWidth, setRightWidth] = useState(380);
  const [activeChannels, setActiveChannels] = useState(["linkedin", "twitter"]); const [activeChannel, setActiveChannel] = useState("linkedin");
  const [inputMode, setInputMode] = useState("text"); const [tone, setTone] = useState("Professional"); const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [activeBrandId, setActiveBrandId] = useState("brand-1"); const [brandDrop, setBrandDrop] = useState(false);
  const [brands, setBrands] = useState(defaultBrands); const [showApiKeys, setShowApiKeys] = useState(false); const [apiKeys, setApiKeys] = useState({});
  const [brandEditorOpen, setBrandEditorOpen] = useState(false); const [editingBrand, setEditingBrand] = useState(null);
  const [previewData, setPreviewData] = useState(null); const [showExport, setShowExport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState(null);
  const [serverStatus, setServerStatus] = useState({});
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = "info") => { const id = Date.now() + Math.random(); setToasts(p => [...p, { id, message, type }]); setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500); };

  const [projects, setProjects] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [currentMessages, setCurrentMessages] = useState([]);
  const [projectTitle, setProjectTitle] = useState("Untitled Project");
  const saveTimerRef = useRef(null);

  useEffect(() => {
    try { const s = localStorage.getItem("ce_api_keys"); if (s) setApiKeys(JSON.parse(s)); } catch {}
    try { const b = localStorage.getItem("ce_active_brand"); if (b) setActiveBrandId(b); } catch {}
    checkProviderStatus().then(setServerStatus).catch(() => {});
    loadBrands().then(saved => { if (saved && saved.length > 0) setBrands(saved); else defaultBrands.forEach(b => saveBrand(b)); }).catch(() => {});
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
    setSelectedTemplateId(template.id);
    setInputMode(template.defaultMode || "text");
    setTone(template.defaultTone || "Professional");
    setActiveChannels(template.channels || ["linkedin"]);
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
    const lastAi = [...currentMessages].reverse().find(m => m.role === "assistant");
    if (!lastAi?.bundle) return;
    const ch = activeChannel;
    const chData = lastAi.bundle[ch];
    if (chData) {
      setPreviewData({ channel: ch, text: chData.textVariants?.[chData.selectedTextIdx]?.text, visualSlots: chData.visualSlots });
    }
  }, [currentMessages, activeChannel]);

  const autoImageRef = useRef(new Set());
  useEffect(() => {
    if (isGenerating) return;
    const lastAi = [...currentMessages].reverse().find(m => m.role === "assistant");
    if (!lastAi?.bundle || autoImageRef.current.has(lastAi.id)) return;
    const longFormChannels = (lastAi.channels || []).filter(ch => ["blog", "article", "landing"].includes(ch));
    const needsImages = longFormChannels.filter(ch => {
      const slots = lastAi.bundle[ch]?.visualSlots || [];
      return slots.length > 0 && slots.some(s => !s.variants?.[s.selectedIdx]?.url);
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
      const result = await generateText({ input: userMsg.content, channel: channelId, templateId: userMsg.templateId || selectedTemplateId, brand: activeBrand, numVariants: userMsg.numText || 3, tone: userMsg.tone || tone, apiKeys });
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
    const userTopic = userMsg?.content || "";
    const contentSummary = [
      userTopic ? `Topic/Input: ${userTopic}` : "",
      textContent ? `Generated content:\n${textContent.slice(0, 1500)}` : "",
    ].filter(Boolean).join("\n\n");
    setIsGenerating(true); setGenerationPhase("images");
    addToast(`Generating ${allSlots.length} image${allSlots.length > 1 ? "s" : ""}...`, "info");
    let successCount = 0;
    for (let si = 0; si < allSlots.length; si++) {
      const slotData = allSlots[si];
      const vi = slotData.selectedIdx || 0;
      try {
        const result = await generateImage({ channel: channelId, slot: slotData.slot, brand: activeBrand, contentSummary, provider: "openai", numVariants: 1, apiKeys });
        if (result.images?.[0]?.url) {
          setCurrentMessages(p => p.map(m => {
            if (m.id !== messageId) return m;
            const bundle = { ...m.bundle };
            const chData = { ...bundle[channelId] };
            const slots = [...chData.visualSlots];
            const slot = { ...slots[si] };
            const variants = [...slot.variants];
            variants[vi] = { ...variants[vi], url: result.images[0].url, revisedPrompt: result.images[0].revisedPrompt };
            slot.variants = variants;
            slots[si] = slot;
            chData.visualSlots = slots;
            bundle[channelId] = chData;
            return { ...m, bundle };
          }));
          successCount++;
        }
      } catch (error) { addToast(`Failed: ${slotData.slot} — ${error.message}`, "error"); }
    }
    setIsGenerating(false); setGenerationPhase(null);
    if (successCount > 0) {
      addToast(`Generated ${successCount}/${allSlots.length} images`, "success");
      setCurrentMessages(latest => {
        const updatedMsg = latest.find(m => m.id === messageId);
        if (updatedMsg?.bundle?.[channelId]) {
          const chData = updatedMsg.bundle[channelId];
          setPreviewData({ channel: channelId, text: chData.textVariants?.[chData.selectedTextIdx]?.text, visualSlots: chData.visualSlots });
        }
        return latest;
      });
    }
  };

  const getCurrentBundle = () => { const last = [...currentMessages].reverse().find(m => m.role === "assistant"); return last?.bundle || {}; };

  const handlePreviewTextEdit = (newText) => {
    const lastAi = [...currentMessages].reverse().find(m => m.role === "assistant");
    if (!lastAi?.bundle) return;
    const ch = previewData?.channel || activeChannels[0];
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
      <div style={{ position: "relative" }}><button onClick={() => setBrandDrop(!brandDrop)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", cursor: "pointer", fontFamily: "inherit" }}><div style={{ width: 22, height: 22, borderRadius: 5, background: activeBrand ? `linear-gradient(135deg,${activeBrand.colors.primary},${activeBrand.colors.secondary})` : "#333", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, color: "white" }}>{activeBrand?.company_name[0] || "?"}</div><span style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA" }}>{activeBrand?.name || "Brand"}</span><span style={{ fontSize: 10, color: "#6B7084" }}>▾</span></button>
        {brandDrop && (<><div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setBrandDrop(false)} /><div style={{ position: "absolute", top: "110%", right: 0, zIndex: 200, background: "#1A1B23", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: 6, minWidth: 240, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>{brands.map(brand => (<button key={brand.id} onClick={() => { setActiveBrandId(brand.id); setBrandDrop(false); }} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "none", background: activeBrandId === brand.id ? "rgba(108,43,217,0.15)" : "transparent", cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 10 }} onMouseEnter={e => { if (activeBrandId !== brand.id) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }} onMouseLeave={e => { if (activeBrandId !== brand.id) e.currentTarget.style.background = "transparent"; }}><div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg,${brand.colors.primary},${brand.colors.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "white" }}>{brand.company_name[0]}</div><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: "#E2E4EA" }}>{brand.name}</div><div style={{ fontSize: 11, color: "#6B7084" }}>{brand.tagline}</div></div>{activeBrandId === brand.id && <span style={{ color: "#6C2BD9" }}>✓</span>}</button>))}<div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", margin: "4px 0", padding: "4px 0 0" }}><button onClick={() => { setBrandDrop(false); openBrandEditor(null); }} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", color: "#6B7084", fontSize: 12, textAlign: "left", display: "flex", alignItems: "center", gap: 8 }} onMouseEnter={e => e.currentTarget.style.color = "#C4B5FD"} onMouseLeave={e => e.currentTarget.style.color = "#6B7084"}>+ New Brand</button></div></div></>)}
      </div>
      <button onClick={() => setShowApiKeys(true)} title="AI Provider Settings" style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", color: "#8B8DA3", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, position: "relative" }}>⚙{(Object.values(apiKeys).filter(Boolean).length > 0 || Object.values(serverStatus).filter(Boolean).length > 0) && <div style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, borderRadius: "50%", background: "#34D399", border: "2px solid #0C0D14" }} />}</button>
      <button onClick={() => setShowExport(true)} disabled={isGenerating} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 16px", borderRadius: 9, border: "none", cursor: isGenerating ? "default" : "pointer", fontFamily: "inherit", background: "linear-gradient(135deg,#6C2BD9,#5B21B6)", color: "white", fontSize: 13, fontWeight: 600, opacity: isGenerating ? 0.5 : 1 }}>⬇ Export</button>
      <div style={{ width: 1, height: 24, background: "rgba(255,255,255,0.08)" }} />
      <button onClick={() => setRightCollapsed(!rightCollapsed)} style={{ width: 32, height: 32, borderRadius: 7, border: "none", background: rightCollapsed ? "rgba(108,43,217,0.15)" : "rgba(255,255,255,0.04)", color: rightCollapsed ? "#C4B5FD" : "#8B8DA3", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700 }}>◧</button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}><div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg,#6C2BD9,#14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "white" }}>{user.name[0].toUpperCase()}</div><button onClick={onLogout} style={{ background: "none", border: "none", color: "#52556B", cursor: "pointer", fontSize: 14, padding: 4 }}>⏻</button></div>
    </div>

    {/* Panels */}
    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
      <LeftPanel activeTab={leftTab} setActiveTab={setLeftTab} collapsed={leftCollapsed} brands={brands} activeBrandId={activeBrandId} onOpenBrandEditor={openBrandEditor} onSelectBrand={setActiveBrandId} projects={projects} onSelectProject={selectProject} activeProjectId={activeProjectId} onNewProject={newProject} onSelectTemplate={selectTemplate} selectedTemplateId={selectedTemplateId} width={leftWidth} />
      {!leftCollapsed && <PanelDivider onDrag={(dx) => setLeftWidth(w => Math.max(200, Math.min(500, w + dx)))} />}
      <CenterPanel activeChannels={activeChannels} setActiveChannels={setActiveChannels} activeBrand={activeBrand} apiKeys={apiKeys} serverStatus={serverStatus} onSelectPreview={setPreviewData} messages={currentMessages} setMessages={setCurrentMessages} projectTitle={projectTitle} selectedTemplateId={selectedTemplateId} setSelectedTemplateId={setSelectedTemplateId} inputMode={inputMode} setInputMode={setInputMode} tone={tone} setTone={setTone} isGenerating={isGenerating} setIsGenerating={setIsGenerating} generationPhase={generationPhase} setGenerationPhase={setGenerationPhase} addToast={addToast} onRegenerate={regenerateChannel} onGenerateImage={generateAllImages} />
      {!rightCollapsed && <PanelDivider onDrag={(dx) => setRightWidth(w => Math.max(280, Math.min(600, w - dx)))} />}
      <RightPanel activeChannels={activeChannels} activeChannel={activeChannel} setActiveChannel={setActiveChannel} collapsed={rightCollapsed} previewData={previewData} addToast={addToast} activeBrand={activeBrand} onTextEdit={handlePreviewTextEdit} width={rightWidth} />
    </div>

    <ApiKeysModal open={showApiKeys} onClose={() => setShowApiKeys(false)} apiKeys={apiKeys} setApiKeys={setApiKeys} serverStatus={serverStatus} addToast={addToast} />
    <BrandEditor open={brandEditorOpen} onClose={() => { setBrandEditorOpen(false); setEditingBrand(null); }} onSave={handleSaveBrand} editBrand={editingBrand} />
    <ExportModal open={showExport} onClose={() => setShowExport(false)} activeChannels={activeChannels} currentBundle={getCurrentBundle()} addToast={addToast} activeBrand={activeBrand} />
    <ToastContainer toasts={toasts} />
  </div>);
}
