/** Aligned with `.cursor/skills/enkrypt-content-writer/SKILL.md` — keep prompts in sync when the skill changes. */

export const ENKRYPT_BRAND_VOICE_SYSTEM = `You write on behalf of Enkrypt AI, an AI security company. Voice rules:
- Clarity over jargon; explain security simply unless the user asks for technical depth.
- Trustworthy and precise — no fabricated stats, customers, or certifications.
- Calm urgency for real risks; avoid fear-mongering.
- Differentiation: emphasize safe, observable, enterprise-grade AI use (governance, hooks, auditability) where relevant.
Do not claim to have read live web pages unless the user pasted the text.`;

export const TONE_PRESETS = [
  { id: "thought_leadership", label: "Thought leadership", emoji: "🎯", hint: "Authoritative, forward-looking, industry insights" },
  { id: "awareness", label: "Awareness", emoji: "📢", hint: "Accessible, problem-focused, educational" },
  { id: "product_launch", label: "Product launch", emoji: "🚀", hint: "Feature-focused, exciting, CTA-driven" },
  { id: "technical", label: "Technical deep-dive", emoji: "🔬", hint: "Detailed, developer audience, examples" },
  { id: "data_research", label: "Data / research", emoji: "📊", hint: "Stat-driven, benchmark-friendly structure" },
] as const;

export type ToneId = (typeof TONE_PRESETS)[number]["id"];

export function toneInstruction(toneId: ToneId): string {
  const map: Record<ToneId, string> = {
    thought_leadership: "Write with authoritative, forward-looking thought leadership.",
    awareness: "Write in an accessible, educational tone focused on the reader's problems.",
    product_launch: "Write with energy about product value; strong, honest CTA.",
    technical: "Write for technical readers; precision, examples, optional short code snippets if useful.",
    data_research: "Lead with numbers and benchmarks where sensible; structured, scannable lists.",
  };
  return map[toneId];
}

export const CONTENT_TYPES = [
  { id: "linkedin", label: "LinkedIn post" },
  { id: "blog", label: "Blog post" },
  { id: "twitter", label: "Twitter / X thread" },
] as const;

export type ContentTypeId = (typeof CONTENT_TYPES)[number]["id"];

export const LENGTH_OPTIONS = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "long", label: "Long" },
] as const;

export const CTA_OPTIONS = [
  { id: "none", label: "No CTA" },
  { id: "website", label: "Visit website" },
  { id: "demo", label: "Book a demo" },
  { id: "blog", label: "Read our blog" },
] as const;

export const EMOJI_DENSITY = [
  { id: "none", label: "None", rule: "Use no emojis." },
  { id: "low", label: "Low", rule: "At most 1–2 emojis in the whole piece." },
  { id: "medium", label: "Medium", rule: "Sparse emojis for emphasis only (several across the piece)." },
] as const;

export const HASHTAG_MODES = [
  { id: "off", label: "Off" },
  { id: "suggest", label: "Suggest hashtags" },
] as const;
