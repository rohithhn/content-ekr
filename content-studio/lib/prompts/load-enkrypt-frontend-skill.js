/**
 * Loads the enkrypt-frontend-design skill body for Claude API system prompts.
 * Resolution order: bundled copy under lib/prompts, then monorepo .cursor (local dev).
 */

import fs from "fs";
import path from "path";

let cached = null;

function tryRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/**
 * @returns {string} Markdown body (YAML frontmatter stripped), or "" if missing.
 */
export function getEnkryptFrontendSkillBodyForApi() {
  if (cached !== null) return cached;

  const fromBundled = path.join(process.cwd(), "lib/prompts/enkrypt-frontend-design-SKILL.md");
  const fromParentCursor = path.join(process.cwd(), "..", ".cursor/skills/enkrypt-frontend-design/SKILL.md");
  const fromCwdCursor = path.join(process.cwd(), ".cursor/skills/enkrypt-frontend-design/SKILL.md");

  let raw = tryRead(fromBundled) || tryRead(fromParentCursor) || tryRead(fromCwdCursor) || "";

  raw = raw.replace(/^---[\s\S]*?---\s*/, "").trim();
  cached = raw;
  return cached;
}

/**
 * Appends the full skill to a landing system prompt (Cursor skill parity for API).
 * @param {string} baseSystemPrompt
 * @param {string} channel
 * @returns {string}
 */
export function composeSystemPromptWithEnkryptSkill(baseSystemPrompt, channel) {
  if (channel !== "landing") return baseSystemPrompt;
  const skill = getEnkryptFrontendSkillBodyForApi();
  if (!skill) return baseSystemPrompt;

  return `${baseSystemPrompt}

---
FULL DESIGN SKILL (automatically loaded — Cursor skill id: **enkrypt-frontend-design**)
You are given the complete skill specification below. Treat it as **mandatory** for this task alongside all prior system instructions (channel format, HTML sections, Lucide feature icons, brand gradient). Do not skip sections because this block is long.

${skill}`;
}
