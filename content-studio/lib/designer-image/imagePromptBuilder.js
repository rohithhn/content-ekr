/**
 * Mirrors designer-app/src/app/utils/imagePromptBuilder.ts — keep prompts identical.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  ENKRYPT_ANTHROPIC_CHAT_MODEL,
  ENKRYPT_GEMINI_CHAT_MODEL,
  ENKRYPT_OPENAI_CHAT_MODEL,
  openAiChatCompletionsExtras,
} from "./llmConstants";

const THREAT_SIGNALS = [
  "attack", "threat", "adversarial", "jailbreak", "prompt injection", "exploit",
  "breach", "vulnerability", "cve", "red team", "red teaming", "malicious", "bypass",
  "evasion", "data poisoning", "poisoning", "backdoor", "compromise", "intrusion",
  "exfiltration", "risk", "danger", "critical", "severe", "high severity", "unsafe",
  "failure mode", "incident", "data leak", "non-compliant", "policy violation",
  "flagged", "blocked", "denied", "attack vector", "zero-day", "ransomware",
];

function detectRedSignal(text) {
  const lower = text.toLowerCase();
  return THREAT_SIGNALS.some((s) => lower.includes(s));
}

export function getFallbackVisualBrief(content) {
  const allText = [content.heading, content.subheading, content.footer].join(" ");
  const hasRed = detectRedSignal(allText);

  const redDecision = hasRed
    ? "RED DECISION: ACTIVE — apply red #D92D20 to: the primary threat or danger element in the visual (attack node, warning badge, or compromised component)"
    : "RED DECISION: INACTIVE — do NOT use red anywhere in this image";

  const topic = content.heading || content.subheading || "the topic";
  const visualType = hasRed ? "dark-technical" : "diagram-illustration";
  const bg = hasRed ? "deep navy #0A0F1E" : "warm off-white #FAF9F7";
  const textColor = hasRed ? "cool white #F0F4FF" : "near-black #1E1E2E";
  const style = hasRed ? "dark-editorial" : "flat-vector-precise";

  return `VISUAL TYPE: ${visualType}
${redDecision}
COMPOSITION: Central hero element at 2× scale occupying left 60% of canvas. Supporting elements stacked right column (40%). Depth: foreground sharp full opacity, background subtle geometric texture at 10% opacity. Creative surprise: hero element slightly off-center, bleeding toward upper edge for tension.
SUBJECT: Professional visual representing "${topic}" — use domain-specific artefacts (icons, diagrams, or illustrated elements) relevant to the topic. No generic placeholder imagery.
STYLE: ${style}
PALETTE: Background ${bg}. Primary accent orange #F97316. Secondary pink #EC4899. Neutrals gray #64748B. Text ${textColor}. ${hasRed ? "Red #D92D20 scoped to threat element only." : "No red."}
SUPPORTING TEXT: 2–4 ultra-short diagram labels (2–5 words each, e.g. step numbers, stat chips, axis names) — never the post headline or subtitle as a hero title.`;
}

export async function buildVisualBrief(rawContent, content, apiKey, provider) {
  const trimmed = rawContent?.trim() ?? "";
  if (!trimmed) return getFallbackVisualBrief(content);

  const prompt = `You are a world-class art director creating a structured visual brief for an AI image generator. Quality bar: Wired magazine, MIT Technology Review. Safe and generic is failure.

STEP 1 — RED SIGNAL SCAN (do this first, before any creative decisions):
Scan the content below for ANY of these signals:
• Threat/attack: attack, threat, adversarial, jailbreak, prompt injection, exploit, breach, vulnerability, CVE, red team, red teaming, malicious, bypass, evasion, data poisoning, backdoor, compromise, intrusion, exfiltration, zero-day, ransomware, attack vector
• Risk/danger: risk, danger, critical, severe, high severity, unsafe, failure mode, incident, data leak, non-compliant, policy violation, flagged, blocked, denied
• Structural signals (even without explicit words): describes an attack scenario (hypothetically or not), before/after where "before" = broken/unsafe state, security audit findings with gaps, model failure/jailbreak rates

If ANY signal found → RED DECISION: ACTIVE — name the exact visual element(s) that represent the threat
If NO signals → RED DECISION: INACTIVE — do NOT use red anywhere

STEP 2 — OUTPUT the brief in this exact format. All 7 fields are mandatory. Be specific — vague = bad output.

VISUAL TYPE: [choose the most expressive format for this content:
  diagram-illustration = technical process, architecture, attack flow, pipeline — hybrid of diagram precision + illustration polish
  editorial-illustration = thought leadership, strategy, concept, opinion — bold abstract shapes, magazine-cover energy
  abstract-illustration = brand moment, pure concept — form + color + mood, no literal subject
  icon-diagram = multi-step process, feature list, comparison — icons as heroes with strong spatial logic
  data-visualization = stats, metrics, benchmarks, reports — data IS the subject
  dark-technical = security threat, cyber, risk dashboard — near-black BG, glowing accents, terminal aesthetic
  product-ui = UI feature, demo, component — partial screen fragments, device frames]

RED DECISION: [ACTIVE — apply red #D92D20 to: {exact element names, e.g. "the attack node in the network diagram, the terminal line showing the malicious prompt"} | INACTIVE — do NOT use red anywhere in this image]

COMPOSITION: [Focal point: what the eye hits first and why] + [Zone layout: e.g. "Left 60%: main illustration. Right 40%: 3 stacked callouts."] + [Depth layers: foreground / midground at 80% opacity / background texture at 10%] + [Creative surprise: ONE unexpected choice — e.g. "hero element at 3× scale of others", "diagonal composition — no horizontal axis", "single element floating in 65% negative space", "main form bleeds off top-right edge", "network nodes arranged in shape of a shield"]

SUBJECT: [Name specific domain artefacts — no category words. "padlock with hairline crack" not "security icon." "neural network with glowing red attack node and terminal showing [IGNORE PREVIOUS INSTRUCTIONS]" not "AI diagram." For threat content: make the threat element visually present and named — do not abstract it away.]

STYLE: [ONE style — commit fully:
  flat-vector-precise | dark-editorial | bold-color-block | editorial-illustration | glassmorphism | isometric-precision | cinematic-duotone | abstract-geometric]

PALETTE: [Specify every slot:
  Background: [warm off-white #FAF9F7 | cool off-white #F8F9FB | deep navy #0A0F1E | near-black #0D0F14 | deep teal #0F2A2A | soft slate #F1F5F9]
  Primary accent: orange #F97316 (or brand pink #EC4899 if pink-led theme)
  Secondary accent: [pink #EC4899 | electric teal #06B6D4 | violet #7C3AED | amber #F59E0B — pick one that fits content mood]
  Neutrals: gray #64748B
  Text/labels: [near-black #1E1E2E for light BG | cool white #F0F4FF for dark BG]
  Red scope: [red #D92D20 on {element} only | no red]
  Green #16A34A only for: [success/secure/approved element name | not used]]

SUPPORTING TEXT: [Specific text to render in the image — be precise:
  e.g. "CVE-2024-XXXX badge in red", "terminal line: [IGNORE PREVIOUS INSTRUCTIONS] in red text", "'94% detection rate' stat with green upward arrow", "step labels: 1. Detect 2. Analyze 3. Block", "COMPROMISED / PROTECTED status labels on respective panels"]

Do NOT include the heading, subheading, or footer text (from EXTRACTED fields below) in SUPPORTING TEXT or as implied hero/title copy — they are displayed by the app separately and must not be echoed into the image layer.
Output ONLY the brief. Start immediately with "VISUAL TYPE:" — no preamble, no explanation.

---
USER'S CONTENT:
${trimmed.slice(0, 3000)}

EXTRACTED HEADING: ${content.heading}
EXTRACTED SUBHEADING: ${content.subheading}
EXTRACTED FOOTER: ${content.footer}
---`;

  const key = apiKey.replace(/[^\x20-\x7E]/g, "").trim();

  try {
    if (provider === "claude") {
      const client = new Anthropic({ apiKey: key });
      const msg = await client.messages.create({
        model: ENKRYPT_ANTHROPIC_CHAT_MODEL,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      });
      const text = msg.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return text && text.length > 20 ? text : getFallbackVisualBrief(content);
    }

    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: ENKRYPT_OPENAI_CHAT_MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.75,
          max_tokens: 700,
          ...openAiChatCompletionsExtras(ENKRYPT_OPENAI_CHAT_MODEL),
        }),
      });
      if (!res.ok) return getFallbackVisualBrief(content);
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim();
      return text && text.length > 20 ? text : getFallbackVisualBrief(content);
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 700 },
        }),
      }
    );
    if (!res.ok) return getFallbackVisualBrief(content);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text && text.length > 20 ? text : getFallbackVisualBrief(content);
  } catch {
    return getFallbackVisualBrief(content);
  }
}

export function buildContentAndVisualBlock(content, visualBrief, omitContentTextInImage) {
  const contentSummary = `Heading: "${content.heading}". Subheading: "${content.subheading}". Footer: "${content.footer}".`;

  let redInstruction = "";
  if (visualBrief) {
    const match = visualBrief.match(/RED DECISION:\s*(.+?)(?:\n|$)/i);
    if (match) {
      const decision = match[1].trim();
      redInstruction = `\n⚑ RED COLOR INSTRUCTION (mandatory — override any defaults): ${decision}\n`;
    }
  }

  if (omitContentTextInImage) {
    const direction = visualBrief
      ? `${redInstruction}\nVISUAL BRIEF (follow every field precisely — VISUAL TYPE, COMPOSITION, SUBJECT, STYLE, PALETTE, SUPPORTING TEXT are all instructions, not suggestions):\n${visualBrief}`
      : "\n\nCreate a supporting visual that communicates this topic. Use clear visual elements (icons, diagram, or illustration) that support the message.";
    /* Do not inject Heading/Subheading/Footer strings here — the image model copies them as titles.
       Topic semantics already flow through the VISUAL BRIEF (art-director step) and layout rules. */
    return `*** SUPPORTING BITMAP ONLY — TEXT LAYERS ARE OUTSIDE THIS IMAGE ***
The app composites the post headline, subheading, and CTA as separate text on top of your artwork. This PNG is only the illustration/diagram layer.

*** HARD RULES ***
- Do NOT render the post's headline, subheading, or footer as text anywhere in the image (no large titles, no subtitle lines, no CTA strip that repeats them, no verbatim quote of those strings).
- Do NOT use headline-sized typography for any phrase that matches the main post copy.
- ALLOW: short diagram labels, stats, badges, step numbers, code snippets, axis labels, and other secondary annotations described in the VISUAL BRIEF — as long as they are clearly not the three main text fields.${direction}`;
  }

  const direction = visualBrief
    ? `${redInstruction}\nVISUAL BRIEF (follow every field precisely):\n${visualBrief}`
    : "";
  return `CONTENT TO FEATURE IN THE IMAGE (must appear as text):\n${contentSummary}\n\nGenerate a visual that renders the heading, subheading, and footer as clear text and includes supporting visuals.${direction}`;
}
