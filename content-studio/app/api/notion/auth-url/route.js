import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const state = typeof body.state === "string" ? body.state.trim() : "";
    if (!state) {
      return NextResponse.json({ error: "Missing OAuth state" }, { status: 400 });
    }
    const clientId = process.env.NOTION_CLIENT_ID;
    const redirectUri = process.env.NOTION_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Notion OAuth is not configured on the server" },
        { status: 500 }
      );
    }

    const authUrl = new URL("https://api.notion.com/v1/oauth/authorize");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("owner", "user");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    return NextResponse.json({ url: authUrl.toString() });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to build auth URL" }, { status: 500 });
  }
}
