import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildDesignerStructureUserPrompt } from "@/lib/designer-image/designerStructurePrompt";
import {
  ENKRYPT_OPENAI_CHAT_MODEL,
  openAiChatCompletionsExtras,
} from "@/lib/designer-image/llmConstants";

/**
 * POST /api/generate/designer-structure
 * Same structured JSON step as designer-app LeftPanel "Generate structure" (text-only path).
 *
 * Body: { rawContent: string, themeId?: string, postSizeId?: string, designerWhiteBg?: boolean, customInstructions?: string }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      rawContent,
      themeId = "hooks",
      postSizeId = "1080x1080",
      designerWhiteBg = false,
      customInstructions = "",
    } = body;

    if (!rawContent || !String(rawContent).trim()) {
      return NextResponse.json({ error: "rawContent is required" }, { status: 400 });
    }

    const apiKey = request.headers.get("x-openai-key") || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OpenAI API key not configured. Add it in Settings (⚙) or set OPENAI_API_KEY in .env.local",
        },
        { status: 500 }
      );
    }

    const client = new OpenAI({ apiKey });
    const textPrompt = buildDesignerStructureUserPrompt({
      rawContent: String(rawContent),
      themeId,
      postSizeId,
      designerWhiteBg: !!designerWhiteBg,
      customInstructions: String(customInstructions || ""),
    });

    const completion = await client.chat.completions.create({
      model: ENKRYPT_OPENAI_CHAT_MODEL,
      messages: [{ role: "user", content: textPrompt }],
      temperature: 0.7,
      max_tokens: 500,
      ...openAiChatCompletionsExtras(ENKRYPT_OPENAI_CHAT_MODEL),
    });

    let text = completion.choices?.[0]?.message?.content;
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
    });
  } catch (e) {
    console.error("designer-structure:", e);
    return NextResponse.json(
      { error: e.message || "Designer structure generation failed" },
      { status: 500 }
    );
  }
}
