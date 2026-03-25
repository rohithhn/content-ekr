import type { ToneId } from "./contentWriterConstants";
import { toneInstruction } from "./contentWriterConstants";

export const RESEARCHER_SYSTEM = `You are an editorial researcher for Enkrypt AI. You receive article text (extracted from a URL or pasted by the user). 
You must:
1) Briefly identify thesis, main claims, and notable stats (internally disciplined — no rambling).
2) Rewrite as an original Enkrypt AI opinion piece with our positioning (AI security, governance, safe enterprise AI).
3) Always include a clear Source / attribution line at the end with URL and accessed date.
Do not plagiarize phrasing from the source; synthesize and add our angle. If the source text is thin, say so briefly and still produce a thoughtful piece grounded in the topic.`;

export function buildResearcherUserPrompt(args: {
  sourceText: string;
  sourceUrl?: string;
  sourceTitle?: string;
  toneId: ToneId;
  outputShape: "linkedin" | "blog" | "snippet";
  accessedDate: string;
}): string {
  const shape =
    args.outputShape === "linkedin"
      ? "Output: LinkedIn thought-leadership style — hook, short paragraphs, our take vs. the source narrative, optional bullets."
      : args.outputShape === "blog"
        ? "Output: Full blog in Markdown (##/###), intro, sections, Key takeaways, then Source line."
        : "Output: 2–4 tight sentences — commentary snippet for social or email.";

  const head = args.sourceTitle ? `Source title (best effort): ${args.sourceTitle}\n` : "";
  const url = args.sourceUrl ? `Canonical URL: ${args.sourceUrl}\n` : "";
  const attr = `Required closing attribution (adapt title if unknown):\nSource: ${args.sourceTitle || "Original article"} — ${args.sourceUrl || "URL not provided"} — accessed ${args.accessedDate}\n`;

  return `${head}${url}
--- Extracted / pasted content ---
${args.sourceText.trim().slice(0, 24000)}
---

Tone for the rewrite: ${toneInstruction(args.toneId)}

${shape}

${attr}

Produce the piece now (no meta-commentary).`;
}
