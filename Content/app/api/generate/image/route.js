import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { buildImagePrompt } from "@/lib/prompts/system-prompts";

/** OpenAI GPT Image model (multimodal; replaces DALL·E for generations). */
const OPENAI_IMAGE_MODEL =
  process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5";

/**
 * POST /api/generate/image
 * 
 * Generates images using OpenAI (GPT Image) or Nano Banana.
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

    const prompt = buildImagePrompt({ channel, slot, brand, contentSummary });

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
          model: OPENAI_IMAGE_MODEL,
          prompt,
          n: 1,
          size,
          quality: "high",
          output_format: "png",
        });

        const row = response.data?.[0];
        const b64 = row?.b64_json;
        const url = b64
          ? `data:image/png;base64,${b64}`
          : row?.url;
        if (!url) {
          throw new Error("OpenAI returned no image data");
        }

        images.push({
          id: `img-${slot}-${i}`,
          url,
          revisedPrompt: row?.revised_prompt ?? prompt,
        });
      }

      return NextResponse.json({ images, provider: "openai" });
    } 
    
    if (provider === "nanobanana") {
      const apiKey = request.headers.get("x-nanobanana-key") || process.env.NANOBANANA_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Nano Banana API key not configured. Add it in Settings (⚙) or set NANOBANANA_API_KEY in .env.local" },
          { status: 500 }
        );
      }

      // Nano Banana API integration
      // Note: Replace this URL and payload format with the actual Nano Banana API spec
      const response = await fetch("https://api.nanobanana.ai/v1/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          prompt,
          num_images: numVariants,
          width: slot.includes("carousel") ? 1024 : 1792,
          height: slot.includes("carousel") ? 1024 : 1024,
          style: brand?.visual_style?.image_style || "minimal",
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return NextResponse.json(
          { error: `Nano Banana API error: ${err}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      const images = (data.images || []).map((img, i) => ({
        id: `img-${slot}-${i}`,
        url: img.url,
        revisedPrompt: prompt,
      }));

      return NextResponse.json({ images, provider: "nanobanana" });
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
