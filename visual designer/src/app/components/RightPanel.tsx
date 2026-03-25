import { useState } from "react";
import { ChevronDown } from "lucide-react";

/* ── Types (aligned with App Settings) ── */
interface TextSlotPos {
  yPct: number;
}

interface WordStyle {
  color?: string;
  bold?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  weight?: number;
  useGradient?: boolean;
}

interface SlotColorSettings {
  baseColor: string;
  useGradient: boolean;
  wordStyles: Record<number, WordStyle>;
}

interface GeneratedContent {
  heading: string;
  subheading: string;
  footer: string;
}

export interface RightPanelSettings {
  content: GeneratedContent | null;
  useHeading: boolean;
  useSubheading: boolean;
  useFooter: boolean;
  fontSettings: {
    heading: { size: number; weight: number };
    subheading: { size: number; weight: number };
    footer: { size: number; weight: number };
  };
  visualSlot: { widthPct: number; heightPct: number; yPct: number };
  /** Rounded corners on the generated visual (px at export resolution) */
  visualImageBorderRadius?: number;
  textSlots: {
    heading: TextSlotPos;
    subheading: TextSlotPos;
    footer: TextSlotPos;
  };
  slotGap?: number;
  textColorSettings?: {
    heading: SlotColorSettings;
    subheading: SlotColorSettings;
    footer: SlotColorSettings;
  };
}

interface RightPanelProps {
  settings: RightPanelSettings | null;
  onSettingsChange: (patch: Partial<RightPanelSettings>) => void;
  onContentGenerated?: (content: GeneratedContent) => void;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block mb-1.5 text-foreground" style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
      {children}
    </label>
  );
}

/** Grouped panel block with optional hint — keeps hierarchy scannable without hiding controls */
function SettingsSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius)] border border-border bg-card/30 overflow-hidden mb-3">
      <div className="px-3 py-2.5 border-b border-border/80 bg-muted/40">
        <h2 className="text-foreground m-0" style={{ fontSize: "var(--text-sm)", fontWeight: 700, letterSpacing: "0.02em" }}>
          {title}
        </h2>
        {hint ? (
          <p className="text-muted-foreground m-0 mt-1" style={{ fontSize: "var(--text-2xs)", lineHeight: 1.45 }}>
            {hint}
          </p>
        ) : null}
      </div>
      <div className="p-3 space-y-3">{children}</div>
    </section>
  );
}

/** Collapsible for dense areas; all features stay available, default open */
function CollapsibleBlock({
  title,
  hint,
  defaultOpen = true,
  children,
}: {
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details defaultOpen={defaultOpen} className="group rounded-[var(--radius)] border border-border/90 bg-muted/20 overflow-hidden">
      <summary className="cursor-pointer list-none flex items-start justify-between gap-2 px-3 py-2.5 hover:bg-muted/50 transition-colors rounded-[var(--radius)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-card [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1">
          <span className="text-foreground block" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
            {title}
          </span>
          {hint ? (
            <span className="text-muted-foreground block mt-0.5" style={{ fontSize: "var(--text-2xs)", lineHeight: 1.4 }}>
              {hint}
            </span>
          ) : null}
        </div>
        <ChevronDown
          className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="px-3 pb-3 pt-0 border-t border-border/60 space-y-3">{children}</div>
    </details>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ opacity: disabled ? 0.4 : 1 }}>
      <div className="flex justify-between mb-1.5" style={{ fontSize: "var(--text-sm)" }}>
        <span className="text-foreground" style={{ fontWeight: 600 }}>{label}</span>
        <span className="text-foreground">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        disabled={disabled}
        className="w-full h-1.5 rounded-sm appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: "var(--border)" }}
      />
      <div className="flex justify-between mt-0.5" style={{ fontSize: "var(--text-sm)" }}>
        <span className="text-muted-foreground">{min}{unit}</span>
        <span className="text-muted-foreground">{max}{unit}</span>
      </div>
    </div>
  );
}

const defaultTextColorSettings = {
  heading: { baseColor: "#FFFFFF", useGradient: true, wordStyles: {} as Record<number, WordStyle> },
  subheading: { baseColor: "#000000", useGradient: false, wordStyles: {} as Record<number, WordStyle> },
  footer: { baseColor: "#FFFFFF", useGradient: true, wordStyles: {} as Record<number, WordStyle> },
};

export function RightPanel({ settings, onSettingsChange, onContentGenerated }: RightPanelProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState<GeneratedContent>({ heading: "", subheading: "", footer: "" });
  const [selectedWord, setSelectedWord] = useState<{ field: "heading" | "subheading" | "footer"; index: number } | null>(null);

  if (!settings) {
    return (
      <div className="bg-muted border-l border-border p-4 sm:p-5 overflow-y-auto flex items-center justify-center" style={{ minHeight: "calc(100vh - 120px)" }}>
        <p className="text-muted-foreground" style={{ fontSize: "var(--text-sm)" }}>Generate content to see advanced settings.</p>
      </div>
    );
  }

  const s = settings;
  const content = s.content ?? { heading: "", subheading: "", footer: "" };
  const visualSlot = s.visualSlot ?? { widthPct: 100, heightPct: 100, yPct: 14 };
  const visualImageBorderRadius = s.visualImageBorderRadius ?? 12;
  const textSlots = s.textSlots ?? { heading: { yPct: 7 }, subheading: { yPct: 10 }, footer: { yPct: 80 } };
  const fontSettings = s.fontSettings ?? {
    heading: { size: 40, weight: 600 },
    subheading: { size: 27, weight: 600 },
    footer: { size: 24, weight: 400 },
  };
  const tColors = s.textColorSettings ?? defaultTextColorSettings;
  const useH = s.useHeading;
  const useSH = s.useSubheading;
  const useF = s.useFooter;

  const editableFields: ("heading" | "subheading" | "footer")[] = ["heading", "subheading", "footer"];
  const fieldLabels: Record<string, string> = { heading: "Heading", subheading: "Subheading", footer: "Footer" };
  const fieldChecks = { heading: useH, subheading: useSH, footer: useF };

  const handleEditToggle = () => {
    if (isEditMode && (editValues.heading || editValues.subheading || editValues.footer)) {
      onSettingsChange({ content: editValues });
      onContentGenerated?.(editValues);
    } else if (s.content) {
      setEditValues({ ...s.content });
    }
    setIsEditMode(!isEditMode);
  };

  const inputClass = "w-full px-3 py-2.5 border-2 border-border rounded-[var(--radius)] bg-input-background text-foreground transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

  return (
    <div className="bg-muted border-l border-border p-4 sm:p-5 overflow-y-auto" style={{ maxHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <header className="mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-[18px] bg-primary rounded-sm shrink-0" aria-hidden />
          <div className="min-w-0">
            <span className="text-foreground block" style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>
              Advanced settings
            </span>
            <p className="text-muted-foreground m-0 mt-1" style={{ fontSize: "var(--text-2xs)", lineHeight: 1.45 }}>
              Tune text, layout, and typography. The preview updates live; nothing here runs a new AI job unless you generate from the left panel.
            </p>
          </div>
        </div>
      </header>

      {/* 1 — Text on canvas (content + visibility) */}
      {content && (content.heading || content.subheading || content.footer) && (
        <SettingsSection
          title="Text on canvas"
          hint="Edit copy and choose which lines show. Off = hidden in the preview (layout still reserves space where applicable)."
        >
          <div className="flex justify-end -mt-1 mb-1">
            <button
              type="button"
              className="cursor-pointer bg-primary/10 hover:bg-primary/15 text-primary border border-primary/25 rounded-[var(--radius-utility)] px-2.5 py-1 transition-colors"
              style={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}
              onClick={handleEditToggle}
            >
              {isEditMode ? "Save changes" : "Edit text"}
            </button>
          </div>
          {editableFields.map((field) => (
            <div key={field} className="rounded-[var(--radius)] border border-border/80 bg-background/40 p-2.5">
              <div className="flex justify-between items-center gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-foreground truncate" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                    {fieldLabels[field]}
                  </span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer shrink-0" style={{ fontSize: "var(--text-2xs)" }}>
                  <span className="text-muted-foreground whitespace-nowrap">Show on canvas</span>
                  <input
                    type="checkbox"
                    checked={fieldChecks[field]}
                    onChange={(e) => {
                      const v = e.target.checked;
                      if (field === "heading") onSettingsChange({ useHeading: v });
                      else if (field === "subheading") onSettingsChange({ useSubheading: v });
                      else onSettingsChange({ useFooter: v });
                    }}
                    className="w-4 h-4 cursor-pointer accent-primary"
                  />
                </label>
              </div>
              {isEditMode ? (
                <input
                  type="text"
                  className={inputClass}
                  style={{ fontSize: "var(--text-sm)" }}
                  value={editValues[field]}
                  onChange={(e) => setEditValues((prev) => ({ ...prev, [field]: e.target.value }))}
                />
              ) : (
                <div
                  className="p-2 border rounded-[var(--radius)] text-foreground"
                  style={{
                    fontSize: "var(--text-sm)",
                    lineHeight: 1.4,
                    background: fieldChecks[field] ? "var(--card)" : "var(--muted)",
                    borderColor: fieldChecks[field] ? "var(--border)" : "var(--muted)",
                    opacity: fieldChecks[field] ? 1 : 0.5,
                  }}
                >
                  {content[field]}
                </div>
              )}
            </div>
          ))}
        </SettingsSection>
      )}

      {/* 2 — Layout */}
      <SettingsSection
        title="Layout"
        hint="Visual area size and vertical text anchors. Height % is share of the space between your text blocks and the footer."
      >
        <CollapsibleBlock
          title="Visual area (generated image)"
          hint="Width, height (% of available vertical space), and vertical position."
          defaultOpen
        >
          <SliderControl
            label="Width (% of canvas)"
            value={visualSlot.widthPct}
            min={20}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => onSettingsChange({ visualSlot: { ...visualSlot, widthPct: v } })}
          />
          <SliderControl
            label="Height (% of space above footer)"
            value={visualSlot.heightPct}
            min={10}
            max={100}
            step={1}
            unit="%"
            onChange={(v) => onSettingsChange({ visualSlot: { ...visualSlot, heightPct: v } })}
          />
          <SliderControl
            label="Vertical position (Y)"
            value={visualSlot.yPct}
            min={2}
            max={95}
            step={1}
            unit="%"
            onChange={(v) => onSettingsChange({ visualSlot: { ...visualSlot, yPct: v } })}
          />
          <SliderControl
            label="Image corner radius"
            value={visualImageBorderRadius}
            min={0}
            max={200}
            step={1}
            unit="px"
            onChange={(v) => onSettingsChange({ visualImageBorderRadius: v })}
          />
        </CollapsibleBlock>

        <CollapsibleBlock
          title="Text vertical position"
          hint="Moves each text band up/down (% from top). Disabled when that line is hidden."
          defaultOpen
        >
          {editableFields.map((slot) => {
            const slotColors: Record<string, string> = {
              heading: "var(--primary)",
              subheading: "var(--accent)",
              footer: "var(--destructive)",
            };
            const ts = textSlots[slot];
            const isEnabled = fieldChecks[slot];
            return (
              <div key={slot}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: slotColors[slot] }} title={fieldLabels[slot]} />
                  <span className="text-muted-foreground" style={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}>
                    {fieldLabels[slot]}
                    {!isEnabled ? " — hidden" : ""}
                  </span>
                </div>
                <SliderControl
                  label="Y position"
                  value={ts.yPct}
                  min={2}
                  max={95}
                  step={1}
                  unit="%"
                  disabled={!isEnabled}
                  onChange={(v) => onSettingsChange({ textSlots: { ...textSlots, [slot]: { yPct: v } } })}
                />
              </div>
            );
          })}
        </CollapsibleBlock>

        <CollapsibleBlock title="Spacing" hint="Extra gap between heading, subheading, visual, and footer." defaultOpen>
          <SliderControl
            label="Gap between slots"
            value={s.slotGap ?? 14}
            min={0}
            max={48}
            step={2}
            unit="px"
            onChange={(v) => onSettingsChange({ slotGap: v })}
          />
        </CollapsibleBlock>
      </SettingsSection>

      {/* 3 — Typography & colors */}
      <SettingsSection
        title="Typography & colors"
        hint="Default size/weight/color per line. Click individual words below a line for overrides (color, gradient, size, weight, bold, strikethrough)."
      >
      {editableFields.map((field) => {
        const fs2 = fontSettings[field];
        const cs = tColors[field] ?? defaultTextColorSettings[field];
        const isEnabled = fieldChecks[field];
        const words = (content?.[field] ?? "").split(" ").filter(Boolean);
        const weightOptions = [
          { label: "Light", value: 300 },
          { label: "Regular", value: 400 },
          { label: "Medium", value: 500 },
          { label: "SemiBold", value: 600 },
          { label: "Bold", value: 700 },
          { label: "ExtraBold", value: 800 },
        ];
        const colorPresets = [
          { label: "White", value: "#FFFFFF" },
          { label: "Light", value: "#E0E0E0" },
          { label: "Muted", value: "#A4A7AE" },
          { label: "Dark", value: "#414651" },
          { label: "Purple", value: "#7F56D9" },
          { label: "Blue", value: "#194185" },
          { label: "Red", value: "#D92D20" },
          { label: "Coral", value: "#F4A89A" },
        ];
        return (
          <CollapsibleBlock
            key={field}
            title={fieldLabels[field]}
            hint={
              isEnabled
                ? "Font size, weight, and slot color (or brand gradient). Click words below for per-word overrides."
                : "Hidden on canvas — turn on under Text on canvas to show it."
            }
            defaultOpen={field === "heading"}
          >
            <div style={{ opacity: isEnabled ? 1 : 0.45 }}>
            <div className="grid grid-cols-1 gap-3 mb-3">
              <SliderControl
                label="Font size"
                value={fs2.size}
                min={12}
                max={120}
                step={1}
                unit="px"
                onChange={(v) => onSettingsChange({ fontSettings: { ...fontSettings, [field]: { ...fs2, size: v } } })}
              />
              <div>
                <span className="text-muted-foreground block mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Font weight</span>
                <select
                  value={fs2.weight}
                  disabled={!isEnabled}
                  onChange={(e) => onSettingsChange({ fontSettings: { ...fontSettings, [field]: { ...fs2, weight: Number(e.target.value) } } })}
                  className="w-full px-3 py-2 rounded-[var(--radius)] border-2 border-border bg-input-background text-foreground cursor-pointer disabled:opacity-50"
                  style={{ fontSize: "var(--text-sm)" }}
                >
                  {weightOptions.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-2">
              <span className="text-muted-foreground block mb-1.5" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Slot color</span>
              <div className="flex flex-wrap gap-1.5 items-center">
                {colorPresets.map((cp) => (
                  <button
                    key={cp.value}
                    type="button"
                    title={cp.label}
                    disabled={!isEnabled}
                    onClick={() =>
                      onSettingsChange({
                        textColorSettings: {
                          ...tColors,
                          [field]: { ...cs, baseColor: cp.value, useGradient: false },
                        },
                      })
                    }
                    className="w-6 h-6 rounded-full border-2 cursor-pointer transition-all hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: cp.value,
                      borderColor: cs.baseColor === cp.value && !cs.useGradient ? "var(--primary)" : "var(--border)",
                      boxShadow: cs.baseColor === cp.value && !cs.useGradient ? "0 0 0 2px var(--primary)" : "none",
                    }}
                  />
                ))}
                <label className="relative w-6 h-6 rounded-full border-2 border-border cursor-pointer overflow-hidden" title="Custom color">
                  <input
                    type="color"
                    value={cs.baseColor}
                    disabled={!isEnabled}
                    onChange={(e) =>
                      onSettingsChange({
                        textColorSettings: { ...tColors, [field]: { ...cs, baseColor: e.target.value, useGradient: false } },
                      })
                    }
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="w-full h-full" style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }} />
                </label>
                <button
                  type="button"
                  disabled={!isEnabled}
                  onClick={() =>
                    onSettingsChange({
                      textColorSettings: { ...tColors, [field]: { ...cs, useGradient: !cs.useGradient } },
                    })
                  }
                  className="ml-1 flex items-center gap-1 py-1 px-2 rounded-[var(--radius-utility)] border-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: cs.useGradient ? "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" : "var(--card)",
                    color: cs.useGradient ? "#FFFFFF" : "var(--foreground)",
                    borderColor: cs.useGradient ? "var(--primary)" : "var(--border)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: cs.useGradient ? "white" : "transparent",
                    }}
                  >
                    ✦
                  </span>
                  Gradient
                </button>
              </div>
            </div>
            {words.length > 0 && isEnabled && (
              <div>
                <span className="text-muted-foreground block mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                  Per-word styling
                </span>
                <p className="text-muted-foreground m-0 mb-1.5" style={{ fontSize: "var(--text-2xs)", lineHeight: 1.4 }}>
                  Click a word chip, then set color, brand gradient, size, weight, bold, or strikethrough.
                </p>
                <div className="flex flex-wrap gap-1 p-2 rounded-[var(--radius)] border border-border bg-muted/50" style={{ minHeight: 32 }}>
                  {words.map((word, i) => {
                    const ws = cs.wordStyles?.[i];
                    const isSelected = selectedWord?.field === field && selectedWord?.index === i;
                    return (
                      <span
                        key={i}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedWord(isSelected ? null : { field, index: i })}
                        onKeyDown={(e) => e.key === "Enter" && setSelectedWord(isSelected ? null : { field, index: i })}
                        className="px-1.5 py-0.5 rounded cursor-pointer transition-all hover:bg-primary/10"
                        style={{
                          fontSize: ws?.fontSize ? `${ws.fontSize}px` : "var(--text-sm)",
                          fontWeight: ws?.weight ?? (ws?.bold ? 700 : 400),
                          textDecoration: ws?.strikethrough ? "line-through" : "none",
                          color: isSelected ? "var(--primary-foreground)" : (ws?.useGradient ? "transparent" : (ws?.color || "var(--foreground)")),
                          background: isSelected ? "var(--primary)" : (ws?.useGradient && !isSelected ? "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" : "transparent"),
                          WebkitBackgroundClip: ws?.useGradient && !isSelected ? "text" : undefined,
                          WebkitTextFillColor: ws?.useGradient && !isSelected ? "transparent" : undefined,
                          backgroundClip: ws?.useGradient && !isSelected ? "text" : undefined,
                          borderRadius: "var(--radius-utility)",
                        }}
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
                {selectedWord?.field === field && (() => {
                  const wi = selectedWord.index;
                  const ws = cs.wordStyles?.[wi] || {};
                  const slotSize = fs2.size;
                  const slotWeight = fs2.weight;
                  const updateWord = (patch: Partial<WordStyle>) => {
                    const newWs = { ...ws, ...patch };
                    const newWordStyles = { ...(cs.wordStyles ?? {}), [wi]: newWs };
                    const isEmpty = !newWs.color && !newWs.bold && !newWs.strikethrough && newWs.fontSize == null && newWs.weight == null && !newWs.useGradient;
                    if (isEmpty) {
                      const { [wi]: _, ...rest } = newWordStyles;
                      onSettingsChange({ textColorSettings: { ...tColors, [field]: { ...cs, wordStyles: rest } } });
                    } else {
                      onSettingsChange({ textColorSettings: { ...tColors, [field]: { ...cs, wordStyles: newWordStyles } } });
                    }
                  };
                  return (
                    <div className="mt-2 p-2.5 rounded-[var(--radius)] border border-primary/30 bg-card" style={{ boxShadow: "var(--elevation-sm)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--primary)" }}>&ldquo;{words[wi]}&rdquo;</span>
                        <button type="button" onClick={() => setSelectedWord(null)} className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors bg-transparent border-none" style={{ fontSize: "var(--text-sm)" }}>
                          ✕
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-muted-foreground" style={{ fontSize: "var(--text-2xs)", minWidth: 52 }}>Color</span>
                          {colorPresets.map((cp) => (
                            <button
                              key={cp.value}
                              type="button"
                              title={cp.label}
                              onClick={() => updateWord({ color: ws.color === cp.value ? undefined : cp.value, useGradient: false })}
                              className="w-6 h-6 rounded-full border-2 cursor-pointer transition-all hover:scale-110"
                              style={{ background: cp.value, borderColor: ws.color === cp.value && !ws.useGradient ? "var(--primary)" : "var(--border)" }}
                            />
                          ))}
                          <label className="relative w-6 h-6 rounded-full border-2 border-border cursor-pointer overflow-hidden flex-shrink-0 block" title="Custom color">
                            <div className="absolute inset-0 pointer-events-none" style={{ background: ws.color || "var(--muted)" }} />
                            <input
                              type="color"
                              value={ws.color || "#7F56D9"}
                              onChange={(e) => updateWord({ color: e.target.value, useGradient: false })}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => updateWord(ws.useGradient ? { useGradient: false } : { useGradient: true, color: undefined })}
                            className="ml-0.5 flex items-center gap-1 py-1 px-2 rounded-[var(--radius-utility)] border-2 cursor-pointer transition-all"
                            style={{
                              background: ws.useGradient ? "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" : "var(--card)",
                              color: ws.useGradient ? "#FFFFFF" : "var(--foreground)",
                              borderColor: ws.useGradient ? "var(--primary)" : "var(--border)",
                              fontSize: "var(--text-2xs)",
                              fontWeight: 600,
                            }}
                            title="Brand gradient (orange → pink)"
                          >
                            <span style={{ WebkitTextFillColor: ws.useGradient ? "white" : "transparent", background: "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))", WebkitBackgroundClip: "text" }}>✦</span>
                            Brand gradient
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground" style={{ fontSize: "var(--text-2xs)", minWidth: 52 }}>Size</span>
                          <input
                            type="number"
                            min={8}
                            max={120}
                            value={ws.fontSize ?? slotSize}
                            onChange={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v)) updateWord({ fontSize: v === slotSize ? undefined : v }); }}
                            className="w-16 px-2 py-1 rounded border border-border bg-input-background text-foreground"
                            style={{ fontSize: "var(--text-sm)" }}
                          />
                          <span className="text-muted-foreground" style={{ fontSize: "var(--text-2xs)" }}>px</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground" style={{ fontSize: "var(--text-2xs)", minWidth: 52 }}>Weight</span>
                          <select
                            value={ws.weight ?? slotWeight}
                            onChange={(e) => { const v = Number(e.target.value); updateWord({ weight: v === slotWeight ? undefined : v }); }}
                            className="flex-1 min-w-0 px-2 py-1 rounded border border-border bg-input-background text-foreground cursor-pointer"
                            style={{ fontSize: "var(--text-sm)" }}
                          >
                            {weightOptions.map((w) => (
                              <option key={w.value} value={w.value}>{w.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => updateWord({ bold: !ws.bold })}
                            className="flex-1 py-1 rounded-[var(--radius-utility)] border-2 cursor-pointer transition-all"
                            style={{
                              fontSize: "var(--text-sm)",
                              fontWeight: 700,
                              background: ws.bold ? "var(--primary)" : "var(--card)",
                              color: ws.bold ? "var(--primary-foreground)" : "var(--foreground)",
                              borderColor: ws.bold ? "var(--primary)" : "var(--border)",
                            }}
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onClick={() => updateWord({ strikethrough: !ws.strikethrough })}
                            className="flex-1 py-1 rounded-[var(--radius-utility)] border-2 cursor-pointer transition-all"
                            style={{
                              fontSize: "var(--text-sm)",
                              textDecoration: "line-through",
                              background: ws.strikethrough ? "var(--primary)" : "var(--card)",
                              color: ws.strikethrough ? "var(--primary-foreground)" : "var(--foreground)",
                              borderColor: ws.strikethrough ? "var(--primary)" : "var(--border)",
                            }}
                          >
                            S
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
            </div>
          </CollapsibleBlock>
        );
      })}
      </SettingsSection>
    </div>
  );
}
