import { completeText, type CompleteTextOptions } from "./llmText";

export type EnkryptLlmProvider = "openai" | "gemini";

/**
 * Single LLM entry for Content writer and Researcher.
 * Uses the same stack as `llmText.completeText`: Header provider + API key → models in `llmText` (e.g. gpt-5-chat-latest / gemini-2.5-flash).
 */
export function runEnkryptLlm(
  apiKeyRaw: string,
  provider: EnkryptLlmProvider,
  systemPrompt: string,
  userPrompt: string,
  options?: CompleteTextOptions,
): Promise<string> {
  return completeText(apiKeyRaw, provider, systemPrompt, userPrompt, options);
}
