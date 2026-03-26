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

  const escAttr = (s) => String(s || "").replace(/"/g, '\\"');

  const runtime = `
---
## RUNTIME ASSETS — LOGO URLs (AUTHORITATIVE — OVERRIDES SKILL EXAMPLES)

**Brand name (nav, \`<title>\`, logo \`alt\`):** ${company}

**Light mode and dark mode are both required** on this landing: implement the **enkrypt-frontend-design** skill’s full \`:root\` / \`[data-theme="light"]\` and \`[data-theme="dark"]\` color tokens so the **entire page** (backgrounds, text, cards, borders) switches correctly — not a dark-only page.

These two URLs map **1:1** to Brand Editor fields \`logos.primary\` and \`logos.dark\`. **Do not invert.**

| Brand Editor field | When to use (page theme) | Lockup appearance | **Exact \`src\` URL** |
|--------------------|---------------------------|-------------------|----------------------|
| \`logos.primary\` | \`data-theme="light"\` (light UI: white/light header & surfaces) | **Dark-colored** wordmark on light bg | \`${lightLogo}\` |
| \`logos.dark\` | \`data-theme="dark"\` (dark UI: dark header & surfaces) | **Light/white** wordmark on dark bg | \`${darkLogo}\` |

**MANDATORY theme-toggle script logic:**
- Include a **visible** theme control (button or switch) per the skill; persist choice (e.g. \`localStorage\`) and honor \`prefers-color-scheme\` for **initial** \`data-theme\` when no saved preference.
- Set \`<html data-theme="light"|"dark">\` on load and on every toggle.
- \`<img id="logo" … />\` must use the URL from the table row that matches the **current** \`data-theme\`.
- On every theme change: \`logo.src = isDark ? ${JSON.stringify(darkLogo)} : ${JSON.stringify(lightLogo)};\`
  - \`isDark === true\` → \`logos.dark\` URL (light/white glyph for dark surfaces).
  - \`isDark === false\` → \`logos.primary\` URL (dark glyph for light surfaces).
- Example initial tag when starting light: \`<img id="logo" src="${escAttr(lightLogo)}" alt="${escAttr(company)}" />\`.

**FORBIDDEN:** Dark-only landings with no light skin; using one logo URL for both themes; using \`logos.dark\` on light header; using \`logos.primary\` on dark header; inventing /brand/ paths not listed above.

URLs may be **SVG data-URI placeholders** when no upload exists — still treat as **light theme = primary URL**, **dark theme = dark URL**.

**Deliverable:** One complete HTML5 document (\`<!DOCTYPE html>\` … \`</html>\`), self-contained, **enkrypt-frontend-design** patterns, **both light and dark** themes working, with \`data-theme\` + logo swap. Primary CTA / gradients: **BRAND VISUAL OVERRIDE** when present. No markdown fences in the output.
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
