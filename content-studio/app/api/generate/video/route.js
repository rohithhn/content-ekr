import { NextResponse } from "next/server";
import {
  isStudioVideoModelId,
  DEFAULT_STUDIO_VIDEO_MODEL,
  STUDIO_VIDEO_MODEL_LEGACY,
} from "@/config/constants";
import { resolveLogosForHtmlGeneration, brandDisplayName } from "@/lib/brand/brandLogos";

/** https://docs.kie.ai — unified task creation for market models (Kling, etc.) */
const KIE_AI_CREATE_TASK_URL = "https://api.kie.ai/api/v1/jobs/createTask";

/**
 * POST /api/generate/video
 *
 * Creates a Kling text-to-video task via **Kie AI** (`api.kie.ai`).
 * Auth: Bearer token = your Kie API key (Settings → same "Kling" field, or KIE_AI_API_KEY / KLING_API_KEY in .env).
 *
 * Body: {
 *   prompt: string,
 *   duration: number,   // clamped to 5 or 10 (Kie Kling text-to-video)
 *   aspectRatio: string, // "16:9" | "9:16" | "1:1"
 *   brand?: object,
 *   videoModel?: string — Kie model id, e.g. kling/v2-1-master-text-to-video
 * }
 */

function resolveVideoModel(requested) {
  const raw = typeof requested === "string" ? requested.trim() : "";
  const mapped = STUDIO_VIDEO_MODEL_LEGACY[raw] || raw;
  return isStudioVideoModelId(mapped) ? mapped : DEFAULT_STUDIO_VIDEO_MODEL;
}

/** Kie accepts only "5" | "10" for these Kling models */
function kieDurationString(duration) {
  const n = Number(duration);
  if (!Number.isFinite(n) || n <= 5) return "5";
  return "10";
}

function kieAspectRatio(ar) {
  const a = String(ar || "16:9");
  if (a === "9:16" || a === "1:1" || a === "16:9") return a;
  return "16:9";
}

function buildKiePayload(model, prompt, durationNum, aspectRatio) {
  const duration = kieDurationString(durationNum);
  const aspect_ratio = kieAspectRatio(aspectRatio);

  const payload = { model };

  const cb = process.env.KIE_AI_CALLBACK_URL;
  if (cb && String(cb).trim()) {
    payload.callBackUrl = String(cb).trim();
  }

  if (model === "kling-2.6/text-to-video") {
    payload.input = {
      prompt,
      sound: false,
      aspect_ratio,
      duration,
    };
    return payload;
  }

  // kling/v2-1-master-text-to-video (and any other v2.1-shaped model)
  payload.input = {
    prompt,
    duration,
    aspect_ratio,
  };
  return payload;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      prompt,
      duration = 10,
      aspectRatio = "16:9",
      brand,
      videoModel: videoModelRaw,
    } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Missing or empty prompt" }, { status: 400 });
    }

    const videoModel = resolveVideoModel(videoModelRaw);

    const apiKey =
      request.headers.get("x-kling-key") ||
      process.env.KIE_AI_API_KEY ||
      process.env.KLING_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Kie AI API key not configured. Add it in Settings (⚙) or set KIE_AI_API_KEY (or KLING_API_KEY) in .env.local",
        },
        { status: 500 }
      );
    }

    let enhancedPrompt = String(prompt).trim();
    if (brand && typeof brand === "object") {
      const label = brandDisplayName(brand);
      if (label && label !== "Brand") {
        enhancedPrompt = `Brand: ${label}. ${enhancedPrompt}`;
      }
    }
    if (brand?.visual_style?.image_style) {
      enhancedPrompt += `. Style: ${brand.visual_style.image_style}, professional, high-production-value.`;
    }
    if (brand?.colors && typeof brand.colors === "object") {
      const c = brand.colors;
      const parts = [];
      if (c.primary) parts.push(`primary ${c.primary}`);
      if (c.secondary) parts.push(`secondary ${c.secondary}`);
      if (c.accent) parts.push(`accent ${c.accent}`);
      if (c.background) parts.push(`background ${c.background}`);
      if (c.surface) parts.push(`surface/panels ${c.surface}`);
      if (c.text_heading || c.text_body) {
        parts.push(
          `on-screen text headings ${c.text_heading || "neutral"}, body ${c.text_body || "neutral"}`
        );
      }
      if (parts.length) {
        enhancedPrompt += ` Use this brand palette: ${parts.join(", ")}.`;
      }
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

    try {
      const requestOrigin = new URL(request.url).origin;
      const { company, lightLogo, darkLogo } = resolveLogosForHtmlGeneration(brand || null, requestOrigin);
      if (company && (lightLogo || darkLogo)) {
        enhancedPrompt += ` Brand wordmark for ${company}: use light-background lockup conceptually matching ${lightLogo}; dark-background lockup matching ${darkLogo}.`;
      }
    } catch {
      /* ignore */
    }

    const kieBody = buildKiePayload(videoModel, enhancedPrompt, duration, aspectRatio);

    const response = await fetch(KIE_AI_CREATE_TASK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.replace(/[^\x20-\x7E]/g, "").trim()}`,
      },
      body: JSON.stringify(kieBody),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg =
        data?.msg ||
        data?.message ||
        (typeof data === "object" && data != null && Object.keys(data).length ? JSON.stringify(data) : "") ||
        response.statusText;
      return NextResponse.json(
        { error: `Kie AI error (${response.status}): ${msg}` },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
      );
    }

    if (data.code !== 200) {
      return NextResponse.json(
        {
          error: data.msg || "Kie AI rejected the request",
          code: data.code,
        },
        { status: 502 }
      );
    }

    const taskId = data.data?.taskId;
    if (!taskId) {
      return NextResponse.json(
        { error: "Kie AI returned no taskId", raw: data },
        { status: 502 }
      );
    }

    const durSec = Number(kieBody.input?.duration || 10) || 10;

    return NextResponse.json({
      jobId: taskId,
      status: "processing",
      provider: "kie.ai",
      kieModel: videoModel,
      estimatedDuration: durSec * 3,
      message: "Task created on Kie AI. The app will poll for your video and show it below when ready.",
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return NextResponse.json(
      { error: error.message || "Video generation failed" },
      { status: 500 }
    );
  }
}
