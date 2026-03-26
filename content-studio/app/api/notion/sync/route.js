import { NextResponse } from "next/server";

const NOTION_VERSION = "2022-06-28";
const MAX_PAGE_TEXT = 8000;
const MAX_PAGES = 8;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

function extractPageIdFromUrl(rawUrl) {
  const s = String(rawUrl || "").trim();
  if (!s) return null;
  const m = s.match(/([a-f0-9]{32})/i);
  return m ? m[1].toLowerCase() : null;
}

function richTextToString(rt) {
  if (!Array.isArray(rt)) return "";
  return rt.map((x) => x?.plain_text || "").join("");
}

function blockToText(block) {
  const t = block?.type;
  if (!t || !block[t]) return "";
  const node = block[t];
  if (typeof node?.text === "string") return node.text;
  if (Array.isArray(node?.rich_text)) return richTextToString(node.rich_text);
  if (Array.isArray(node?.title)) return richTextToString(node.title);
  return "";
}

async function fetchBlocksText(token, blockId) {
  let cursor = null;
  const lines = [];
  let guard = 0;
  do {
    const u = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    if (cursor) u.searchParams.set("start_cursor", cursor);
    u.searchParams.set("page_size", "100");
    const response = await fetch(u.toString(), { headers: headers(token), cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.message || "Failed to fetch Notion blocks");
    const results = Array.isArray(data.results) ? data.results : [];
    for (const b of results) {
      const line = blockToText(b).trim();
      if (line) lines.push(line);
      if (lines.join("\n").length >= MAX_PAGE_TEXT) break;
    }
    if (lines.join("\n").length >= MAX_PAGE_TEXT) break;
    cursor = data.has_more ? data.next_cursor : null;
    guard += 1;
  } while (cursor && guard < 20);
  return lines.join("\n").slice(0, MAX_PAGE_TEXT);
}

async function fetchPageWithText(token, pageOrDb) {
  const id = pageOrDb?.id;
  if (!id) return null;
  const props = pageOrDb.properties || {};
  const titleProp = Object.values(props).find((x) => x?.type === "title");
  const title = richTextToString(titleProp?.title || []).trim() || "Untitled";
  const text = await fetchBlocksText(token, id);
  return { id, title, url: pageOrDb.url || "", text };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const token = String(body?.token || "").trim();
    const pageUrls = Array.isArray(body?.pageUrls) ? body.pageUrls : [];
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const pageIds = pageUrls.map(extractPageIdFromUrl).filter(Boolean).slice(0, MAX_PAGES);
    const synced = [];

    if (pageIds.length) {
      for (const pageId of pageIds) {
        const response = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
          headers: headers(token),
          cache: "no-store",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) continue;
        const page = await fetchPageWithText(token, data);
        if (page?.text) synced.push(page);
      }
    } else {
      const response = await fetch("https://api.notion.com/v1/search", {
        method: "POST",
        headers: headers(token),
        body: JSON.stringify({
          filter: { property: "object", value: "page" },
          page_size: MAX_PAGES,
          sort: { direction: "descending", timestamp: "last_edited_time" },
        }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Notion search failed");
      }
      const results = Array.isArray(data.results) ? data.results : [];
      for (const pageOrDb of results) {
        const page = await fetchPageWithText(token, pageOrDb);
        if (page?.text) synced.push(page);
      }
    }

    return NextResponse.json({
      pages: synced.map((p) => ({
        id: p.id,
        title: p.title,
        url: p.url,
        content: p.text,
      })),
      count: synced.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Notion sync failed" }, { status: 500 });
  }
}
