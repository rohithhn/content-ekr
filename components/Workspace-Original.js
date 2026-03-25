"use client";
/**
 * Workspace — Main application shell.
 * 
 * This is a placeholder that re-exports the existing artifact prototype.
 * In a full build, this would be split into proper sub-components imported from
 * ./panels/, ./modals/, and ./cards/ directories.
 * 
 * For now, the working prototype lives in the artifact file.
 * To migrate: split the artifact's components into individual files here.
 * 
 * Key components to extract:
 * - TopBar (brand selector, settings, export, user menu)
 * - LeftPanel (projects, templates, brands tabs)
 * - CenterPanel (chat messages, input bar, dropdowns)
 * - RightPanel (channel preview, inline editor, version history)
 * - GenerationCard (multi-channel tabs, text variants, visual slots)
 * - ApiKeysModal, ExportModal, BrandEditor modals
 * - FixedDropdown utility component
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { CHANNELS, TEMPLATES, TONES, INPUT_MODES, AI_MODELS } from "@/config/constants";
import { generateContentBundle, parseUrl } from "@/lib/ai/orchestrator";

// NOTE: The full Workspace implementation mirrors the artifact prototype.
// In a production build, each panel and modal becomes its own file.
// For the initial deployment, copy the content from the artifact's JSX
// (content-engine-workspace.jsx) into this file, replacing the placeholder below.

export default function Workspace({ user, onLogout }) {
  return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0C0D14", color: "#E2E4EA", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 500 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: "linear-gradient(135deg,#6C2BD9,#14B8A6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "white", margin: "0 auto 24px" }}>C</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>ContentEngine</h1>
        <p style={{ color: "#6B7084", fontSize: 15, lineHeight: 1.6, marginBottom: 32 }}>
          Welcome, {user.name}. The workspace is ready for deployment.<br/>
          Copy the artifact prototype into this Workspace component to activate the full UI.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <div style={{ padding: "12px 20px", borderRadius: 10, background: "rgba(108,43,217,0.1)", border: "1px solid rgba(108,43,217,0.3)", color: "#C4B5FD", fontSize: 13, fontWeight: 600 }}>
            API Routes ✓
          </div>
          <div style={{ padding: "12px 20px", borderRadius: 10, background: "rgba(20,184,166,0.1)", border: "1px solid rgba(20,184,166,0.3)", color: "#5EEAD4", fontSize: 13, fontWeight: 600 }}>
            System Prompts ✓
          </div>
          <div style={{ padding: "12px 20px", borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#FBBF24", fontSize: 13, fontWeight: 600 }}>
            DB Schema ✓
          </div>
        </div>
        <button onClick={onLogout} style={{ marginTop: 32, padding: "10px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#6B7084", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Sign Out</button>
      </div>
    </div>
  );
}
