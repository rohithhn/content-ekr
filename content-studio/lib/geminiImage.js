import { ENKRYPT_GEMINI_CHAT_MODEL } from "@/lib/designer-image/llmConstants";

/**
 * Text-to-image via Gemini generateContent + responseModalities IMAGE (same pattern as designer-app LeftPanel).
 * @param {string} apiKey Google AI Studio / Gemini API key (query param)
 * @param {string} prompt
 * @returns {Promise<string>} data URL (image/png or image/jpeg)
 */
export async function generateGeminiImageDataUrl(apiKey, prompt) {
  const key = String(apiKey || "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
  if (!key) throw new Error("Gemini API key missing");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || res.statusText || "Gemini request failed";
    throw new Error(msg);
  }

  const respParts = data.candidates?.[0]?.content?.parts || [];
  const imgPart = respParts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));
  if (!imgPart?.inlineData?.data) {
    throw new Error("Gemini did not return an image. Try OpenAI image generation or a different prompt.");
  }

  return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
}
