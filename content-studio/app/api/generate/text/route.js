import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/prompts/system-prompts";
import { composeSystemPromptWithEnkryptSkill } from "@/lib/prompts/load-enkrypt-frontend-skill";

/**
 * POST /api/generate/text
 * 
 * Generates text content using Claude Opus 4.6 with brand context injection.
 * Supports streaming responses for real-time UI updates.
 * 
 * Body: {
 *   input: string,           // User's content brief, URL content, or topic
 *   channel: string,         // linkedin | twitter | blog | article | landing
 *   templateId?: string,     // hot-take | product-launch | lessons-learned | etc.
 *   brand?: object,          // Full brand profile object
 *   numVariants?: number,    // 1-4 text variants to generate
 *   tone?: string,           // Override tone (Professional, Bold, etc.)
 *   stream?: boolean,        // Enable streaming response
 * }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { input, channel, templateId, brand, numVariants = 1, tone, stream = false } = body;

    if (!input || !channel) {
      return NextResponse.json(
        { error: "Missing required fields: input, channel" },
        { status: 400 }
      );
    }

    const apiKey = request.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured. Add it in Settings (⚙) or set ANTHROPIC_API_KEY in .env.local" },
        { status: 500 }
      );
    }

    const client = new Anthropic({ apiKey });

    // Channel + template + brand; landing channel also gets full enkrypt-frontend-design skill body (bundled markdown).
    const systemPrompt = composeSystemPromptWithEnkryptSkill(
      buildSystemPrompt({
        channel,
        templateId: templateId || null,
        brand: brand || null,
        numVariants,
      }),
      channel
    );

    // Landing: frame source/topic as the only brief (no manual skill paste required).
    let userMessage = input;
    if (channel === "landing") {
      userMessage = `[LANDING PAGE — source-driven task]
Produce only the <section>…</section> HTML blocks required by the system prompt (Enkrypt marketing shell, Lucide data-lucide icons in .feature-icon, etc.). Derive headlines, benefits, stats, and FAQs from the material below. Do not ask for extra pastes or omit the skill rules.\n\n---\n\n${userMessage}`;
    }
    if (tone && tone !== "Professional") {
      userMessage = `[TONE: ${tone} — adjust the voice and energy level to match this tone while maintaining brand guidelines]\n\n${userMessage}`;
    }

    if (stream) {
      // Streaming response
      const streamResponse = await client.messages.stream({
        model: "claude-sonnet-4-20250514", // Use Sonnet for speed in streaming; switch to Opus for final
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      // Return as a ReadableStream
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
    } else {
      // Non-streaming response
      const message = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      const text = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");

      // Parse variants if multiple were requested
      const variants = parseVariants(text, numVariants);

      return NextResponse.json({
        variants,
        model: message.model,
        usage: message.usage,
      });
    }
  } catch (error) {
    console.error("Text generation error:", error);
    return NextResponse.json(
      { error: error.message || "Text generation failed" },
      { status: 500 }
    );
  }
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
  
  // Try to split on variant markers
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

  // Fallback: if variant markers weren't found, return the whole text as one variant
  if (variants.length === 0) {
    return [{ id: "v-0", label: "A", text: text.trim() }];
  }

  return variants;
}
