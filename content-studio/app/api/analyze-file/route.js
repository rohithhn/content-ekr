import { NextResponse } from "next/server";
import mammoth from "mammoth";
import {
  prepareSourceWithClaude,
  prepareSourceFromImage,
  prepareSourceFromPdfDocument,
} from "@/lib/ai/sourcePreparation";

export const runtime = "nodejs";

const MAX_BYTES = 12 * 1024 * 1024;

const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function extractPdfText(buffer) {
  const mod = await import("pdf-parse");
  const pdfParse = mod.default ?? mod;
  const data = await pdfParse(buffer);
  return (data.text || "").trim();
}

/**
 * POST /api/analyze-file  (multipart/form-data)
 * Fields: file (required), channels (JSON string array), templateId (string), willGenerateImages ("true"|"false")
 * Sends extracted or native content to Claude and returns preparedInput for the content bundle.
 */
export async function POST(request) {
  try {
    const apiKey = request.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured. Add it in Settings or set ANTHROPIC_API_KEY." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    let channels = [];
    let templateId = null;
    let willGenerateImages = true;
    try {
      const c = formData.get("channels");
      if (c && typeof c === "string") channels = JSON.parse(c);
    } catch {
      channels = [];
    }
    const t = formData.get("templateId");
    if (t && typeof t === "string" && t.trim()) templateId = t.trim();
    const w = formData.get("willGenerateImages");
    if (w === "false" || w === "0") willGenerateImages = false;

    const name = file.name || "upload";
    const mime = (file.type || "").toLowerCase() || "application/octet-stream";
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        {
          error: `Unsupported file type (${mime}). Use PNG, JPEG, WebP, GIF, PDF, or DOCX.`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 12 MB)" }, { status: 400 });
    }

    if (mime.startsWith("image/")) {
      const mediaType = mime === "image/jpg" ? "image/jpeg" : mime;
      const b64 = buffer.toString("base64");
      const { preparedInput, model } = await prepareSourceFromImage({
        apiKey,
        base64: b64,
        mediaType,
        fileName: name,
        channels,
        templateId,
        willGenerateImages,
      });
      return NextResponse.json({
        preparedInput,
        model,
        sourceKind: "image",
        fileName: name,
      });
    }

    if (mime === "application/pdf") {
      let extracted = "";
      try {
        extracted = await extractPdfText(buffer);
      } catch (err) {
        console.warn("pdf-parse failed:", err);
      }
      if (extracted.length < 80) {
        const { preparedInput, model } = await prepareSourceFromPdfDocument({
          apiKey,
          pdfBase64: buffer.toString("base64"),
          channels,
          templateId,
          willGenerateImages,
          fileName: name,
        });
        return NextResponse.json({
          preparedInput,
          model,
          sourceKind: "pdf",
          fileName: name,
          note: "PDF read with Claude (scanned or low extracted text)",
        });
      }
      const { preparedInput, model } = await prepareSourceWithClaude({
        apiKey,
        articleText: extracted,
        title: name,
        channels,
        templateId,
        willGenerateImages,
      });
      return NextResponse.json({
        preparedInput,
        model,
        sourceKind: "pdf",
        fileName: name,
      });
    }

    const { value } = await mammoth.extractRawText({ buffer });
    const text = (value || "").trim();
    if (!text) {
      return NextResponse.json(
        { error: "Could not extract text from this Word document" },
        { status: 422 }
      );
    }
    const { preparedInput, model } = await prepareSourceWithClaude({
      apiKey,
      articleText: text,
      title: name,
      channels,
      templateId,
      willGenerateImages,
    });
    return NextResponse.json({
      preparedInput,
      model,
      sourceKind: "docx",
      fileName: name,
    });
  } catch (error) {
    console.error("analyze-file error:", error);
    return NextResponse.json(
      { error: error.message || "analyze-file failed" },
      { status: 500 }
    );
  }
}
