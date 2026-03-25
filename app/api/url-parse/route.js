import { NextRequest, NextResponse } from "next/server";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

/**
 * POST /api/url-parse
 * 
 * Fetches a URL, extracts the main article content using Mozilla Readability,
 * and returns clean text suitable for content repurposing.
 * 
 * Body: { url: string }
 */
export async function POST(request) {
  try {
    const { url } = await request.json();

    if (!url || !url.startsWith("http")) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Fetch the page with a realistic user agent
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${response.status} ${response.statusText}` },
        { status: 422 }
      );
    }

    const html = await response.text();

    // Parse with JSDOM + Readability
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return NextResponse.json(
        { error: "Could not extract article content from this URL" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      title: article.title,
      byline: article.byline,
      content: article.textContent.trim(),
      excerpt: article.excerpt,
      siteName: article.siteName,
      length: article.length,
      // Truncate content if extremely long (>15K chars)
      truncated: article.textContent.length > 15000,
    });
  } catch (error) {
    console.error("URL parse error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse URL" },
      { status: 500 }
    );
  }
}
