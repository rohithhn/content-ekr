export type ExtractUrlResult = { title: string; text: string; url: string };

export async function fetchExtractUrl(url: string): Promise<ExtractUrlResult> {
  const r = await fetch("/api/extract-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: url.trim() }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const hint =
      r.status === 404
        ? " /api/extract-url not found — use `npm run dev` (Vite serves it locally) or deploy to Vercel."
        : "";
    throw new Error((data.error || `Request failed (${r.status})`) + hint);
  }
  if (!data.text) throw new Error("No text extracted");
  return { title: data.title || "", text: data.text, url: data.url || url };
}
