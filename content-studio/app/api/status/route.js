import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    gemini: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY),
    nanobanana: !!process.env.NANOBANANA_API_KEY,
    kling: !!(process.env.KIE_AI_API_KEY || process.env.KLING_API_KEY),
  });
}
