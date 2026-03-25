/**
 * studioLayoutGenerator — two LLM calls that power the Studio tab:
 *
 * 1. generateStudioContent()  — extracts heading / subheading / footer
 *    from raw pasted text (mirrors the General tab Content API behaviour).
 *
 * 2. generateLayout()         — analyses the content and outputs a JSON
 *    layout spec: an open-ended array of primitive design elements
 *    (rect, circle, text, icon, line, arrow) that the Studio renderer
 *    turns into individual editable fabric.js objects.
 *
 * There are NO limits on what the layout can contain.  The AI is briefed
 * to think like a world-class editorial designer — not a template filler.
 */

import { AVAILABLE_ICONS } from "./studioIconRenderer";
import {
  ENKRYPT_GEMINI_CHAT_MODEL,
  ENKRYPT_OPENAI_FAST_MODEL,
  openAiChatCompletionsExtras,
} from "./llmText";

// ── Shared types ─────────────────────────────────────────────────────────────

export interface GeneratedContent {
  heading: string;
  subheading: string;
  footer: string;
}

// ── Primitive specs (fabric-renderable) ──────────────────────────────────────

export interface RectSpec {
  type: "rect";
  x: number; y: number; w: number; h: number;
  fill: string;
  opacity?: number;
  radius?: number;
  stroke?: string;
  strokeWidth?: number;
  shadow?: boolean;
  shadowBlur?: number;
  shadowColor?: string;
  angle?: number;
}

export interface CircleSpec {
  type: "circle";
  cx: number; cy: number; r: number;
  fill: string;
  opacity?: number;
  stroke?: string;
  strokeWidth?: number;
  shadow?: boolean;
}

export interface TextSpec {
  type: "text";
  x: number; y: number; w: number;
  content: string;
  fontSize: number;       // fraction of canvas height, e.g. 0.03 ≈ 32 px on 1080
  fontWeight?: string;    // "300" | "400" | "500" | "600" | "700" | "800"
  italic?: boolean;
  color: string;
  align?: "left" | "center" | "right";
  opacity?: number;
}

export interface IconSpec {
  type: "icon";
  cx: number; cy: number;
  name: string;           // PascalCase lucide name from the provided list
  size: number;           // fraction of canvas height, e.g. 0.08 ≈ 86 px on 1080
  color: string;
  opacity?: number;
}

export interface LineSpec {
  type: "line";
  x1: number; y1: number; x2: number; y2: number;
  color: string;
  strokeWidth?: number;
  dashed?: boolean;
  opacity?: number;
}

export interface ArrowSpec {
  type: "arrow";
  x1: number; y1: number; x2: number; y2: number;
  color: string;
  strokeWidth?: number;
  dashed?: boolean;
  curved?: boolean;
  opacity?: number;
}

export type ComponentSpec =
  | RectSpec | CircleSpec | TextSpec | IconSpec | LineSpec | ArrowSpec;

export interface LayoutSpec {
  components: ComponentSpec[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const THREAT_SIGNALS = [
  "attack", "threat", "adversarial", "jailbreak", "prompt injection", "exploit",
  "breach", "vulnerability", "cve", "red team", "red teaming", "malicious", "bypass",
  "evasion", "poisoning", "backdoor", "compromise", "intrusion", "exfiltration",
  "risk", "danger", "critical", "severe", "high severity", "unsafe", "failure mode",
  "incident", "data leak", "non-compliant", "policy violation", "flagged", "blocked",
  "denied", "attack vector", "zero-day", "ransomware",
];

function hasThreat(text: string): boolean {
  const lower = text.toLowerCase();
  return THREAT_SIGNALS.some((s) => lower.includes(s));
}

async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  provider: "openai" | "gemini",
  maxTokens = 1800,
  temperature = 0.85
): Promise<string> {
  const key = apiKey.replace(/[^\x20-\x7E]/g, "").trim();

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: ENKRYPT_OPENAI_FAST_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature,
        ...openAiChatCompletionsExtras(ENKRYPT_OPENAI_FAST_MODEL),
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  // Gemini
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function extractJSON(raw: string): string {
  // Strip markdown code fences if present
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Find first { ... } block
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);
  return raw.trim();
}

// ── 1. Content generation ────────────────────────────────────────────────────

export async function generateStudioContent(
  rawContent: string,
  apiKey: string,
  provider: "openai" | "gemini"
): Promise<GeneratedContent> {
  const system = `You extract concise marketing copy from raw content for Enkrypt AI, a B2B AI security platform.
Output ONLY valid JSON — no explanation, no markdown.
Format: {"heading":"...","subheading":"...","footer":"..."}
Rules:
- heading: punchy, ≤8 words, captures the core message
- subheading: 1 sentence, ≤18 words, expands on the heading
- footer: brief CTA or attribution, ≤6 words`;

  const user = rawContent.slice(0, 3000);

  try {
    const raw = await callLLM(system, user, apiKey, provider, 300, 0.6);
    const parsed = JSON.parse(extractJSON(raw));
    return {
      heading: parsed.heading ?? "Enkrypt AI",
      subheading: parsed.subheading ?? "",
      footer: parsed.footer ?? "enkryptai.com",
    };
  } catch {
    return { heading: "Enkrypt AI", subheading: "", footer: "enkryptai.com" };
  }
}

// ── 2. Layout generation ─────────────────────────────────────────────────────

const PRIMITIVE_SCHEMA = `
PRIMITIVE TYPES — use any combination, any quantity, any order:

{ type: "rect", x, y, w, h, fill, opacity?, radius?, stroke?, strokeWidth?, shadow?, shadowBlur?, shadowColor?, angle? }
  — x/y: top-left corner. w/h: width/height. All 0–1 fractions of canvas.
  — radius: corner radius in pixels (0–60). shadow: true for drop shadow.
  — angle: rotation in degrees (optional). Use for diagonal accents.

{ type: "circle", cx, cy, r, fill, opacity?, stroke?, strokeWidth?, shadow? }
  — cx/cy: center point. r: radius. All 0–1 fractions.

{ type: "text", x, y, w, content, fontSize, fontWeight?, italic?, color, align?, opacity? }
  — x/y: top-left. w: text box width (0–1). fontSize: fraction of canvas height (0.02–0.10).
  — fontWeight: "300"|"400"|"500"|"600"|"700"|"800". align: "left"|"center"|"right".

{ type: "icon", cx, cy, name, size, color, opacity? }
  — cx/cy: center. size: fraction of canvas height (0.04–0.15).
  — name: MUST be one of the provided icon list (PascalCase).

{ type: "line", x1, y1, x2, y2, color, strokeWidth?, dashed?, opacity? }
  — strokeWidth: fraction of canvas height (0.001–0.008).

{ type: "arrow", x1, y1, x2, y2, color, strokeWidth?, dashed?, curved?, opacity? }
  — Same as line but renders a filled arrowhead at x2/y2.
  — curved: true for a gently curved arc instead of straight line.`;

const BRAND_PALETTE = `
BRAND COLOR PALETTE (start here, AI can expand creatively):
  Primary orange:   #F97316   — hero elements, stat values, CTA containers
  Brand pink:       #EC4899   — gradients, secondary accents, badge fills
  Deep navy:        #0A0F1E   — dark backgrounds, high-contrast overlays
  Near-black:       #0D0F14   — dark editorial backgrounds
  Electric teal:    #06B6D4   — AI/ML nodes, data elements, tech accents
  Violet:           #7C3AED   — embedding spaces, model visualization
  Amber:            #F59E0B   — warning states, process highlights
  Slate gray:       #64748B   — secondary text, dividers, neutral containers
  Light slate:      #F1F5F9   — subtle container fills on light backgrounds
  Off-white:        #FAF9F7   — clean container backgrounds
  Near-white:       #F0F4FF   — label text on dark backgrounds
  Deep red:         #D92D20   — THREAT elements only (attack nodes, danger states, CVE badges)

OPACITY GUIDE:
  Container fills: 0.08–0.15 for subtle, 0.85–1.0 for bold
  Accent shapes: 0.12–0.25 for layered depth
  Supporting text: 0.65–0.85
  Dividers/lines: 0.25–0.50`;

export async function generateLayout(
  rawContent: string,
  content: GeneratedContent,
  apiKey: string,
  provider: "openai" | "gemini"
): Promise<LayoutSpec> {
  const isThreат = hasThreat(
    [rawContent, content.heading, content.subheading, content.footer].join(" ")
  );

  const redGuidance = isThreат
    ? `RED COLOR RULE: Content contains threat/risk signals. Use deep red #D92D20 ONLY on the specific threat element (attack node, danger badge, CVE label, breach indicator). Nowhere else.`
    : `RED COLOR RULE: No threat signals detected. DO NOT use red (#D92D20 or any red tone) anywhere in this layout.`;

  const system = `You are a world-class editorial designer and data visualizer for Enkrypt AI, a B2B AI security platform.
Your output powers a Figma/Canva-style canvas editor. Every element you specify becomes a SEPARATE, independently selectable and editable design object.

THINK LIKE A DESIGNER, NOT A TEMPLATE FILLER:
- Analyse the content deeply. What is the core message? What visual language best communicates it?
- Be bold, specific, and compositionally intentional. The quality bar: top-tier design agency work.
- You have ZERO limits on element count or complexity. Use as many primitives as the design needs.
- Combine primitives to build compound components: cards (rect+text), badges (rect+text+icon), stat blocks (circle+text+text), flow steps (circles+arrows+labels), network diagrams (circles+lines+icons), annotated diagrams (icons+lines+text callouts), dashboard fragments (rects+text+icons).
- Create genuine visual hierarchy: one dominant hero, supporting elements at varied scales.
- Use layering: background fills first (low opacity), then midground elements, then foreground hero, then labels/annotations on top.
- Every design should have at least ONE unexpected creative choice: oversized stat, diagonal accent, asymmetric composition, extreme scale contrast, bold color block.

CANVAS:
- Full canvas: 1.0 × 1.0 (all coordinates are 0–1 fractions of 1080px)
- x=0 left, y=0 top, x=1 right, y=1 bottom
- HEADING ZONE: y 0.00–0.17 — keep free of complex elements (heading text placed by app)
- FOOTER ZONE: y 0.83–1.00 — keep free (footer text placed by app)
- CREATIVE ZONE: y 0.17–0.83 — this is your canvas. Fill it with intent.
- Subheading sits at approx y 0.18–0.28 — you MAY overlap with subtle elements but don't obscure text

${PRIMITIVE_SCHEMA}

${BRAND_PALETTE}

${redGuidance}

AVAILABLE ICONS (use EXACT PascalCase names):
${AVAILABLE_ICONS.join(", ")}

OUTPUT: Valid JSON only. No markdown fences. No explanation.
{ "components": [ ...primitive objects... ] }`;

  const user = `CONTENT TO DESIGN:
Heading: "${content.heading}"
Subheading: "${content.subheading}"
Footer: "${content.footer}"

Raw content (mine this for specific data, topics, entities, processes, stats):
${rawContent.slice(0, 2500)}

Design a bold, content-specific layout for this. Think: what type of content is this?
What visual format best communicates it — a process flow? A stat-heavy dashboard? An icon grid with annotations? A before/after split? A radial network? A bold editorial?
Output the layout JSON now.`;

  try {
    const raw = await callLLM(system, user, apiKey, provider, 2000, 0.9);
    const jsonStr = extractJSON(raw);
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed.components)) throw new Error("No components array");
    return { components: parsed.components as ComponentSpec[] };
  } catch {
    return getFallbackLayout(content, isThreат);
  }
}

// ── Fallback layout (used when LLM fails or parsing fails) ───────────────────

function getFallbackLayout(content: GeneratedContent, isThreat: boolean): LayoutSpec {
  const accent = isThreat ? "#D92D20" : "#F97316";
  const icon = isThreat ? "ShieldAlert" : "Sparkles";

  return {
    components: [
      // Background accent container
      { type: "rect", x: 0.04, y: 0.20, w: 0.92, h: 0.58,
        fill: isThreat ? "#0A0F1E" : "#F1F5F9",
        opacity: isThreat ? 0.85 : 0.60, radius: 24 },
      // Top divider accent
      { type: "rect", x: 0.04, y: 0.20, w: 0.92, h: 0.006,
        fill: accent, opacity: 1, radius: 3 },
      // Hero icon
      { type: "icon", cx: 0.5, cy: 0.42, name: icon, size: 0.12,
        color: accent, opacity: 0.9 },
      // Subheading echo label
      { type: "text", x: 0.10, y: 0.58, w: 0.80,
        content: content.subheading || content.heading,
        fontSize: 0.030, fontWeight: "500",
        color: isThreat ? "#F0F4FF" : "#1E1E2E",
        align: "center", opacity: 0.85 },
      // Bottom accent strip
      { type: "rect", x: 0.04, y: 0.775, w: 0.92, h: 0.005,
        fill: "#EC4899", opacity: 0.4, radius: 3 },
    ],
  };
}
