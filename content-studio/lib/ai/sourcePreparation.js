import Anthropic from "@anthropic-ai/sdk";

export const PREPARE_SOURCE_MODEL = "claude-sonnet-4-20250514";

const PREPARE_SYSTEM = `You are a senior editor preparing source material for a multi-channel content studio (LinkedIn, Twitter/X, blog, long articles, landing pages, HTML video).
Output ONE plain-text brief the downstream AI will use as its primary factual source for writing channel-specific copy.

Rules:
- Preserve facts, names, numbers, and quotes accurately. Do not invent details.
- Use markdown sections: ## Summary (2–4 sentences), ## Key points (5–12 bullets), ## Audience & angle, ## Channel notes (one short paragraph or bullets per target channel), ## Visual direction (only if image generation is planned — concrete scenes, metaphors, diagrams; avoid generic stock imagery).
- Channel notes should reflect format constraints (e.g. Twitter length, LinkedIn professional tone, blog SEO depth, landing conversion sections, HTML video = scene-by-scene beats for a 1280×720 auto-play single-file demo).
- Do not write final platform posts here — only the structured brief.`;

/**
 * @param {object} p
 * @param {string} p.apiKey
 * @param {string} p.articleText
 * @param {string} [p.title]
 * @param {string[]} [p.channels]
 * @param {string|null} [p.templateId]
 * @param {boolean} [p.willGenerateImages]
 */
export async function prepareSourceWithClaude({
  apiKey,
  articleText,
  title = "",
  channels = [],
  templateId = null,
  willGenerateImages = true,
}) {
  const client = new Anthropic({ apiKey });
  const chList = channels.length ? channels.join(", ") : "not specified — cover common marketing channels";
  const user = `## Source title\n${title || "(untitled)"}\n\n## Target channels\n${chList}\n\n## Template\n${templateId || "none"}\n\n## Image / visual generation planned\n${willGenerateImages ? "yes — include ## Visual direction" : "no — omit ## Visual direction or keep it minimal"}\n\n## Full source text\n${String(articleText || "").slice(0, 180000)}`;

  const msg = await client.messages.create({
    model: PREPARE_SOURCE_MODEL,
    max_tokens: 8192,
    system: PREPARE_SYSTEM,
    messages: [{ role: "user", content: user }],
  });

  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return { preparedInput: text.trim(), model: msg.model };
}

/**
 * @param {object} p
 * @param {string} p.apiKey
 * @param {string} p.base64 — raw base64 (no data: prefix)
 * @param {string} p.mediaType — e.g. image/jpeg
 * @param {string} p.fileName
 * @param {string[]} [p.channels]
 * @param {string|null} [p.templateId]
 * @param {boolean} [p.willGenerateImages]
 */
export async function prepareSourceFromImage({
  apiKey,
  base64,
  mediaType,
  fileName,
  channels = [],
  templateId = null,
  willGenerateImages = true,
}) {
  const client = new Anthropic({ apiKey });
  const chList = channels.length ? channels.join(", ") : "not specified";
  const userText = `File: ${fileName}
Target channels: ${chList}
Template id: ${templateId || "none"}
Visual assets will be generated for this project: ${willGenerateImages ? "yes" : "no"}

Instructions:
1) Transcribe all readable text in the image.
2) Describe charts, diagrams, UI, or product shots factually.
3) Then output the same structured brief format as required in your system instructions (Summary, Key points, Audience & angle, Channel notes, and Visual direction if applicable).`;

  const msg = await client.messages.create({
    model: PREPARE_SOURCE_MODEL,
    max_tokens: 8192,
    system: PREPARE_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64 },
          },
          { type: "text", text: userText },
        ],
      },
    ],
  });

  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return { preparedInput: text.trim(), model: msg.model };
}

/**
 * Send PDF bytes to Claude as a document when text extraction is weak.
 * @param {object} p
 * @param {string} p.apiKey
 * @param {string} p.pdfBase64
 * @param {string[]} [p.channels]
 * @param {string|null} [p.templateId]
 * @param {boolean} [p.willGenerateImages]
 * @param {string} [p.fileName]
 */
export async function prepareSourceFromPdfDocument({
  apiKey,
  pdfBase64,
  channels = [],
  templateId = null,
  willGenerateImages = true,
  fileName = "document.pdf",
}) {
  const client = new Anthropic({ apiKey });
  const chList = channels.length ? channels.join(", ") : "not specified";
  const userText = `PDF file name: ${fileName}
Target channels: ${chList}
Template id: ${templateId || "none"}
Visual generation planned: ${willGenerateImages ? "yes" : "no"}

Read the attached PDF and produce the structured editorial brief per your system instructions.`;

  const msg = await client.messages.create({
    model: PREPARE_SOURCE_MODEL,
    max_tokens: 8192,
    system: PREPARE_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          { type: "text", text: userText },
        ],
      },
    ],
  });

  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  return { preparedInput: text.trim(), model: msg.model };
}
