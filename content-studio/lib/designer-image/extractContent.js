/**
 * Derive { heading, subheading, footer } for designer image prompts — same role as
 * designer-app structured JSON from "Generate structure", but from channel markdown/plain text.
 */

function stripInlineMd(s) {
  return String(s)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .trim();
}

/**
 * Prefer the generated markdown body (after "Generated content:") so Topic/Input does not
 * become the heading.
 */
export function extractGeneratedContentFromSummary(contentSummary) {
  if (!contentSummary || !String(contentSummary).trim()) {
    return { heading: "", subheading: "", footer: "" };
  }
  let raw = String(contentSummary).trim();
  const genMatch = raw.match(/Generated content:\s*([\s\S]*)/i);
  if (genMatch) {
    raw = genMatch[1].trim();
  } else {
    const topicBlock = raw.match(/^Topic\/Input:\s*[\s\S]*?\n\n([\s\S]+)$/);
    if (topicBlock) raw = topicBlock[1].trim();
  }
  return extractGeneratedContentFromText(raw);
}

export function extractGeneratedContentFromText(text) {
  if (!text || !String(text).trim()) {
    return { heading: "", subheading: "", footer: "" };
  }
  const lines = String(text)
    .split("\n")
    .map((l) => stripInlineMd(l))
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { heading: "", subheading: "", footer: "" };
  }

  let heading = "";
  let startIdx = 0;
  const h2 = lines.findIndex((l) => l.startsWith("## ") && !l.startsWith("###"));
  const h1 = lines.findIndex((l) => l.startsWith("# ") && !l.startsWith("##"));
  if (h2 >= 0) {
    heading = lines[h2].replace(/^##+\s*/, "").slice(0, 200);
    startIdx = h2 + 1;
  } else if (h1 >= 0) {
    heading = lines[h1].replace(/^#\s*/, "").slice(0, 200);
    startIdx = h1 + 1;
  } else {
    heading = lines[0].slice(0, 160);
    startIdx = 1;
  }

  const bodyAfterHeading = lines.slice(startIdx);
  const skipMeta = (l) =>
    l.startsWith("##") ||
    l.startsWith("###") ||
    l.startsWith("> ") ||
    (l.startsWith("- ") && l.length < 50);

  let subheading = "";
  for (const l of bodyAfterHeading) {
    if (skipMeta(l)) continue;
    if (l.length < 8) continue;
    if (l.slice(0, heading.length) === heading) continue;
    subheading = l.slice(0, 400);
    break;
  }
  if (!subheading && bodyAfterHeading.length) {
    const candidate = bodyAfterHeading.find((l) => !l.startsWith("#"));
    subheading = (candidate || heading).slice(0, 400);
  }

  let footer = "";
  for (let i = bodyAfterHeading.length - 1; i >= 0; i--) {
    const l = bodyAfterHeading[i];
    if (l.startsWith("#")) continue;
    if (l.length < 6) continue;
    if (l === subheading.slice(0, l.length)) continue;
    footer = l.slice(0, 220);
    break;
  }
  if (!footer) {
    footer =
      bodyAfterHeading.length > 1
        ? bodyAfterHeading[bodyAfterHeading.length - 1].slice(0, 220)
        : subheading.slice(0, 120);
  }

  return {
    heading: heading || "Content",
    subheading: subheading || heading,
    footer: footer || subheading.slice(0, 100) || heading,
  };
}

/**
 * Previews + pipeline: prefer designer structure step output stored on variants;
 * otherwise parse channel markdown (legacy / fallback).
 */
export function resolveDesignerPreviewContent(sourceText, designerContent) {
  if (
    designerContent &&
    typeof designerContent === "object" &&
    (designerContent.heading || designerContent.subheading || designerContent.footer)
  ) {
    return {
      heading: String(designerContent.heading || ""),
      subheading: String(designerContent.subheading || ""),
      footer: String(designerContent.footer || ""),
    };
  }
  return extractGeneratedContentFromSummary(sourceText || "");
}
