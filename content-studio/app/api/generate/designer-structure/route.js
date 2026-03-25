import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildDesignerStructureUserPrompt } from "@/lib/designer-image/designerStructurePrompt";
import { ENKRYPT_ANTHROPIC_CHAT_MODEL } from "@/lib/designer-image/llmConstants";

/**
 * POST /api/generate/designer-structure
 * Structured JSON { heading, subheading, footer } — Claude (same stack as /api/generate/text).
 *
 * Body: { rawContent: string, themeId?: string (default "none"), postSizeId?: string, designerWhiteBg?: boolean, customInstructions?: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      rawContent,
      themeId = "none",
      postSizeId = "1080x1080",
      designerWhiteBg = false,
      customInstructions = "",
    } = body;

    if (!rawContent || !String(rawContent).trim()) {
      return NextResponse.json({ error: "rawContent is required" }, { status: 400 });
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
    const textPrompt = buildDesignerStructureUserPrompt({
      rawContent: String(rawContent),
      themeId,
      postSizeId,
      designerWhiteBg: !!designerWhiteBg,
      customInstructions: String(customInstructions || ""),
    });

    const message = await client.messages.create({
      model: ENKRYPT_ANTHROPIC_CHAT_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: textPrompt }],
    });

    let text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    if (!text || !String(text).trim()) {
      return NextResponse.json({ error: "Empty model response" }, { status: 502 });
    }

    text = String(text)
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();

    let structured;
    try {
      structured = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Model did not return valid JSON", raw: text.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json({
      heading: String(structured.heading ?? "").trim(),
      subheading: String(structured.subheading ?? "").trim(),
      footer: String(structured.footer ?? "").trim(),
      model: message.model,
    });
  } catch (e) {
    console.error("designer-structure:", e);
    return NextResponse.json(
      { error: e.message || "Designer structure generation failed" },
      { status: 500 }
    );
  }
}
