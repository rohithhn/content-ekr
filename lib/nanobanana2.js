/**
 * Nano Banana 2 (NanoBanana API) — https://api.nanobananaapi.ai
 * POST /api/v1/nanobanana/generate-2 + poll GET /api/v1/nanobanana/record-info
 */

const NANOBANANA2_API_BASE = "https://api.nanobananaapi.ai/api/v1/nanobanana";

export function slotToNanoBanana2AspectRatio(slot) {
  const s = String(slot || "").toLowerCase();
  if (s.includes("carousel")) return "1:1";
  if (s.includes("og")) return "16:9";
  return "4:3";
}

function unwrapRecordPayload(json) {
  if (json && typeof json === "object" && json.data !== undefined && json.data !== null) {
    return json.data;
  }
  return json;
}

export async function generateNanoBanana2Image(apiKey, opts) {
  const {
    prompt,
    aspectRatio = "auto",
    resolution = "2K",
    outputFormat = "png",
  } = opts;

  const createRes = await fetch(`${NANOBANANA2_API_BASE}/generate-2`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      imageUrls: [],
      aspectRatio,
      resolution,
      googleSearch: false,
      outputFormat,
    }),
  });

  const createJson = await createRes.json().catch(() => ({}));
  if (!createRes.ok || createJson.code !== 200) {
    const msg =
      createJson.message ||
      createJson.msg ||
      (typeof createJson === "string" ? createJson : JSON.stringify(createJson));
    throw new Error(`Nano Banana 2: ${msg || createRes.statusText || "create task failed"}`);
  }

  const taskId = createJson.data?.taskId;
  if (!taskId) {
    throw new Error("Nano Banana 2: no taskId in response");
  }

  const deadline = Date.now() + 110_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 2000));

    const infoRes = await fetch(
      `${NANOBANANA2_API_BASE}/record-info?taskId=${encodeURIComponent(taskId)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    const info = await infoRes.json().catch(() => ({}));
    const payload = unwrapRecordPayload(info);
    const flag = payload?.successFlag;

    if (flag === 1) {
      const resp = payload?.response || {};
      const url = resp.resultImageUrl || resp.originImageUrl;
      if (!url) throw new Error("Nano Banana 2: completed but no image URL");
      return url;
    }
    if (flag === 2 || flag === 3) {
      const err = payload?.errorMessage || info?.msg || "generation failed";
      throw new Error(`Nano Banana 2: ${err}`);
    }
  }

  throw new Error("Nano Banana 2: timed out waiting for image (try again or increase server timeout)");
}
