import { NextResponse } from "next/server";
import OpenAI from "openai";
import { buildImagePrompt } from "@/lib/prompts/system-prompts";
import { extractGeneratedContentFromSummary } from "@/lib/designer-image/extractContent";
import {
  postSizeIdToCanvasSize,
  buildDesignerOpenAiImagePrompt,
} from "@/lib/designer-image/buildDesignerOpenAiPrompt";
import { serializeStudioBrandForDesigner } from "@/lib/brand/studioBrandBridge";
import { DESIGNER_OPENAI_IMAGE_MODEL } from "@/lib/designer-image/llmConstants";
import { isStudioImageModelId } from "@/config/constants";

/**
 * POST /api/generate/image
 *
 * OpenAI: uses the same prompt + model + size as visual designer (gpt-image-1, 1024×1024)
 * when designerImage !== false. Optional: postSizeId, designerWhiteBg, designerThemeId.
 *
 * Body: {
 *   channel, slot, brand?, contentSummary, provider,
 *   numVariants?, designerImage? (default true for openai),
 *   postSizeId?: "1080x1080" | "1080x1080-trns" | "1920x1080",
 *   designerWhiteBg?: boolean,
 *   designerThemeId?: string,
 *   extractedContent?: { heading, subheading, footer },
 *   omitContentTextInImage?: boolean — default true (same as designer “Generate visual”: supporting bitmap only; H/S/F composed by app)
 *   designerHideLogo?: boolean — matches designer “Hide logo”; image prompt omits logo placement line
 *   imageProvider?: "openai" | "gemini" — fallback when no Anthropic key (visual brief chat step)
 *   openaiImageModel?: string — allowlisted OpenAI `images.generate` model (designer + legacy paths)
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      channel,
      slot,
      brand,
      contentSummary,
      provider = "openai",
      numVariants = 1,
      designerImage = true,
      postSizeId = "1080x1080",
      designerWhiteBg = false,
      designerThemeId = "none",
      extractedContent: extractedFromClient,
      imageProvider = "openai",
      /** false = paint heading/subheading/footer into the image; true = designer default (visual only) */
      omitContentTextInImage = true,
      designerHideLogo = false,
      openaiImageModel: openaiImageModelRaw,
    } = body;

    const requestedImageModel =
      typeof openaiImageModelRaw === "string" ? openaiImageModelRaw.trim() : "";
    const openaiImageModel = isStudioImageModelId(requestedImageModel)
      ? requestedImageModel
      : DESIGNER_OPENAI_IMAGE_MODEL;

    if (provider === "openai") {
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
      const anthropicKey =
        request.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY || "";
      const visualBriefApiKey = (anthropicKey || apiKey).replace(/[^\x20-\x7E]/g, "").trim();
      const visualBriefProvider = anthropicKey ? "claude" : imageProvider === "gemini" ? "gemini" : "openai";
      const requestOrigin = new URL(request.url).origin;
      const studioBrandPayload = serializeStudioBrandForDesigner(brand || null, requestOrigin);

      if (designerImage) {
        const size = postSizeIdToCanvasSize(
          postSizeId === "1080x1080-trns" ? "1080x1080" : postSizeId
        );
        const parsed =
          extractedFromClient && typeof extractedFromClient === "object"
            ? {
                heading: String(extractedFromClient.heading || ""),
                subheading: String(extractedFromClient.subheading || ""),
                footer: String(extractedFromClient.footer || ""),
              }
            : extractGeneratedContentFromSummary(contentSummary || "");
        const content = {
          heading: parsed.heading || "Content",
          subheading: parsed.subheading || parsed.heading || "",
          footer: parsed.footer || parsed.subheading || parsed.heading || "",
        };

        const rawBrief = [
          contentSummary || "",
          channel ? `Channel: ${channel}` : "",
          slot ? `Visual slot: ${slot}` : "",
          brand?.company_name ? `Brand: ${brand.company_name}` : "",
          brand?.visual_style?.image_style
            ? `Image style preference: ${brand.visual_style.image_style}`
            : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        const images = [];
        for (let i = 0; i < numVariants; i++) {
          const prompt = await buildDesignerOpenAiImagePrompt({
            content,
            rawContentForBrief: rawBrief,
            themeId: designerThemeId,
            size,
            designerWhiteBg,
            postSizeId,
            headerModeDesigner: true,
            apiKey,
            visualBriefApiKey,
            visualBriefProvider,
            omitContentTextInImage,
            variationIdx: i,
            layoutOverrides: { hideLogo: !!designerHideLogo },
            studioBrandPayload,
          });

          const response = await client.images.generate({
            model: openaiImageModel,
            prompt,
            n: 1,
            size: "1024x1024",
            quality: "high",
            output_format: "png",
          });

          const row = response.data?.[0];
          const b64 = row?.b64_json;
          const url = b64 ? `data:image/png;base64,${b64}` : row?.url;
          if (!url) {
            throw new Error("OpenAI returned no image data");
          }

          images.push({
            id: `img-${slot}-${i}`,
            url,
            revisedPrompt: row?.revised_prompt ?? prompt,
            designerMeta: {
              postSizeId,
              designerWhiteBg,
              designerThemeId,
              canvasSize: size,
            },
          });
        }

        return NextResponse.json({
          images,
          provider: "openai",
          pipeline: "designer",
        });
      }

      const prompt = buildImagePrompt({ channel, slot, brand, contentSummary });
      const size = slot.includes("og")
        ? "1536x1024"
        : slot.includes("carousel")
          ? "1024x1024"
          : "1536x1024";
      const images = [];
      for (let i = 0; i < numVariants; i++) {
        const response = await client.images.generate({
          model: openaiImageModel,
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
          throw new Error("OpenAI returned no image data");
        }

        images.push({
          id: `img-${slot}-${i}`,
          url,
          revisedPrompt: row?.revised_prompt ?? prompt,
        });
      }

      return NextResponse.json({ images, provider: "openai", pipeline: "legacy" });
    }

    if (provider === "nanobanana") {
      const apiKey =
        request.headers.get("x-nanobanana-key") || process.env.NANOBANANA_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          {
            error:
              "Nano Banana API key not configured. Add it in Settings (⚙) or set NANOBANANA_API_KEY in .env.local",
          },
          { status: 500 }
        );
      }

      const prompt = buildImagePrompt({ channel, slot, brand, contentSummary });

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
