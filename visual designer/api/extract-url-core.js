/**
 * Shared URL → { title, text, url } for Vercel serverless and Vite dev middleware.
 */

/**
 * @param {string} urlString
 * @returns {Promise<{ title: string, text: string, url: string }>}
 */
export async function extractReadablePage(urlString) {
  let parsed;
  try {
    parsed = new URL(String(urlString).trim());
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    const err = new Error("Invalid URL");
    err.status = 400;
    throw err;
  }

  const r = await fetch(parsed.href, {
    headers: {
      "User-Agent": "EnkryptContentBot/1.0 (+https://enkrypt.ai)",
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!r.ok) {
    const err = new Error(`Fetch failed: HTTP ${r.status}`);
    err.status = 502;
    throw err;
  }
  const html = await r.text();
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim().slice(0, 200) : "";
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|br|h[1-6]|li|tr|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length > 100000) text = `${text.slice(0, 100000)}\n\n[truncated]`;
  return { title, text, url: parsed.href };
}
