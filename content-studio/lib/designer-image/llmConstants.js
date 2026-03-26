import { DESIGNER_OPENAI_IMAGE_MODEL_DEFAULT } from "./openaiImageModelId.js";

/** Mirrors designer-app/src/app/utils/llmText.ts — do not diverge without updating both. */
export const ENKRYPT_OPENAI_CHAT_MODEL = "gpt-5-chat-latest";
/** Content Studio: designer structure JSON + visual brief (API routes / shared builders). */
export const ENKRYPT_ANTHROPIC_CHAT_MODEL = "claude-sonnet-4-20250514";
/** Content Studio `POST /api/generate/text` — all channels (landing, social, blog, article). */
export const ENKRYPT_ANTHROPIC_TEXT_GENERATION_MODEL = "claude-opus-4-6";
export const ENKRYPT_GEMINI_CHAT_MODEL = "gemini-2.5-flash";

export function openAiChatCompletionsExtras(model) {
  if (model.startsWith("gpt-5.4")) {
    return { reasoning: { effort: "none" } };
  }
  return {};
}

/** Designer visual generation default when no `openaiImageModel` is passed (API route). */
export const DESIGNER_OPENAI_IMAGE_MODEL = DESIGNER_OPENAI_IMAGE_MODEL_DEFAULT;
