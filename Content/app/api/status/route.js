import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openai: !!process.env.OPENAI_API_KEY,
    nanobanana: !!process.env.NANOBANANA_API_KEY,
    kling: !!process.env.KLING_API_KEY,
  });
}
