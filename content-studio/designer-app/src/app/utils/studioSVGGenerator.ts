/**
 * studioSVGGenerator — two-step SVG engine for the Studio tab.
 *
 * Step 1: generateLayoutPrompt()
 *   GPT-4o-mini analyses the content and writes a precise creative brief:
 *   visual format, composition, color story, key elements to draw.
 *
 * Step 2: generateVisualSVG()
 *   A second GPT-4o-mini call executes the brief as SVG code.
 *   Full color freedom — any hex, linear/radial gradients allowed.
 *   fabric.loadSVGFromString() parses it into editable objects.
 *
 * Both are text-API calls (fast OpenAI model from `llmText`) — cheap, no image API needed.
 */

import type { GeneratedContent } from "./studioLayoutGenerator";
import {
  ENKRYPT_GEMINI_CHAT_MODEL,
  ENKRYPT_OPENAI_FAST_MODEL,
  openAiChatCompletionsExtras,
} from "./llmText";

// ── Visual slot constants ─────────────────────────────────────────────────────

/** Canvas resolution (px) */
export const CANVAS_RES = 1080;

/**
 * Y pixel where the visual zone starts (below subheading).
 * Subheading at y=0.175 * 1080 = 189px, fontSize 44px → bottom ~240px + gap.
 */
export const SVG_SLOT_Y = 260;

/** Y pixel where the visual zone ends (above footer at y=0.855 * 1080 = 923px) */
export const SVG_SLOT_Y_END = 895;

/** Height of the visual zone */
export const SVG_SLOT_H = SVG_SLOT_Y_END - SVG_SLOT_Y; // 635px

/** Width of the visual zone (full canvas width) */
export const SVG_SLOT_W = CANVAS_RES; // 1080px

// ── Threat detection ─────────────────────────────────────────────────────────

const THREAT_SIGNALS = [
  "attack", "threat", "adversarial", "jailbreak", "prompt injection", "exploit",
  "breach", "vulnerability", "cve", "red team", "red teaming", "malicious",
  "bypass", "evasion", "poisoning", "backdoor", "compromise", "intrusion",
  "exfiltration", "risk", "danger", "critical", "severe", "high severity",
  "unsafe", "incident", "data leak", "zero-day", "ransomware",
];

function hasThreat(text: string): boolean {
  const lower = text.toLowerCase();
  return THREAT_SIGNALS.some((s) => lower.includes(s));
}

// ── LLM helper ───────────────────────────────────────────────────────────────

async function callLLM(
  system: string,
  user: string,
  apiKey: string,
  provider: "openai" | "gemini",
  maxTokens: number,
  temperature = 0.85
): Promise<string> {
  const key = apiKey.replace(/[^\x20-\x7E]/g, "").trim();

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: ENKRYPT_OPENAI_FAST_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
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
      system_instruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ── SVG extraction ───────────────────────────────────────────────────────────

function extractSVG(raw: string): string {
  const fenced = raw.match(/```(?:svg|xml)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf("<svg");
  const end = raw.lastIndexOf("</svg>");
  if (start !== -1 && end !== -1) return raw.slice(start, end + 6);
  return raw.trim();
}

// ── Step 1: Layout prompt generation ─────────────────────────────────────────

const LAYOUT_PROMPT_SYSTEM = `You are a senior creative director and visual strategist for a B2B tech brand (Enkrypt AI — AI security platform).

Your job: read the content below and write a PRECISE, DETAILED visual design brief that a graphic designer will use to create an SVG illustration.

The illustration fits in a ${SVG_SLOT_W}×${SVG_SLOT_H}px slot on a branded 1:1 social post. The heading and subheading are already overlaid by the app — you design the visual body only.

Output a concise creative brief with these sections:

VISUAL FORMAT: [one of: network-diagram / stat-dashboard / process-flow / timeline / comparison-split / icon-cluster / architectural-layers / data-viz / editorial-hero / custom]
COMPOSITION: [describe layout — what goes where, dominant hero, secondary elements, spatial rhythm]
COLOR STORY: [specific hex colors for background fills, hero elements, accents, labels — full creative freedom, can use any colors including gradients. Base on brand palette but go further if content demands it. Enkrypt brand: #F97316 orange, #EC4899 pink, #06B6D4 teal, #7C3AED violet, #F59E0B amber, #0A0F1E navy, #0D0F14 near-black, #64748B slate. Red #D92D20 only for threat elements.]
KEY ELEMENTS: [bullet list of specific shapes, labels, numbers, icons-as-paths, connectors to draw — be specific, mine the actual content for real data/stats/names]
VISUAL DEPTH: [how to layer: background → midground → hero → labels, opacity levels]
BOLD CHOICE: [one unexpected compositional or stylistic decision that makes it memorable]
GRADIENT USAGE: [optional — describe any gradient fills: direction, colors, where applied]`;

export async function generateLayoutPrompt(opts: {
  rawContent: string;
  content: GeneratedContent;
  instruction: string;
  apiKey: string;
  provider: "openai" | "gemini";
  isThreat: boolean;
}): Promise<string> {
  const { rawContent, content, instruction, apiKey, provider, isThreat } = opts;

  const threatNote = isThreat
    ? `\nNOTE: Content has threat/security-risk signals. Include #D92D20 red on specific threat elements (attack nodes, danger labels, breach indicators) only.`
    : `\nNOTE: No threat signals. Do not use red.`;

  const userInstruction = instruction.trim()
    ? `\nUSER DIRECTION: "${instruction}" — honour this in your brief.`
    : "";

  const user = `CONTENT TO DESIGN:
Heading: "${content.heading}"
Subheading: "${content.subheading}"
Footer: "${content.footer}"

Raw content (extract specific stats, entities, process steps, counts, terminology — use them as real labels):
${rawContent.slice(0, 2500)}
${threatNote}${userInstruction}

Write the visual design brief now.`;

  return callLLM(LAYOUT_PROMPT_SYSTEM, user, apiKey, provider, 600, 0.8);
}

// ── Step 2: SVG generation from brief ────────────────────────────────────────

const SVG_TECHNICAL_RULES = `SVG TECHNICAL RULES (strict — fabric.js parses this):
- Output ONLY the SVG element. No markdown, no explanation, no comments outside SVG.
- Root element: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_SLOT_W} ${SVG_SLOT_H}">
- <defs> is allowed ONLY for gradients: <linearGradient> and <radialGradient>. Nothing else in <defs>.
- Forbidden in <defs>: filter, clipPath, mask, pattern, symbol, marker.
- Allowed shape elements: <rect> <circle> <ellipse> <line> <polyline> <polygon> <path> <text> <tspan> <g>
- All fill/stroke as direct element attributes — NOT inline style="" or CSS classes.
- Gradient fills: fill="url(#myGradId)" where #myGradId is defined in <defs>. Give each gradient a unique id.
- Opacity: use the opacity attribute (0.0–1.0). Also fill-opacity and stroke-opacity are fine.
- Text: font-family="Inter, sans-serif" with font-size, font-weight, text-anchor as SVG attributes.
- Arrowheads: draw manually as a filled <path> triangle — no <marker> (it requires <defs> with filter-like semantics fabric ignores).
  Example arrowhead: <path d="M 500 300 L 488 288 L 488 312 Z" fill="#color"/>
- <use> is NOT allowed.
- NO background rect covering the full canvas (the app's background image shows through).
- Minimum 15 elements, aim for 25–50 for richness.`;

export async function generateVisualSVG(opts: {
  rawContent: string;
  content: GeneratedContent;
  layoutPrompt: string;
  apiKey: string;
  provider: "openai" | "gemini";
  isThreat: boolean;
}): Promise<string> {
  const { rawContent, content, layoutPrompt, apiKey, provider, isThreat } = opts;

  const system = `You are a world-class SVG engineer and graphic designer executing a precise creative brief for Enkrypt AI.
This SVG renders in the visual slot (${SVG_SLOT_W}×${SVG_SLOT_H}px) of a 1080×1080 branded social post.
The heading, subheading, and footer text are overlaid separately by the app — draw the VISUAL BODY only.

${SVG_TECHNICAL_RULES}

COMPOSITION PRINCIPLES:
- Fill the entire viewBox intentionally — no dead empty center, no wasted space.
- Genuine visual hierarchy: one dominant hero element, supporting at varied scale.
- Layer depth: large low-opacity background shapes first → midground structure → hero → precise labels on top.
- Use <g> to group logically related elements (e.g., one network node = <circle> + <text> label inside <g>).
- Pull REAL data from the content: actual numbers, names, step labels — not placeholder text.
- Bold creative execution: extreme scale contrast, diagonal accents, or asymmetric composition.

COLOR FREEDOM: Any hex colors. Gradients encouraged for hero elements and background fills.
${isThreat ? "RED RULE: Use #D92D20 on threat-specific elements (attack nodes, breach indicators, danger badges) — surgical use only." : "RED RULE: No red (#D92D20) anywhere."}`;

  const user = `CREATIVE BRIEF TO EXECUTE:
${layoutPrompt}

CONTENT REFERENCE:
Heading: "${content.heading}"
Subheading: "${content.subheading}"
Raw content: ${rawContent.slice(0, 1500)}

Generate the SVG now. Output ONLY the <svg> element.`;

  try {
    const raw = await callLLM(system, user, apiKey, provider, 4000, 0.9);
    const svg = extractSVG(raw);
    if (!svg.startsWith("<svg")) throw new Error("LLM did not return valid SVG");
    return svg;
  } catch (err) {
    console.error("[studioSVGGenerator] SVG generation failed:", err);
    return getFallbackSVG(isThreat, content);
  }
}

// ── Fallback SVG ──────────────────────────────────────────────────────────────

function getFallbackSVG(isThreat: boolean, content: GeneratedContent): string {
  const accent = isThreat ? "#D92D20" : "#F97316";
  const bg = isThreat ? "#0A0F1E" : "#0D0F14";
  const text = content.subheading.slice(0, 60);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_SLOT_W} ${SVG_SLOT_H}">
  <defs>
    <linearGradient id="fb-g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#EC4899" stop-opacity="0.08"/>
    </linearGradient>
  </defs>
  <rect x="40" y="30" width="1000" height="575" rx="28" fill="${bg}" opacity="0.82"/>
  <rect x="40" y="30" width="1000" height="575" rx="28" fill="url(#fb-g)"/>
  <rect x="40" y="30" width="1000" height="7" rx="3.5" fill="${accent}"/>
  <rect x="40" y="598" width="1000" height="5" rx="2.5" fill="#EC4899" opacity="0.45"/>
  <circle cx="540" cy="270" r="120" fill="${accent}" opacity="0.07"/>
  <circle cx="540" cy="270" r="78" fill="${accent}" opacity="0.12"/>
  <circle cx="540" cy="270" r="42" fill="${accent}" opacity="0.92"/>
  <line x1="170" y1="275" x2="455" y2="275" stroke="${accent}" stroke-width="2" opacity="0.28"/>
  <line x1="625" y1="275" x2="910" y2="275" stroke="${accent}" stroke-width="2" opacity="0.28"/>
  <circle cx="170" cy="275" r="6" fill="${accent}" opacity="0.5"/>
  <circle cx="910" cy="275" r="6" fill="${accent}" opacity="0.5"/>
  <text x="540" y="440" font-family="Inter, sans-serif" font-size="26" font-weight="500" fill="#FFFFFF" opacity="0.75" text-anchor="middle">${text}</text>
</svg>`;
}
