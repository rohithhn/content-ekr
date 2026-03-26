import { NextResponse } from "next/server";

function callbackHtml(payload) {
  const data = JSON.stringify(payload).replace(/</g, "\\u003c");
  return `<!doctype html>
<html>
  <head><meta charset="utf-8"><title>Notion Connected</title></head>
  <body style="font-family:system-ui;background:#0f1115;color:#e5e7eb;padding:24px;">
    <h2 style="margin:0 0 8px;">Connecting Notion…</h2>
    <p style="opacity:.8;margin:0;">You can close this window if it does not close automatically.</p>
    <script>
      (function () {
        var payload = ${data};
        try {
          if (window.opener && !window.opener.closed) {
            window.opener.postMessage(payload, window.location.origin);
          }
        } catch (e) {}
        setTimeout(function(){ window.close(); }, 120);
      })();
    </script>
  </body>
</html>`;
}

export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const err = url.searchParams.get("error");
  const errDesc = url.searchParams.get("error_description");

  if (err) {
    return new NextResponse(
      callbackHtml({
        source: "ce-notion-oauth",
        ok: false,
        error: errDesc || err,
        state,
      }),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  if (!code) {
    return new NextResponse(
      callbackHtml({ source: "ce-notion-oauth", ok: false, error: "Missing OAuth code", state }),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const clientId = process.env.NOTION_CLIENT_ID;
  const clientSecret = process.env.NOTION_CLIENT_SECRET;
  const redirectUri = process.env.NOTION_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return new NextResponse(
      callbackHtml({
        source: "ce-notion-oauth",
        ok: false,
        error: "Server missing NOTION_CLIENT_ID / NOTION_CLIENT_SECRET / NOTION_REDIRECT_URI",
        state,
      }),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.access_token) {
      throw new Error(data?.error_description || data?.error || "OAuth token exchange failed");
    }

    return new NextResponse(
      callbackHtml({
        source: "ce-notion-oauth",
        ok: true,
        state,
        token: data.access_token,
        workspace_name: data.workspace_name || "",
        workspace_id: data.workspace_id || "",
      }),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    return new NextResponse(
      callbackHtml({
        source: "ce-notion-oauth",
        ok: false,
        error: error.message || "OAuth callback failed",
        state,
      }),
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}
