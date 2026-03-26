/**
 * Parse AI output into separate variants when multiple were requested.
 * Looks for [VARIANT A], [VARIANT B], etc. markers.
 * Shared by `/api/generate/text` and streaming client assembly.
 */
export function parseTextVariants(text, expectedCount) {
  const raw = String(text || "").trim();
  if (expectedCount <= 1) {
    return [{ id: "v-0", label: "A", text: raw }];
  }

  const variants = [];
  const labels = ["A", "B", "C", "D", "E"];

  for (let i = 0; i < expectedCount; i++) {
    const label = labels[i];
    const marker = `[VARIANT ${label}]`;
    const nextMarker = i < expectedCount - 1 ? `[VARIANT ${labels[i + 1]}]` : null;

    const startIdx = raw.indexOf(marker);
    if (startIdx === -1) continue;

    const contentStart = startIdx + marker.length;
    const endIdx = nextMarker ? raw.indexOf(nextMarker) : raw.length;

    variants.push({
      id: `v-${i}`,
      label,
      text: raw.substring(contentStart, endIdx === -1 ? raw.length : endIdx).trim(),
    });
  }

  if (variants.length === 0) {
    return [{ id: "v-0", label: "A", text: raw }];
  }

  return variants;
}
