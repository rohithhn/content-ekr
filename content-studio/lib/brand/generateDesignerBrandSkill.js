/**
 * Build a Cursor Agent Skill markdown for a Content Studio brand, extending the Enkrypt
 * visual-designer-content-flow base. Consumed by Brand Editor "Create designer skill" export.
 */

/** @param {string | null | undefined} url */
function logoRefForSkill(url) {
  if (url == null || typeof url !== "string") return "(none)";
  const t = url.trim();
  if (!t) return "(none)";
  if (t.startsWith("data:")) return "(inline image — stored in Content Studio brand; not inlined here)";
  return t;
}

/**
 * @param {object} brand - Brand editor state (same shape as save payload)
 * @returns {{ slug: string, folderName: string, markdown: string }}
 */
export function buildDesignerBrandSkillExport(brand) {
  const displayName = brand.company_name || brand.name || "Brand";
  const slugBase = String(displayName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "brand";
  const folderName = `${slugBase}-visual-designer-content-flow`;
  const skillName = folderName;

  const c = brand.colors || {};
  const useGrad = brand.primary_as_gradient !== false;
  const g0 = brand.gradients?.[0];
  let gradientLine = "";
  if (useGrad && g0?.type === "linear" && g0.stops?.length >= 2) {
    const a = typeof g0.angle === "number" ? g0.angle : 90;
    const x = g0.stops[0]?.color || c.primary;
    const y = g0.stops[1]?.color || c.secondary;
    gradientLine = `- Marketing primary: **linear gradient** ~${a}deg: \`${x}\` → \`${y}\` (treat as single primary in image prompts).`;
  } else {
    gradientLine = `- Marketing primary (solid): \`${c.primary || "—"}\`. Secondary (separate): \`${c.secondary || "—"}\`.`;
  }

  const desc = [
    `Cursor skill for ${displayName} visual designer pipeline.`,
    `Extends Enkrypt base skills visual-designer-content-flow and content-studio-designer-pipeline.`,
    `Use when editing image prompts, briefs, or designer behavior for this brand only.`,
  ].join(" ");

  const toneDescriptors = (brand.tone?.descriptors || []).join(", ") || "(none)";
  const wordsUse = (brand.tone?.words_to_use || []).join(", ") || "(none)";
  const wordsAvoid = (brand.tone?.words_to_avoid || []).join(", ") || "(none)";

  const markdown = `---
name: ${skillName}
description: >
  ${desc.replace(/\n/g, " ")}
---

# ${displayName} — Visual designer skill (extends Enkrypt)

This skill **layers** ${displayName} brand rules on the canonical **Enkrypt** designer pipeline. Keep architecture, 7-field visual brief format, \`RED DECISION\` / ⚑ red instruction flow, one-background rules, and \`omitContentTextInImage\` behavior aligned with the base skills unless product changes them globally.

## Base skills (read first)

- **\`visual-designer-content-flow\`** — Full content → brief → image flow, failure modes, creativity tables.
- **\`content-studio-designer-pipeline\`** — Repo paths, General / Designer / Blog modes, embed session keys, TS/JS mirror rule.

## Brand identity

- **Company:** ${displayName}
- **Brand name (internal):** ${brand.name || "—"}
- **Tagline:** ${brand.tagline || "—"}
- **Elevator pitch:** ${brand.elevator_pitch || "—"}

## Palette & primary treatment

${gradientLine}
- **Accent:** \`${c.accent || "—"}\`
- **Background:** \`${c.background || "—"}\`
- **Surface:** \`${c.surface || "—"}\`
- **Heading text (UI):** \`${c.text_heading || "—"}\`
- **Body text (UI):** \`${c.text_body || "—"}\`
- **primary_as_gradient:** ${useGrad}

## Typography

- **Heading font:** ${brand.typography?.heading_font || "—"}
- **Body font:** ${brand.typography?.body_font || "—"}

## Tone & audience

- **Descriptors:** ${toneDescriptors}
- **CTA style:** ${brand.tone?.cta_style || "—"}
- **Words to use:** ${wordsUse}
- **Words to avoid:** ${wordsAvoid}
- **Persona:** ${brand.audience?.persona_name || "—"}
- **Industry:** ${brand.audience?.industry || "—"}
- **Language register:** ${brand.audience?.language_register || "—"}

## Visual direction (image generation)

- **Image style:** ${brand.visual_style?.image_style || "—"}
- **Icon style:** ${brand.visual_style?.icon_style || "—"}

## Logo & placement (designer compositing)

- **Logo placement:** ${brand.logo_placement || "top-left"}
- **Primary logo URL:** ${logoRefForSkill(brand.logos?.primary)}
- **Dark logo URL:** ${logoRefForSkill(brand.logos?.dark)}
- **Logo area / lockup description (for prompts):** ${brand.logos?.description || "(none)"}

## Image prompt instructions (agent)

When generating designer images for **${displayName}**:

1. Use **this brand’s** primary/secondary/accent/background language in \`PALETTE\` and \`STYLE\` fields of the 7-field brief — not Enkrypt’s default orange/pink unless they match this brand.
2. Keep **heading / subheading / footer** out of the bitmap; they render in app text slots (\`omitContentTextInImage\`).
3. Apply **red #D92D20** only when \`RED DECISION: ACTIVE\` names specific elements; when **INACTIVE**, no red anywhere.
4. Respect **logo placement** above; do not paint the logo into the generated image — the app composites it.

## Install in Cursor

1. Create folder: \`.cursor/skills/${folderName}/\`
2. Save this file as \`SKILL.md\` inside that folder (replace if updating).
3. Commit for team sharing, or copy to \`~/.cursor/skills/${folderName}/SKILL.md\` for personal use.

_Generated from Content Studio Brand Editor._
`;

  return { slug: skillName, folderName, markdown };
}
