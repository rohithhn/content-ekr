/**
 * Loads enkrypt-frontend-design-SKILL.md for Claude. Landing channel uses this file
 * as the entire system prompt (+ runtime logo URLs + optional brand context from route).
 */

import fs from "fs";
import path from "path";
import {
  resolveLogosForHtmlGeneration,
  buildBrandVisualDirectiveForHtml,
} from "@/lib/brand/brandLogos";

let cached = null;

function tryRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

/** @deprecated Use resolveLogosForHtmlGeneration — kept for callers importing this name */
export function resolveBrandLogoAbsoluteUrls(brand, origin) {
  return resolveLogosForHtmlGeneration(brand, origin);
}

/**
 * @returns {string} Markdown body (YAML frontmatter stripped), or "" if missing.
 */
export function getEnkryptFrontendSkillBodyForApi() {
  if (process.env.NODE_ENV === "production" && cached !== null) return cached;

  const fromBundled = path.join(process.cwd(), "lib/prompts/enkrypt-frontend-design-SKILL.md");
  const fromParentCursor = path.join(process.cwd(), "..", ".cursor/skills/enkrypt-frontend-design/SKILL.md");
  const fromCwdCursor = path.join(process.cwd(), ".cursor/skills/enkrypt-frontend-design/SKILL.md");

  let raw = tryRead(fromBundled) || tryRead(fromParentCursor) || tryRead(fromCwdCursor) || "";

  raw = raw.replace(/^---[\s\S]*?---\s*/, "").trim();
  if (process.env.NODE_ENV === "production") cached = raw;
  return raw;
}

/**
 * Landing: system prompt = full skill file + resolved Enkrypt logo URLs + brand guidelines.
 * @param {{ brand?: object|null, origin?: string, brandContextText?: string }} opts — origin = request URL origin so /brand/... resolves in generated HTML
 */
export function buildLandingSystemPromptFromSkill({ brand = null, origin = "", brandContextText = "" } = {}) {
  const skill = getEnkryptFrontendSkillBodyForApi();
  const { company, lightLogo, darkLogo } = resolveLogosForHtmlGeneration(brand, origin);

  const brandBlock = (brandContextText || "").trim();
  const visualDirective = buildBrandVisualDirectiveForHtml(brand);

  const runtime = `
---
## RUNTIME ASSETS — USE THESE EXACT LOGO URLs

**Brand name (title / alt text):** ${company}

**Dark wordmark on LIGHT backgrounds** (white/light sections, \`data-theme="light"\`):
- \`${lightLogo}\`
- Use for \`<img id="logo" … src="…" alt="${company.replace(/"/g, '\\"')}" />\` when the header/surface is light.

**Light/white wordmark on DARK backgrounds** (\`data-theme="dark"\`, dark hero/header):
- \`${darkLogo}\`
- Use when switching to dark theme (swap \`logo.src\` per the skill).

URLs may be **SVG data-URI placeholders** (brand-colored) when no uploaded lockup exists — use them **exactly** as \`src\`; do not swap in generic or Enkrypt assets.

Implement theme toggle + logo swap per the skill. **Deliverable:** One complete HTML5 document (\`<!DOCTYPE html>\` … \`</html>\`), self-contained. Primary CTA / gradients must follow **BRAND VISUAL OVERRIDE** when that section appears below; otherwise follow \`cta-primary\` in the skill. No markdown fences in the output.
`.trim();

  const parts = [skill || "(Skill file missing — use BRAND VISUAL OVERRIDE and RUNTIME ASSETS.)", runtime];
  if (brandBlock) parts.push(`---\n${brandBlock}`);
  if (visualDirective) parts.push(visualDirective);
  return parts.join("\n\n");
}

/**
 * Landing uses {@link buildLandingSystemPromptFromSkill} only. Other channels pass through unchanged.
 */
export function composeSystemPromptWithEnkryptSkill(baseSystemPrompt, _channel) {
  return baseSystemPrompt;
}
