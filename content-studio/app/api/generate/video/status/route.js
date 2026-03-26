import { NextResponse } from "next/server";

/** https://docs.kie.ai/market/common/get-task-detail */
const KIE_RECORD_INFO = "https://api.kie.ai/api/v1/jobs/recordInfo";

function parseResultUrls(resultJson) {
  if (!resultJson || typeof resultJson !== "string") return [];
  try {
    const parsed = JSON.parse(resultJson);
    if (Array.isArray(parsed?.resultUrls)) {
      return parsed.resultUrls.filter((u) => typeof u === "string" && u.trim());
    }
  } catch {
    /* ignore */
  }
  return [];
}

/**
 * GET /api/generate/video/status?taskId=...
 *
 * Proxies Kie AI Get Task Details (recordInfo). Auth: x-kling-key or server env keys.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId")?.trim();
    if (!taskId) {
      return NextResponse.json({ error: "taskId query parameter is required" }, { status: 400 });
    }

    const apiKey =
      request.headers.get("x-kling-key") ||
      process.env.KIE_AI_API_KEY ||
      process.env.KLING_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Kie AI API key not configured. Add it in Settings (⚙) or set KIE_AI_API_KEY (or KLING_API_KEY) in .env.local",
        },
        { status: 500 }
      );
    }

    const url = `${KIE_RECORD_INFO}?taskId=${encodeURIComponent(taskId)}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey.replace(/[^\x20-\x7E]/g, "").trim()}`,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const msg = data?.msg || data?.message || response.statusText;
      return NextResponse.json(
        { error: `Kie AI error (${response.status}): ${msg}`, code: data?.code },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502 }
      );
    }

    if (data.code !== 200) {
      return NextResponse.json(
        {
          error: data.msg || "Kie AI rejected the status request",
          code: data.code,
        },
        { status: 502 }
      );
    }

    const row = data.data;
    if (!row || typeof row !== "object") {
      return NextResponse.json({ error: "Kie AI returned no task data", raw: data }, { status: 502 });
    }

    const state = typeof row.state === "string" ? row.state : "unknown";
    const videoUrls = state === "success" ? parseResultUrls(row.resultJson) : [];

    return NextResponse.json({
      taskId: row.taskId || taskId,
      state,
      model: row.model,
      videoUrls,
      failCode: row.failCode || "",
      failMsg: row.failMsg || "",
      progress: typeof row.progress === "number" ? row.progress : null,
    });
  } catch (error) {
    console.error("Video task status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch task status" },
      { status: 500 }
    );
  }
}
