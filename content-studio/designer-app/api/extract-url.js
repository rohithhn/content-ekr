/**
 * Vercel Serverless — extracts readable text from a public URL (no browser CORS).
 * Local `vite` dev: handled by vite.config.ts middleware (same logic via extract-url-core).
 */
import { extractReadablePage } from "./extract-url-core.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body || "{}");
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }
  const url = body?.url;
  if (!url || typeof url !== "string") return res.status(400).json({ error: "Missing url" });

  try {
    const { title, text, url: finalUrl } = await extractReadablePage(url);
    return res.status(200).json({ title, text, url: finalUrl });
  } catch (e) {
    const status = e?.status && Number.isInteger(e.status) ? e.status : 502;
    return res.status(status).json({ error: e?.message || "Fetch error" });
  }
}
