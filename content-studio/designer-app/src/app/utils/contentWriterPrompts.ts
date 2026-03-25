import type { ToneId, ContentTypeId } from "./contentWriterConstants";
import { toneInstruction } from "./contentWriterConstants";

export function buildContentWriterUserPrompt(args: {
  topic: string;
  sourceUrl?: string;
  sourceText?: string;
  toneId: ToneId;
  contentType: ContentTypeId;
  lengthId: "short" | "medium" | "long";
  hashtagMode: "off" | "suggest";
  ctaId: "none" | "website" | "demo" | "blog";
  emojiRule: string;
  seoKeywords?: string;
}): string {
  const lengthGuide =
    args.lengthId === "short"
      ? "Keep it short (roughly 150–350 words for prose; thread 3–5 tweets)."
      : args.lengthId === "medium"
        ? "Medium length (roughly 400–800 words; thread 6–10 tweets)."
        : "Long form (roughly 900–1500+ words for blog; generous thread if thread format).";

  const ctaLine =
    args.ctaId === "none"
      ? "Do not add a promotional CTA line."
      : args.ctaId === "website"
        ? "End with a soft CTA to visit the Enkrypt AI website."
        : args.ctaId === "demo"
          ? "End with a CTA to book a demo / talk to the team."
          : "End with a CTA to read more on the Enkrypt blog.";

  const hashtagLine =
    args.hashtagMode === "off"
      ? "Do not include hashtags."
      : "Add a final line with 5–10 relevant hashtags (platform-appropriate).";

  let formatInstructions = "";
  if (args.contentType === "linkedin") {
    formatInstructions = `Format: LinkedIn post. Strong opening line, short paragraphs, optional bullet list if it helps. ${args.emojiRule}`;
  } else if (args.contentType === "twitter") {
    formatInstructions = `Format: Twitter/X thread. Label each tweet clearly as "Tweet 1:", "Tweet 2:", etc. Respect ~260 characters per tweet (aim safe under 280). ${args.emojiRule}`;
  } else {
    formatInstructions = `Format: Full blog post in Markdown with ## and ### headings, intro, body sections, and a "## Key takeaways" section with bullets. ${args.emojiRule}
SEO: Naturally weave in these keywords where they fit (no stuffing): ${args.seoKeywords?.trim() || "(none specified — pick sensible terms from the topic)"}
After the main post, add these sections exactly with these headings:
## Meta description
One line, <= 160 characters, compelling.
## Social share snippet
2–3 sentences with a hook for social cards.
## Hashtags (optional)
Only if hashtag mode is on; otherwise write "None."`;
  }

  const sourceBlock =
    args.sourceText?.trim()
      ? `\n--- Optional source text (from URL or paste; may be truncated) ---\n${args.sourceText.trim().slice(0, 14000)}\n`
      : "";
  const urlNote = args.sourceUrl ? `\nContext URL (for your reference only; you only have the extracted text above if any): ${args.sourceUrl}\n` : "";

  return `Create content for Enkrypt AI.

Topic / focus:
${args.topic.trim() || "(derive from source text if topic empty)"}

Tone: ${toneInstruction(args.toneId)}
${lengthGuide}
${ctaLine}
Hashtags: ${hashtagLine}

${formatInstructions}
${sourceBlock}${urlNote}

Output only the deliverable content (and the extra sections for blog as specified). No preamble.`;
}
