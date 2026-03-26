/** Canonical defaults + normalization so partial `textColorSettings` never drops slots when spreading. */

import { ENKRYPT_GRADIENT_START } from "@studio-brand";

export interface SlotColorSettingsNorm {
  baseColor: string;
  useGradient: boolean;
  wordStyles: Record<
    number,
    {
      color?: string;
      bold?: boolean;
      strikethrough?: boolean;
      fontSize?: number;
      weight?: number;
      useGradient?: boolean;
    }
  >;
}

export type TextColorSettingsNorm = {
  heading: SlotColorSettingsNorm;
  subheading: SlotColorSettingsNorm;
  footer: SlotColorSettingsNorm;
};

/** Standalone designer: heading/footer = brand marketing primary (gradient when enabled); subheading = black. Embed uses Brand Editor primary the same way. */
export const DEFAULT_TEXT_COLOR_SETTINGS: TextColorSettingsNorm = {
  heading: {
    baseColor: ENKRYPT_GRADIENT_START,
    useGradient: true,
    wordStyles: {},
  },
  subheading: { baseColor: "#000000", useGradient: false, wordStyles: {} },
  footer: {
    baseColor: ENKRYPT_GRADIENT_START,
    useGradient: true,
    wordStyles: {},
  },
};

function mergeWordStyles(
  a: SlotColorSettingsNorm["wordStyles"],
  b: SlotColorSettingsNorm["wordStyles"] | undefined,
): SlotColorSettingsNorm["wordStyles"] {
  return { ...a, ...b };
}

function normSlot(
  key: keyof TextColorSettingsNorm,
  slot: Partial<SlotColorSettingsNorm> | undefined,
): SlotColorSettingsNorm {
  const base = DEFAULT_TEXT_COLOR_SETTINGS[key];
  if (!slot || typeof slot !== "object") return { ...base, wordStyles: { ...base.wordStyles } };
  return {
    baseColor: typeof slot.baseColor === "string" && slot.baseColor.trim()
      ? slot.baseColor.trim()
      : base.baseColor,
    useGradient: typeof slot.useGradient === "boolean" ? slot.useGradient : base.useGradient,
    wordStyles:
      slot.wordStyles && typeof slot.wordStyles === "object"
        ? mergeWordStyles(base.wordStyles, slot.wordStyles)
        : { ...base.wordStyles },
  };
}

/** Fill missing heading/subheading/footer so spreads never omit slots. */
export function normalizeTextColorSettings(
  raw: Partial<TextColorSettingsNorm> | null | undefined,
): TextColorSettingsNorm {
  return {
    heading: normSlot("heading", raw?.heading),
    subheading: normSlot("subheading", raw?.subheading),
    footer: normSlot("footer", raw?.footer),
  };
}

/** Merge a patch from RightPanel / LeftPanel without wiping sibling slots. */
export function mergeTextColorSettingsPatch(
  prevRaw: Partial<TextColorSettingsNorm> | null | undefined,
  patchRaw: Partial<TextColorSettingsNorm> | null | undefined,
): TextColorSettingsNorm {
  const prev = normalizeTextColorSettings(prevRaw);
  if (!patchRaw || typeof patchRaw !== "object") return prev;
  const mergeOne = (key: keyof TextColorSettingsNorm): SlotColorSettingsNorm => {
    const p = patchRaw[key];
    if (!p || typeof p !== "object") return prev[key];
    return {
      ...prev[key],
      ...p,
      wordStyles: mergeWordStyles(prev[key].wordStyles, p.wordStyles),
    };
  };
  return {
    heading: mergeOne("heading"),
    subheading: mergeOne("subheading"),
    footer: mergeOne("footer"),
  };
}

/** `<input type="color">` requires #rrggbb; invalid values confuse the browser across repeated inputs. */
export function hexForColorInput(value: string | undefined, fallback: string): string {
  const fbRaw = (fallback || "#000000").trim();
  const fbH = fbRaw.startsWith("#") ? fbRaw : `#${fbRaw}`;
  const fallbackOk =
    /^#[0-9a-fA-F]{6}$/.test(fbH) ? `#${fbH.slice(1).toLowerCase()}` : "#000000";

  const v = (value || "").trim();
  if (!v) return fallbackOk;
  const h = v.startsWith("#") ? v : `#${v}`;
  if (/^#[0-9a-fA-F]{6}$/.test(h)) return `#${h.slice(1).toLowerCase()}`;
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    const x = h.slice(1);
    const d = x.split("").map((c) => c + c).join("");
    return `#${d.toLowerCase()}`;
  }
  return fallbackOk;
}
