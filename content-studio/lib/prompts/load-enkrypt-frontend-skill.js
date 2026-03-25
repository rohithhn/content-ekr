/**
 * Loads enkrypt-frontend-design-SKILL.md for Claude. Landing channel uses this file
 * as the entire system prompt (+ runtime logo URLs + optional brand context from route).
 */

import fs from "fs";
import path from "path";
import {
  ENKRYPT_LOGO_FOR_LIGHT_BACKGROUND,
  ENKRYPT_LOGO_FOR_DARK_BACKGROUND,
} from "@/lib/brand/enkrypt-defaults";

let cached = null;

function tryRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function toAbsoluteLogoUrl(pathOrUrl, origin) {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = (origin || "").replace(/\/$/, "");
  const p = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return base ? `${base}${p}` : pathOrUrl;
}

/**
 * Resolved logo URLs for generated HTML (landing, HTML video) so `<img src>` works in iframe preview.
 * @param {object|null|undefined} brand
 * @param {string} origin — request origin, e.g. https://localhost:3000
 * @returns {{ company: string, lightLogo: string, darkLogo: string }}
 */
export function resolveBrandLogoAbsoluteUrls(brand, origin) {
  const company = (brand?.company_name || brand?.name || "Enkrypt AI").trim() || "Enkrypt AI";
  const lightPath = brand?.logos?.primary || ENKRYPT_LOGO_FOR_LIGHT_BACKGROUND;
  const darkPath = brand?.logos?.dark || ENKRYPT_LOGO_FOR_DARK_BACKGROUND;
  return {
    company,
    lightLogo: toAbsoluteLogoUrl(lightPath, origin),
    darkLogo: toAbsoluteLogoUrl(darkPath, origin),
  };
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
  const { company, lightLogo, darkLogo } = resolveBrandLogoAbsoluteUrls(brand, origin);

  const brandBlock = (brandContextText || "").trim();

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

Implement theme toggle + logo swap exactly as in the skill. Do **not** invent other Enkrypt logo paths.

**Deliverable:** One complete, valid HTML5 document (\`<!DOCTYPE html>\` … \`</html>\`), self-contained. Primary CTA styling must match \`cta-primary\` in the skill (gradient #FF7404 → #FF3BA2). Load Inter from Google Fonts. No markdown fences in the output.
`.trim();

  const parts = [skill || "(Skill file missing — use Enkrypt gradient #FF7404→#FF3BA2, Inter, and logo URLs above.)", runtime];
  if (brandBlock) parts.push(`---\n${brandBlock}`);
  return parts.join("\n\n");
}

/**
 * Landing uses {@link buildLandingSystemPromptFromSkill} only. Other channels pass through unchanged.
 */
export function composeSystemPromptWithEnkryptSkill(baseSystemPrompt, _channel) {
  return baseSystemPrompt;
}
