import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildBrandContext } from "@/lib/prompts/system-prompts";
import {
  composeSystemPromptWithEnkryptSkill,
  buildLandingSystemPromptFromSkill,
} from "@/lib/prompts/load-enkrypt-frontend-skill";
import { composeSystemPromptWithHtmlVideoSkill } from "@/lib/prompts/load-html-video-builder-skill";
import { ENKRYPT_ANTHROPIC_TEXT_GENERATION_MODEL } from "@/lib/designer-image/llmConstants";
import { brandDisplayName } from "@/lib/brand/brandLogos";
import { isStudioTextModelId } from "@/config/constants";

/** Vercel / long-running Claude completion (full HTML pages). */
export const maxDuration = 300;

/** Landing: single-shot full HTML document from enkrypt-frontend-design skill. */
const LANDING_FULL_PAGE_MAX_TOKENS = 16384;
/** Full single-file HTML video (scenes + CSS + JS) — large output. */
const HTML_VIDEO_MAX_TOKENS = 16384;
const DEFAULT_MAX_TOKENS = 4096;

/** One full HTML document per response; multi-variant would exceed max_tokens and stall or truncate. */
function effectiveTextVariantsForChannel(channel, requested) {
  const n = Math.min(4, Math.max(1, Math.floor(Number(requested) || 1)));
  if (channel === "landing" || channel === "html-video") return 1;
  return n;
}

/**
 * POST /api/generate/text
 *
 * Generates text content using Claude Opus 4.6 with brand context injection.
 * Supports streaming responses for real-time UI updates.
 *
 * Landing channel: **single-shot** — system = enkrypt-frontend-design-SKILL.md + logo URLs + brand; user = source to full HTML document.
 *
 * Body: {
 *   input: string,
 *   channel: string,
 *   templateId?: string,
 *   brand?: object,
 *   numVariants?: number,
 *   tone?: string,
 *   stream?: boolean,
 *   landingRevise?: { pageHtml?: string, sectionsHtml?: string, instructions: string }
 *   textModel?: string — Anthropic model id (allowlisted); default Opus 4.6
 * }
 */
const LANDING_REVISE_SYSTEM_SUFFIX = `

LANDING REVISE MODE (this request only):
- The user supplied a **complete HTML document** plus **edit instructions**.
- Apply **only** what they asked for. Preserve theme toggle, logo src wiring, and Enkrypt brand rules where not asked to change.
- Output **only** the full updated HTML document from DOCTYPE through closing html tag. No markdown fences, no commentary.
- If instructions are narrow, change **only** those parts; keep the rest intact unless a fix is required for validity.`;

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      input,
      channel,
      templateId,
      brand,
      numVariants = 1,
      tone,
      stream = false,
      landingRevise,
      textModel: textModelRaw,
    } = body;

    const requestedTextModel =
      typeof textModelRaw === "string" ? textModelRaw.trim() : "";
    const baseModel = isStudioTextModelId(requestedTextModel)
      ? requestedTextModel
      : ENKRYPT_ANTHROPIC_TEXT_GENERATION_MODEL;

    const landingPageHtmlRaw =
      landingRevise?.pageHtml != null ? landingRevise.pageHtml : landingRevise?.sectionsHtml;
    const revise =
      channel === "landing" &&
      landingRevise &&
      typeof landingRevise === "object" &&
      String(landingPageHtmlRaw || "").trim().length > 0 &&
      String(landingRevise.instructions || "").trim().length > 0;

    const effectiveNumVariants = effectiveTextVariantsForChannel(channel, numVariants);

    if (!channel || (!input && !revise)) {
      return NextResponse.json(
        { error: "Missing required fields: input, channel" },
        { status: 400 }
      );
    }

    const apiKey = request.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Anthropic API key not configured. Add it in Settings (⚙) or set ANTHROPIC_API_KEY in .env.local",
        },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });
    const requestOrigin = new URL(request.url).origin;

    let systemPrompt;
    if (channel === "landing") {
      systemPrompt = buildLandingSystemPromptFromSkill({
        brand: brand || null,
        origin: requestOrigin,
        brandContextText: buildBrandContext(brand || null),
      });
      if (revise) {
        systemPrompt += LANDING_REVISE_SYSTEM_SUFFIX;
      }
      if (effectiveNumVariants > 1 && !revise) {
        systemPrompt += `\n\nVARIANTS: Generate exactly ${effectiveNumVariants} complete HTML documents. Label each with [VARIANT A], [VARIANT B], etc. before each full document.`;
      }
    } else {
      systemPrompt = composeSystemPromptWithHtmlVideoSkill(
        composeSystemPromptWithEnkryptSkill(
          buildSystemPrompt({
            channel,
            templateId: templateId || null,
            brand: brand || null,
            numVariants: effectiveNumVariants,
          }),
          channel
        ),
        channel,
        { origin: requestOrigin, brand: brand || null }
      );
    }

    if (channel === "landing" && revise) {
      return handleLandingRevise({
        client,
        baseModel,
        systemPrompt,
        pageHtml: String(landingPageHtmlRaw).trim(),
        instructions: String(landingRevise.instructions).trim(),
        tone,
        stream,
        numVariants: effectiveNumVariants,
      });
    }

    let userMessage = input;
    if (channel === "html-video") {
      userMessage = `[HTML VIDEO — source-driven task]
Build the **complete** single-file HTML document per the HTML VIDEO BUILDER skill (system prompt). Use the material below for narrative, on-screen copy, stats, scene order, and brand/company names.

Use the **RUNTIME ASSETS** section in the system prompt for every logo or wordmark (\`<img src="…">\` must be one of those exact URLs — never invented paths).

Output **only** raw HTML: start with \`<!DOCTYPE html>\` or \`<html\`. No markdown code fences, no explanation after \`</html>\`.\n\n---\n\n${userMessage}`;
    }
    if (channel === "landing") {
      userMessage = buildLandingUserMessage(input, tone, effectiveNumVariants, brand || null);
    } else if (tone && tone !== "Professional") {
      userMessage = `[TONE: ${tone} — adjust the voice and energy level to match this tone while maintaining brand guidelines]\n\n${userMessage}`;
    }

    const messageParams = {
      model: baseModel,
      max_tokens:
        channel === "html-video"
          ? HTML_VIDEO_MAX_TOKENS
          : channel === "landing"
            ? LANDING_FULL_PAGE_MAX_TOKENS
            : DEFAULT_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    };

    if (stream) {
      const streamResponse = await client.messages.stream(messageParams);

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const event of streamResponse) {
              if (event.type === "content_block_delta" && event.delta?.text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
                );
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (err) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
            );
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    const message = await client.messages.create(messageParams);

    const text = extractTextFromMessage(message);

    const variants = parseVariants(text, effectiveNumVariants);

    return NextResponse.json({
      variants,
      model: message.model,
      usage: message.usage,
    });
  } catch (error) {
    console.error("Text generation error:", error);
    return NextResponse.json(
      { error: error.message || "Text generation failed" },
      { status: 500 }
    );
  }
}

/**
 * Landing: single-shot revise of a full HTML document from user instructions.
 */
async function handleLandingRevise({
  client,
  baseModel,
  systemPrompt,
  pageHtml,
  instructions,
  tone,
  stream,
  numVariants,
}) {
  let userContent = buildLandingReviseUserMessage({ pageHtml, instructions, tone });

  const params = {
    model: baseModel,
    max_tokens: LANDING_FULL_PAGE_MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  };

  if (stream) {
    const streamResponse = await client.messages.stream(params);
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamResponse) {
            if (event.type === "content_block_delta" && event.delta?.text) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const message = await client.messages.create(params);
  const text = extractTextFromMessage(message);
  const variants = parseVariants(text, numVariants);

  return NextResponse.json({
    variants,
    model: message.model,
    usage: message.usage,
  });
}

function buildLandingReviseUserMessage({ pageHtml, instructions, tone }) {
  let body = `Revise the landing page **HTML document** per the instructions below. Return **only** the complete updated document (\`<!DOCTYPE html>\` through \`</html>\`), following the design skill + BRAND VISUAL OVERRIDE in your system prompt.

=== CURRENT HTML ===
${pageHtml}

=== EDIT INSTRUCTIONS ===
${instructions}`;

  if (tone && tone !== "Professional") {
    body = `[TONE: ${tone} — apply when changing copy]\n\n${body}`;
  }

  return body;
}

function buildLandingUserMessage(rawInput, tone, numVariants, brand = null) {
  const who =
    brand && typeof brand === "object"
      ? brandDisplayName(brand)
      : "the brand in BRAND GUIDELINES / RUNTIME ASSETS";
  let msg = `[LANDING PAGE — ${who}]

Build a **complete single-file marketing landing page** from the source material below. The system prompt includes the **enkrypt-frontend-design** layout/CSS patterns plus **RUNTIME ASSETS**, **BRAND VISUAL OVERRIDE**, and brand guidelines — treat those as **authoritative for name and colors**, not example copy inside the skill.

RULES:
- Output **only** one HTML document: from \`<!DOCTYPE html>\` through \`</html>\`.
- **Nav, logo wordmark text, \`<title>\`, meta, hero, footer** must use **${who}** (and SOURCE) — never "Enkrypt AI" unless that is literally this brand.
- Include all CSS in \`<style>\` (use the skill’s CSS variables and components). Include theme-toggle + logo \`src\` swap script using the **exact** logo URLs from RUNTIME ASSETS.
- Primary CTAs / gradients must match **BRAND VISUAL OVERRIDE** when present.
- Pick **one** design direction from the skill’s list and execute it fully.
- No markdown code fences. No text before or after the HTML.`;

  if (numVariants > 1) {
    msg += `\n- Generate exactly ${numVariants} **complete** HTML documents. Before each document, output a line: [VARIANT A], [VARIANT B], etc.`;
  }

  msg += `\n\n---\nSOURCE\n---\n\n${rawInput}`;

  if (tone && tone !== "Professional") {
    msg = `[TONE: ${tone} — match voice while keeping **${who}** colors and OVERRIDE]\n\n${msg}`;
  }
  return msg;
}

function extractTextFromMessage(message) {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

/**
 * Parse AI output into separate variants when multiple were requested.
 * Looks for [VARIANT A], [VARIANT B], etc. markers.
 */
function parseVariants(text, expectedCount) {
  if (expectedCount <= 1) {
    return [{ id: "v-0", label: "A", text: text.trim() }];
  }

  const variants = [];
  const labels = ["A", "B", "C", "D", "E"];

  for (let i = 0; i < expectedCount; i++) {
    const label = labels[i];
    const marker = `[VARIANT ${label}]`;
    const nextMarker = i < expectedCount - 1 ? `[VARIANT ${labels[i + 1]}]` : null;

    const startIdx = text.indexOf(marker);
    if (startIdx === -1) continue;

    const contentStart = startIdx + marker.length;
    const endIdx = nextMarker ? text.indexOf(nextMarker) : text.length;

    variants.push({
      id: `v-${i}`,
      label,
      text: text.substring(contentStart, endIdx === -1 ? text.length : endIdx).trim(),
    });
  }

  if (variants.length === 0) {
    return [{ id: "v-0", label: "A", text: text.trim() }];
  }

  return variants;
}
