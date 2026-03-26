/**
 * OpenAI `images.generate` / `images.edits` model id — single allowlist for designer + API route.
 * Keep in sync with `STUDIO_IMAGE_MODEL_OPTIONS` in `config/constants.js`.
 *
 * Docs: https://platform.openai.com/docs/models/gpt-image-1.5 — `gpt-image-1.5` tracks the latest 1.5 snapshot.
 */

export const OPENAI_IMAGE_MODEL_IDS = Object.freeze([
  "gpt-image-1.5",
  "gpt-image-1.5-2025-12-16",
  "gpt-image-1",
]);

/** Default: latest GPT Image 1.5 alias (OpenAI’s current image flagship). */
export const DESIGNER_OPENAI_IMAGE_MODEL_DEFAULT = "gpt-image-1.5";

const CE_STUDIO_MODELS_KEY = "ce_studio_models_v1";

export function isAllowedOpenAiImageModelId(id) {
  const t = typeof id === "string" ? id.trim() : "";
  return OPENAI_IMAGE_MODEL_IDS.includes(t);
}

export function normalizeOpenAiImageModelId(id) {
  const t = typeof id === "string" ? id.trim() : "";
  return isAllowedOpenAiImageModelId(t) ? t : DESIGNER_OPENAI_IMAGE_MODEL_DEFAULT;
}

/** Same key as Content Studio Workspace `saveStudioModelPrefs` — designer iframe reads user’s image model choice. */
export function readOpenAiImageModelFromBrowserPrefs() {
  try {
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return DESIGNER_OPENAI_IMAGE_MODEL_DEFAULT;
    }
    const s = localStorage.getItem(CE_STUDIO_MODELS_KEY);
    if (!s) return DESIGNER_OPENAI_IMAGE_MODEL_DEFAULT;
    const o = JSON.parse(s);
    return normalizeOpenAiImageModelId(o.imageModel);
  } catch {
    return DESIGNER_OPENAI_IMAGE_MODEL_DEFAULT;
  }
}
