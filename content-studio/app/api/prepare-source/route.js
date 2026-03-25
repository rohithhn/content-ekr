import { NextResponse } from "next/server";
import { prepareSourceWithClaude } from "@/lib/ai/sourcePreparation";

export const runtime = "nodejs";

/**
 * POST /api/prepare-source
 * Claude turns raw article text (e.g. after URL extraction) into a channel-aware brief
 * before multi-channel text generation.
 *
 * Body: {
 *   title?: string,
 *   content: string,
 *   channels?: string[],
 *   templateId?: string | null,
 *   willGenerateImages?: boolean
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      channels = [],
      templateId = null,
      willGenerateImages = true,
    } = body;

    if (!content || !String(content).trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 });
    }

    const apiKey = request.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured. Add it in Settings or set ANTHROPIC_API_KEY." },
        { status: 500 }
      );
    }

    const { preparedInput, model } = await prepareSourceWithClaude({
      apiKey,
      articleText: String(content),
      title: title != null ? String(title) : "",
      channels: Array.isArray(channels) ? channels : [],
      templateId,
      willGenerateImages: !!willGenerateImages,
    });

    return NextResponse.json({ preparedInput, model });
  } catch (error) {
    console.error("prepare-source error:", error);
    return NextResponse.json(
      { error: error.message || "prepare-source failed" },
      { status: 500 }
    );
  }
}
