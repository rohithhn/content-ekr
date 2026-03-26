/**
 * AI Orchestration Client
 *
 * Handles all communication with the API routes from the frontend.
 * Supports client-supplied API keys forwarded via request headers.
 */

const KEY_HEADERS = {
  anthropic_key: "x-anthropic-key",
  openai_key: "x-openai-key",
  nanobanana_key: "x-nanobanana-key",
  kling_key: "x-kling-key",
};

function trimKey(v) {
  if (v == null || typeof v !== "string") return "";
  return v.replace(/[^\x20-\x7E]/g, "").trim();
}

function buildHeaders(apiKeys = {}) {
  const headers = { "Content-Type": "application/json" };
  for (const [field, headerName] of Object.entries(KEY_HEADERS)) {
    const t = trimKey(apiKeys[field]);
    if (t) headers[headerName] = t;
  }
  return headers;
}

export async function generateText({
  input,
  channel,
  templateId,
  brand,
  numVariants = 1,
  tone = "Professional",
  stream = false,
  apiKeys = {},
  textModel,
}) {
  const response = await fetch("/api/generate/text", {
    method: "POST",
    headers: buildHeaders(apiKeys),
    body: JSON.stringify({
      input,
      channel,
      templateId,
      brand,
      numVariants,
      tone,
      stream,
      ...(textModel ? { textModel } : {}),
    }),
  });

  if (stream) return response;

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Text generation failed");
  }

  return response.json();
}

/**
 * Revise existing landing `<section>…</section>` HTML from natural-language instructions.
 * Uses POST /api/generate/text with `landingRevise` (single-shot, no creative-brief phase).
 */
export async function reviseLandingPage({
  sectionsHtml,
  instructions,
  templateId = null,
  brand,
  numVariants = 1,
  tone = "Professional",
  stream = false,
  apiKeys = {},
  textModel,
}) {
  const response = await fetch("/api/generate/text", {
    method: "POST",
    headers: buildHeaders(apiKeys),
    body: JSON.stringify({
      input: "(landing revise)",
      channel: "landing",
      templateId,
      brand,
      numVariants,
      tone,
      stream,
      landingRevise: { sectionsHtml, instructions },
      ...(textModel ? { textModel } : {}),
    }),
  });

  if (stream) return response;

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Landing revise failed");
  }

  return response.json();
}

/**
 * Designer LeftPanel-equivalent: LLM returns JSON { heading, subheading, footer }.
 * Uses /api/generate/designer-structure (same prompt stack as designer-app).
 */
export async function generateDesignerStructure({
  rawContent,
  themeId = "none",
  postSizeId = "1080x1080",
  designerWhiteBg = false,
  customInstructions = "",
  brand = null,
  apiKeys = {},
}) {
  const response = await fetch("/api/generate/designer-structure", {
    method: "POST",
    headers: buildHeaders(apiKeys),
    body: JSON.stringify({
      rawContent,
      themeId,
      postSizeId,
      designerWhiteBg: !!designerWhiteBg,
      customInstructions,
      brand,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Designer structure generation failed");
  }

  return response.json();
}

export async function generateImage({
  channel,
  slot,
  brand,
  contentSummary,
  provider = "openai",
  numVariants = 1,
  apiKeys = {},
  /** Pass-through to /api/generate/image: postSizeId, designerWhiteBg, designerThemeId, designerImage, etc. */
  designerOptions = {},
}) {
  const response = await fetch("/api/generate/image", {
    method: "POST",
    headers: buildHeaders(apiKeys),
    body: JSON.stringify({
      channel,
      slot,
      brand,
      contentSummary,
      provider,
      numVariants,
      ...designerOptions,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Image generation failed");
  }

  return response.json();
}

export async function parseUrl(url, apiKeys = {}) {
  const response = await fetch("/api/url-parse", {
    method: "POST",
    headers: buildHeaders(apiKeys),
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "URL parsing failed");
  }

  return response.json();
}

/** Headers for multipart (omit Content-Type so the browser sets the boundary). */
function buildHeadersMultipart(apiKeys = {}) {
  const headers = {};
  const ak = trimKey(apiKeys.anthropic_key);
  const ok = trimKey(apiKeys.openai_key);
  if (ak) headers["x-anthropic-key"] = ak;
  if (ok) headers["x-openai-key"] = ok;
  return headers;
}

/**
 * Claude: article → channel-aware brief (after URL extraction or long paste).
 */
export async function prepareSourceArticle({
  title,
  content,
  channels = [],
  templateId = null,
  willGenerateImages = true,
  apiKeys = {},
}) {
  const response = await fetch("/api/prepare-source", {
    method: "POST",
    headers: buildHeaders(apiKeys),
    body: JSON.stringify({
      title: title != null ? String(title) : "",
      content: String(content || ""),
      channels,
      templateId,
      willGenerateImages: !!willGenerateImages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Source preparation failed");
  }

  return response.json();
}

/**
 * Claude: PDF / DOCX / image → same brief format (multipart FormData).
 */
export async function analyzeUploadedFile(formData, apiKeys = {}) {
  const response = await fetch("/api/analyze-file", {
    method: "POST",
    headers: buildHeadersMultipart(apiKeys),
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "File analysis failed");
  }

  return response.json();
}

export async function generateVideo({
  prompt,
  duration = 10,
  aspectRatio = "16:9",
  brand,
  apiKeys = {},
  videoModel,
}) {
  const response = await fetch("/api/generate/video", {
    method: "POST",
    headers: buildHeaders(apiKeys),
    body: JSON.stringify({
      prompt,
      duration,
      aspectRatio,
      brand,
      ...(videoModel ? { videoModel } : {}),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Video generation failed");
  }

  return response.json();
}

export async function generateContentBundle({
  input,
  channels,
  templateId,
  brand,
  numTextVariants = 2,
  tone = "Professional",
  apiKeys = {},
  textModel,
}) {
  const bundle = {};

  const textPromises = channels.map(async (channelId) => {
    try {
      const cappedVariants =
        channelId === "landing" || channelId === "html-video" ? 1 : numTextVariants;
      const result = await generateText({
        input,
        channel: channelId,
        templateId,
        brand,
        numVariants: cappedVariants,
        tone,
        apiKeys,
        textModel,
      });
      return { channelId, variants: result.variants, model: result.model };
    } catch (error) {
      console.error(`Text generation failed for ${channelId}:`, error);
      return {
        channelId,
        variants: [{ id: "v-0", label: "A", text: `[Generation failed: ${error.message}]` }],
        model: "error",
      };
    }
  });

  const textResults = await Promise.all(textPromises);

  for (const result of textResults) {
    bundle[result.channelId] = {
      textVariants: result.variants,
      selectedTextIdx: 0,
      visualSlots: [],
      model: result.model,
    };
  }

  return bundle;
}

export async function consumeTextStream(response, { onChunk, onDone, onError }) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            onDone?.();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) onChunk?.(parsed.text);
            if (parsed.error) onError?.(parsed.error);
          } catch {}
        }
      }
    }
    onDone?.();
  } catch (error) {
    onError?.(error.message);
  }
}

export async function checkProviderStatus() {
  try {
    const response = await fetch("/api/status");
    if (!response.ok) return {};
    return response.json();
  } catch {
    return {};
  }
}
