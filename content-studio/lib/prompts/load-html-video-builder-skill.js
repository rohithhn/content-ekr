/**
 * Loads the html-video-builder skill (+ references) for Claude API system prompts.
 * Files live under lib/prompts/html-video-builder/ (from the html-video-builder.skill package).
 */

import fs from "fs";
import path from "path";
import { resolveBrandLogoAbsoluteUrls } from "@/lib/prompts/load-enkrypt-frontend-skill";

let cached = null;

function tryRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function stripYamlFrontmatter(raw) {
  return raw.replace(/^---[\s\S]*?---\s*/, "").trim();
}

/**
 * @returns {string} Combined markdown for API injection, or "" if missing.
 */
export function getHtmlVideoBuilderSkillBodyForApi() {
  if (cached !== null) return cached;

  const root = path.join(process.cwd(), "lib/prompts/html-video-builder");
  const skill = tryRead(path.join(root, "SKILL.md"));
  const components = tryRead(path.join(root, "references/components.md"));
  const animations = tryRead(path.join(root, "references/animation-library.md"));

  const parts = [];
  if (skill) parts.push(stripYamlFrontmatter(skill));
  if (components) {
    parts.push(`# Reference: components.md\n\n${components.trim()}`);
  }
  if (animations) {
    parts.push(`# Reference: animation-library.md\n\n${animations.trim()}`);
  }

  cached = parts.join("\n\n---\n\n").trim();
  return cached;
}

/**
 * @param {string} baseSystemPrompt
 * @param {string} channel
 * @param {{ brand?: object|null, origin?: string }} [opts] — origin resolves /brand/... paths to absolute URLs for `<img src>`
 * @returns {string}
 */
export function composeSystemPromptWithHtmlVideoSkill(baseSystemPrompt, channel, opts = {}) {
  if (channel !== "html-video") return baseSystemPrompt;
  const skill = getHtmlVideoBuilderSkillBodyForApi();
  if (!skill) return baseSystemPrompt;

  const origin = typeof opts.origin === "string" ? opts.origin : "";
  const { company, lightLogo, darkLogo } = resolveBrandLogoAbsoluteUrls(opts.brand ?? null, origin);
  const safeCompany = company.replace(/"/g, '\\"');

  const runtimeLogos = `
---
## RUNTIME ASSETS — USE THESE EXACT LOGO URLs (HTML VIDEO)

**Brand name:** ${company}

- **Dark wordmark on LIGHT scenes** (bright backgrounds, light end cards): \`${lightLogo}\`
- **Light/white wordmark on DARK scenes** (typical cinematic dark slides): \`${darkLogo}\`

**Mandatory:** Any logo, wordmark, corner bug, opening splash, or end card must use real \`<img src="…" alt="${safeCompany}" />\` with one of the URLs above. Do **not** use placeholder paths, invented filenames, text-only SVG wordmarks, or generic “LOGO” text instead of these assets. Choose light-on-dark vs dark-on-light by scene background for contrast.
`.trim();

  return `${baseSystemPrompt}

---
FULL HTML VIDEO BUILDER SKILL (automatically loaded — skill id: **html-video-builder**)
The specification below is **mandatory** for this task. Build a single-file 1280×720 scene-sequencer HTML document per the skill — scene count, durations, and visuals follow the **user’s source** and brand context. **Honor RUNTIME ASSETS** for every brand mark.

${skill}

${runtimeLogos}`;
}
