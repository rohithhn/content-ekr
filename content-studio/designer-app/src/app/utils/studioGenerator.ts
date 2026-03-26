/**
 * studioGenerator — AI image generation for the Studio tab.
 *
 * generateImageInstruction()  — v1: fast OpenAI chat model reads content and writes a
 *                               concise creative image instruction automatically.
 *
 * generateStudioImage()       — calls OpenAI Images (GPT Image, from Content Studio model prefs) / Gemini with a
 *                               slot-aware prompt. Returns a data URL or image URL.
 *
 * Spatial slots (match General tab exactly):
 *   Heading:    top 7–17%   of canvas
 *   Subheading: 10–20%      of canvas
 *   Visual:     20–80%      of canvas  ← AI fills this zone
 *   Footer:     80–90%      of canvas
 */

import {
  ENKRYPT_GEMINI_CHAT_MODEL,
  ENKRYPT_OPENAI_FAST_MODEL,
  openAiChatCompletionsExtras,
} from "./llmText";
import { readOpenAiImageModelFromBrowserPrefs } from "../../../../lib/designer-image/openaiImageModelId.js";

export interface StudioGeneratorOptions {
  instruction: string;
  heading: string;
  subheading: string;
  footer: string;
  apiKey: string;
  provider: "openai" | "gemini";
}

// ── Threat detection ─────────────────────────────────────────────────────────

const THREAT_SIGNALS = [
  "attack", "threat", "adversarial", "jailbreak", "prompt injection", "exploit",
  "breach", "vulnerability", "cve", "red team", "red teaming", "malicious", "bypass",
  "evasion", "data poisoning", "poisoning", "backdoor", "compromise", "intrusion",
  "exfiltration", "risk", "danger", "critical", "severe", "high severity", "unsafe",
  "failure mode", "incident", "data leak", "non-compliant", "policy violation",
  "flagged", "blocked", "denied", "attack vector", "zero-day", "ransomware",
];

function detectRed(text: string): boolean {
  return THREAT_SIGNALS.some((s) => text.toLowerCase().includes(s));
}

// ── v1: Auto-generate image instruction from content ──────────────────────────

async function callText(
  system: string, user: string, apiKey: string, provider: "openai" | "gemini"
): Promise<string> {
  const key = apiKey.replace(/[^\x20-\x7E]/g, "").trim();

  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: ENKRYPT_OPENAI_FAST_MODEL,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        max_tokens: 150,
        temperature: 0.85,
        ...openAiChatCompletionsExtras(ENKRYPT_OPENAI_FAST_MODEL),
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: 150, temperature: 0.85 },
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

/**
 * v1: automatically build a creative image instruction from content.
 * One tiny text call — very fast and cheap.
 */
export async function generateImageInstruction(opts: {
  rawContent: string;
  heading: string;
  subheading: string;
  apiKey: string;
  provider: "openai" | "gemini";
}): Promise<string> {
  const system = `You are a creative director. Given content about an AI security topic, write ONE sentence (max 25 words) describing a bold, specific visual illustration to represent it. Be concrete — name shapes, metaphors, diagram types. No generic descriptions.`;
  const user = `Heading: "${opts.heading}"\nSubheading: "${opts.subheading}"\nContent: ${opts.rawContent.slice(0, 800)}`;

  try {
    const result = await callText(system, user, opts.apiKey, opts.provider);
    return result.trim().replace(/^["']|["']$/g, "");
  } catch {
    return `Bold editorial illustration representing: ${opts.heading}`;
  }
}

// ── Image generation prompt ───────────────────────────────────────────────────

function buildPrompt(opts: StudioGeneratorOptions): string {
  const { instruction, heading, subheading, footer } = opts;
  const hasRed = detectRed([instruction, heading, subheading, footer].join(" "));

  const redRule = hasRed
    ? `RED: Use deep red #D92D20 on the specific threat element named in the instruction (attack node, breach indicator, danger badge). Nowhere else.`
    : `RED: No red anywhere. Content has no threat signals.`;

  const bg = hasRed
    ? "Background: deep navy #0A0F1E, full bleed, single layer."
    : "Background: dark near-black #0D0F14 with a very subtle warm gradient, full bleed, single layer.";

  const palette = hasRed
    ? "Primary: orange #F97316. Secondary: electric teal #06B6D4. Labels: near-white #F0F4FF."
    : "Primary: orange #F97316. Secondary: pink #EC4899 or teal #06B6D4. Neutrals: slate #64748B.";

  return `You are a world-class editorial art director creating a 1:1 social media visual for Enkrypt AI, a B2B AI security platform. Quality bar: Wired magazine or MIT Technology Review cover art. Bold, specific, non-generic.

CREATIVE INSTRUCTION (execute this precisely):
"${instruction}"

CONTENT CONTEXT (do NOT render any of this as text — the app overlays text separately):
Heading: "${heading}"
Subheading: "${subheading}"
Footer: "${footer}"

SPATIAL LAYOUT — CRITICAL:
- TOP 20% of canvas: leave mostly clear — heading and subheading text will be overlaid here by the app.
- BOTTOM 20% of canvas: leave mostly clear — footer text will be overlaid here.
- MIDDLE 60% of canvas (20%–80%): this is your creative zone. Fill it with the illustration, diagram, or visual from the instruction. Be bold and specific here.
- The visual can have subtle decorative elements bleeding into the top/bottom zones but must not compete with text legibility there.

STYLE: Flat vector precision OR dark editorial illustration. Clean, professional. No photorealism. Commit fully — no style mixing.

COMPOSITION: Strong focal point in the center zone. Generous padding — nothing touches canvas edges. Real depth: foreground (full opacity) → midground (80%) → background texture (8–12% opacity). One bold creative choice: unexpected scale contrast, diagonal tension, or asymmetric composition.

${bg}

COLOR PALETTE:
${palette}
${redRule}
Green #16A34A only for success/secure/protected states.

RULES:
- Rounded, curved corners on all illustrated containers — no hard rectangular edges
- No border or frame around the image edge
- Do NOT render heading, subheading, footer, URL, or logo as text in the image
- Supporting labels inside the illustration ARE encouraged: stat values, node labels, step numbers, code fragments, badge text
- Aspect ratio: exactly 1:1 square`;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateStudioImage(
  opts: StudioGeneratorOptions
): Promise<string> {
  const prompt = buildPrompt(opts);
  const apiKey = opts.apiKey.replace(/[^\x20-\x7E]/g, "").trim();

  if (opts.provider === "openai") {
    const model = readOpenAiImageModelFromBrowserPrefs();
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "high",
        output_format: "png",
      }),
    });
    if (!res.ok) throw new Error(`OpenAI image generation failed: ${await res.text()}`);
    const data = await res.json();
    const row = data?.data?.[0];
    if (row?.b64_json) return `data:image/png;base64,${row.b64_json}`;
    if (row?.url) return row.url;
    throw new Error("No image data returned from OpenAI");
  }

  if (opts.provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });
    if (!res.ok) throw new Error(`Gemini image generation failed: ${await res.text()}`);
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
    if (!imgPart) throw new Error("No image returned from Gemini");
    return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
  }

  throw new Error("Unsupported provider");
}
