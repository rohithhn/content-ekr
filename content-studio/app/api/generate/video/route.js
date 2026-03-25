import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/generate/video
 * 
 * Generates short-form video using Kling 2.0 (Kuaishou).
 * Returns a job ID for polling since video generation is async.
 * 
 * Body: {
 *   prompt: string,
 *   duration: number,   // seconds (5, 10, 15)
 *   aspectRatio: string, // "16:9" | "9:16" | "1:1"
 *   brand?: object,
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, duration = 10, aspectRatio = "16:9", brand } = body;

    const apiKey = request.headers.get("x-kling-key") || process.env.KLING_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Kling API key not configured. Add it in Settings (⚙) or set KLING_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    let enhancedPrompt = prompt;
    if (brand?.visual_style?.image_style) {
      enhancedPrompt += `. Style: ${brand.visual_style.image_style}, professional, high-production-value.`;
    }
    if (brand?.colors?.primary) {
      enhancedPrompt += ` Use brand colors: ${brand.colors.primary} and ${brand.colors.secondary}.`;
    }
    if (brand?.logos?.description) {
      enhancedPrompt += ` Brand logo: ${brand.logos.description}. Include space for logo watermark at ${brand.logo_placement || "top-left"}.`;
    }
    if (brand?.typography?.heading_font) {
      enhancedPrompt += ` Typography style: ${brand.typography.heading_font} for titles.`;
    }
    if (brand?.sample_backgrounds?.length) {
      enhancedPrompt += ` Match the brand's established visual style used in social media backgrounds.`;
    }
    if (brand.primary_as_gradient !== false && brand?.gradients?.length && brand.gradients[0]?.stops?.length >= 2) {
      const g = brand.gradients[0];
      enhancedPrompt += ` Use brand gradient from ${g.stops[0].color} to ${g.stops[g.stops.length - 1].color} in transitions or overlays.`;
    }

    // Kling 2.0 API call
    // Note: Replace with actual Kling API endpoint and payload format
    const response = await fetch("https://api.klingai.com/v1/videos/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        duration,
        aspect_ratio: aspectRatio,
        mode: "professional",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: `Kling API error: ${err}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      jobId: data.job_id || data.id,
      status: "processing",
      estimatedDuration: duration * 3, // rough estimate: 3x realtime
      message: "Video generation started. Poll for status.",
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: error.message || "Video generation failed" },
      { status: 500 }
    );
  }
}
