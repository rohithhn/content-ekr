import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildImagePrompt } from "@/lib/prompts/system-prompts";
import {
  generateNanoBanana2Image,
  slotToNanoBanana2AspectRatio,
} from "@/lib/nanobanana2";
import { OPENAI_IMAGE_GENERATION_MODEL } from "@/lib/openaiImageModel";

/**
 * POST /api/generate/image
 *
 * Generates images using OpenAI (GPT Image) or Nano Banana 2 (nanobananaapi.ai).
 * 
 * Body: {
 *   channel: string,
 *   slot: string,           // hero, carousel-1, og-image, etc.
 *   brand?: object,
 *   contentSummary: string, // Brief summary of the text content for visual coherence
 *   provider: "openai" | "nanobanana",
 *   numVariants?: number,
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { channel, slot, brand, contentSummary, provider = "openai", numVariants = 1 } = body;

    const basePrompt = buildImagePrompt({ channel, slot, brand, contentSummary });
    const prompt = brand?.visual_style?.image_style
      ? `${basePrompt}\n\nVisual style preference: ${brand.visual_style.image_style}.`
      : basePrompt;

    if (provider === "openai") {
      const apiKey = request.headers.get("x-openai-key") || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "OpenAI API key not configured. Add it in Settings (⚙) or set OPENAI_API_KEY in .env.local" },
          { status: 500 }
        );
      }

      const client = new OpenAI({ apiKey });

      const size = slot.includes("og")
        ? "1536x1024"
        : slot.includes("carousel")
          ? "1024x1024"
          : "1536x1024";

      const images = [];
      for (let i = 0; i < numVariants; i++) {
        const response = await client.images.generate({
          model: OPENAI_IMAGE_GENERATION_MODEL,
          prompt,
          n: 1,
          size,
          quality: "high",
          output_format: "png",
        });

        const row = response.data?.[0];
        const b64 = row?.b64_json;
        const url = b64 ? `data:image/png;base64,${b64}` : row?.url;
        if (!url) {
          return NextResponse.json(
            { error: "OpenAI returned no image data" },
            { status: 502 }
          );
        }

        images.push({
          id: `img-${slot}-${i}`,
          url,
          revisedPrompt: row?.revised_prompt ?? prompt,
        });
      }

      return NextResponse.json({
        images,
        provider: "openai",
        model: OPENAI_IMAGE_GENERATION_MODEL,
      });
    } 
    
    if (provider === "nanobanana") {
      const apiKey = request.headers.get("x-nanobanana-key") || process.env.NANOBANANA_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          {
            error:
              "Nano Banana 2 API key not configured. Add it in Settings (⚙) or set NANOBANANA_API_KEY in .env.local (key from nanobananaapi.ai).",
          },
          { status: 500 }
        );
      }

      const aspectRatio = slotToNanoBanana2AspectRatio(slot);

      const images = [];
      for (let i = 0; i < numVariants; i++) {
        const url = await generateNanoBanana2Image(apiKey, {
          prompt,
          aspectRatio,
          resolution: "2K",
          outputFormat: "png",
        });
        images.push({
          id: `img-${slot}-${i}`,
          url,
          revisedPrompt: prompt,
        });
      }

      return NextResponse.json({ images, provider: "nanobanana", pipeline: "nanobanana2" });
    }

    return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: error.message || "Image generation failed" },
      { status: 500 }
    );
  }
}
