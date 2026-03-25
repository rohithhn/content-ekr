/**
 * Low-level OpenAI / Gemini chat completion.
 * Prefer `runEnkryptLlm` from `enkryptLlmApi.ts` in product panels so all text features share one entry point.
 */

/**
 * OpenAI: `gpt-5-chat-latest` is an **alias** OpenAI updates to the current ChatGPT-class chat
 * snapshot — you don’t pin a dated model ID. For frontier “GPT-5.4” tasks outside this alias,
 * use `gpt-5.4` in code instead (see OpenAI latest-model guide).
 * @see https://developers.openai.com/api/docs/models/gpt-5-chat-latest
 */
export const ENKRYPT_OPENAI_CHAT_MODEL = "gpt-5-chat-latest";

/** High-volume / cheaper OpenAI text — GPT-5.4 mini line (still current generation). */
export const ENKRYPT_OPENAI_FAST_MODEL = "gpt-5.4-mini";

export const ENKRYPT_GEMINI_CHAT_MODEL = "gemini-2.5-flash";

/**
 * GPT-5.4 family on Chat Completions: `reasoning.effort: "none"` for low-latency, non-reasoning-style
 * output (OpenAI GPT-5.4 guide). Omitted for `gpt-5-chat-latest` (alias may not need it).
 */
export function openAiChatCompletionsExtras(model: string): { reasoning?: { effort: "none" } } {
  if (model.startsWith("gpt-5.4")) {
    return { reasoning: { effort: "none" } };
  }
  return {};
}

/** Gemini `generateContent` URL for the configured chat model. */
export function enkryptGeminiGenerateUrl(apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`;
}

export type CompleteTextOptions = {
  /** OpenAI: max_tokens. Gemini: maxOutputTokens. Capped per provider. */
  maxOutputTokens?: number;
  /** Override default 0.7 (e.g. lower for JSON). */
  temperature?: number;
  /** OpenAI only: force JSON object output (system/user must mention JSON). */
  responseFormatJson?: boolean;
};

export async function completeText(
  apiKeyRaw: string,
  provider: "openai" | "gemini",
  systemPrompt: string,
  userPrompt: string,
  options?: CompleteTextOptions,
): Promise<string> {
  const apiKey = apiKeyRaw.replace(/[^\x20-\x7E]/g, "").trim();
  if (!apiKey) throw new Error("Configure your API key in Settings.");

  const want = options?.maxOutputTokens ?? 8192;
  const openAiMax = Math.min(Math.max(want, 256), 16384);
  const geminiMax = Math.min(Math.max(want, 256), 8192);
  const temperature =
    typeof options?.temperature === "number" ? Math.min(Math.max(options.temperature, 0), 2) : 0.7;

  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ENKRYPT_OPENAI_CHAT_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        max_tokens: openAiMax,
        ...openAiChatCompletionsExtras(ENKRYPT_OPENAI_CHAT_MODEL),
        ...(options?.responseFormatJson ? { response_format: { type: "json_object" as const } } : {}),
      }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI error ${response.status}`);
    }
    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Empty response from OpenAI");
    return text.trim();
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { temperature, maxOutputTokens: geminiMax },
      }),
    },
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini error ${response.status}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text.trim();
}
