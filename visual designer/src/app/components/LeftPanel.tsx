import { useState, useCallback, useRef, useEffect } from "react";
import { Loader2, Upload, X, Maximize2, Sparkles, Zap, Settings2, Pencil, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Download, Check, RotateCcw, Play, Pause, Archive, ImageIcon, GripVertical, Copy, Plus, Lock, Trash2, Save } from "lucide-react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import JSZip from "jszip";

// Local placeholder for theme thumbnails (figma:asset/* only resolves in Figma plugin runtime)
import themePlaceholder from "@/assets/placeholder-theme.svg";
import bg1x1TrnsThumb from "@/assets/bg-1x1-trns.png";
import { getVisualSlotDimensions } from "@/app/utils/visualSlotLayout";
import { buildVisualBrief, buildContentAndVisualBlock } from "@/app/utils/imagePromptBuilder";
import type { PreviewToolbarApi } from "@/app/types/previewToolbar";
import type { AppMode } from "@/app/types/appMode";
import {
  ENKRYPT_GEMINI_CHAT_MODEL,
  ENKRYPT_OPENAI_CHAT_MODEL,
  openAiChatCompletionsExtras,
} from "@/app/utils/llmText";

/* ── Types ── */
interface GeneratedContent {
  heading: string;
  subheading: string;
  footer: string;
}

interface TextSlotPos { yPct: number; }

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

interface TextColorSettings {
  heading: SlotColorSettings;
  subheading: SlotColorSettings;
  footer: SlotColorSettings;
}

interface SettingsPayload {
  theme: string;
  selectedThemes: string[];
  logoPosition: string;
  padding: number;
  logoScale: number;
  visualImage: string | null;
  size: { width: number; height: number };
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
  textSlots: {
    heading: TextSlotPos;
    subheading: TextSlotPos;
    footer: TextSlotPos;
  };
  mode: "general" | "blog";
  textColorSettings: TextColorSettings;
  variations: string[];
  activeVariation: number;
  postSizeId?: string;
  /** Designer tab only — image generation uses solid white background when true */
  designerWhiteBg?: boolean;
  visualImageBorderRadius?: number;
}

interface BlogSection {
  index: number;
  heading: string;
  subheading: string;
  footer: string;
  image?: string;
  status: "pending" | "generating" | "done" | "error";
  enabled: boolean;
  themeId: string;
}

interface LeftPanelProps {
  onContentGenerated: (content: GeneratedContent) => void;
  onSettingsChange: (settings: SettingsPayload) => void;
  onGenerateVisual: () => void;
  hasContent: boolean;
  provider: "openai" | "gemini";
  apiKeyRaw: string;
  /** Actual header tab (includes designer); `mode` is panel layout (general vs blog). */
  headerMode: AppMode;
  mode: "general" | "blog";
  setMode: (m: AppMode) => void;
  settings: SettingsPayload | null;
  /** Registers crop / edit / variation controls for the center Preview column */
  registerPreviewToolbar?: (api: PreviewToolbarApi | null) => void;
}

/* ── Template passwords ── */
const TEMPLATE_PASSWORDS = ["Enkryptai", "Rohith"];

/* ── Brand default colors (from design system CSS variables) ── */
const BRAND_COLORS = {
  gradientStart: "#FF7404",  // var(--gradient-start)
  gradientEnd: "#FF3BA2",    // var(--gradient-end)
  danger: "#D92D20",         // var(--destructive) — red for danger/warning
  secure: "#16B364",         // green for secure/success
  text: "#1A1A1A",           // near-black for readable text
  muted: "#414651",          // var(--foreground) — secondary text
  cardBg: "#FFFFFF",         // white card backgrounds
  cardBorder: "#D5D7DA",     // var(--border)
};

const BRAND_PALETTE = [BRAND_COLORS.gradientStart, BRAND_COLORS.gradientEnd, BRAND_COLORS.danger, BRAND_COLORS.secure, BRAND_COLORS.text, BRAND_COLORS.cardBg];

interface ThemeItem {
  id: string;
  label: string;
  image: string;
  promptContext: string;
  visualPrompt: string;
  palette: string[];
  isCustom?: boolean;
  isNone?: boolean;
}

/* ── No Template option ── */
const NO_TEMPLATE_THEME: ThemeItem = {
  id: "none",
  label: "No Template",
  image: "",
  promptContext: "Style: clean, modern, professional social media post. Use the brand gradient (orange #FF7404 to pink #FF3BA2) for icons and decorative elements. Red (#D92D20) for danger/warning elements. Green (#16B364) for success/secure elements. Near-black (#1A1A1A) for all body text. White card backgrounds with subtle borders. Tone: polished, brand-consistent.",
  visualPrompt: "Create a clean, modern social media visual with no specific template. Use a professional layout with rounded cards, clean icons, and clear visual hierarchy. Icons and decorative elements should use a warm gradient from orange (#FF7404) to pink (#FF3BA2). Any danger/warning elements in red (#D92D20). Any success/secure elements in green (#16B364). All text in near-black (#1A1A1A). White (#FFFFFF) card backgrounds with subtle gray (#D5D7DA) borders.",
  palette: BRAND_PALETTE,
  isNone: true,
};

/* ── Theme data ── */
const defaultThemes: ThemeItem[] = [
  {
    id: "hooks",
    label: "Hooks & Audit",
    image: themePlaceholder,
    promptContext: "Style: step-by-step tutorial/how-to layout with numbered cards and bullet-point lists. Warm peach/pink gradient palette with soft card containers. Tone: developer-friendly, practical, concise.",
    visualPrompt: "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A vertical stack of 3-4 numbered step cards inside soft white/cream rounded rectangles with subtle shadows. Each card has a number badge on the left in warm orange (#E8875B), a content area, and a small icon. Between cards are thin connecting lines or arrows. On the right, a vertical list of 3-4 bullet points with green checkmark icons.",
    palette: ["#FDDCB5", "#F4A89A", "#FFF8F2", "#E8875B", "#2D2D2D", "#6DAA6D"],
  },
  {
    id: "scanning",
    label: "AI Scanning",
    image: themePlaceholder,
    promptContext: "Style: central infographic/diagram with surrounding icon bubbles. Laptop/screen centerpiece with radial layout. Warm gradient background. Tone: visual, feature-focused.",
    visualPrompt: "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A central laptop/monitor in the middle. Surrounding the laptop in a radial pattern are 6-8 floating icon bubbles (soft rounded circles) with relevant icons. Each bubble connected to center with thin dashed lines. Bubbles use alternating peach (#FDDCB5), coral (#F4A89A), lavender (#D6BBFB).",
    palette: ["#FDDCB5", "#F4A89A", "#7F56D9", "#FFF8F2", "#6DAA6D", "#D6BBFB"],
  },
  {
    id: "enforcement",
    label: "Pre-LLM Hook",
    image: themePlaceholder,
    promptContext: "Style: clean feature highlight card with a bordered content box listing items with icons. Large bold heading, subtitle, and tagline. Warm soft background. Tone: clear, focused.",
    visualPrompt: "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A large centered white/cream rounded card (70% width) with subtle border and shadow. Inside: a vertical list of 5-6 rows, each with a colored icon on left inside soft-colored circles (peach, lavender, coral), followed by a text/content area. Small decorative floating dots and curved line decorations in corners.",
    palette: ["#FDDCB5", "#F4A89A", "#7F56D9", "#FFF8F2", "#E9D7FE", "#333333"],
  },
  {
    id: "audit",
    label: "Observability",
    image: themePlaceholder,
    promptContext: "Style: quote-style heading with bordered card listing items with icon bullets. Clean layout. Warm gradient background. Tone: executive-focused, structured.",
    visualPrompt: "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A centered white/cream bordered card with rounded corners and thin warm-coral border. Inside: 4-5 rows, each with a colored icon on the left in warm tones (orange, coral, purple) and a content area. Above the card, large decorative open-quote marks in soft coral/peach.",
    palette: ["#FDDCB5", "#F4A89A", "#FFF8F2", "#7F56D9", "#E8875B", "#555555"],
  },
  {
    id: "guardrail-hooks",
    label: "Guardrail Hooks",
    image: themePlaceholder,
    promptContext: "Style: 2x2 grid layout showing four categories as soft rounded cards with icons. Center connecting icon. Warm peach/pink gradient background. Tone: structured, clean infographic.",
    visualPrompt: "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A 2x2 grid of four soft rounded cards arranged symmetrically. Each card has a white/cream background with colored left-border (peach, coral, lavender, mint), an icon inside a colored circle, and a content area. Center: large gear/cog icon in purple (#7F56D9) connecting all four with thin dashed lines.",
    palette: ["#FDDCB5", "#F4A89A", "#7F56D9", "#D6BBFB", "#B5E4CA", "#FFF8F2"],
  },
  {
    id: "attack-surface",
    label: "Attack Surface",
    image: themePlaceholder,
    promptContext: "Style: split layout with illustration on left and stacked alert cards on right. Warning/urgency theme. Warm gradient background. Tone: urgent, visual.",
    visualPrompt: "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): Left side: laptop illustration with screen content and warning glow overlay. Right side: 4 stacked horizontal alert cards, each with a warning triangle icon, a label area, and subtle red-tinted border. White background with red left-accent stripe per card. Below laptop: row of 4-5 small circular placeholders.",
    palette: ["#FDDCB5", "#D92D20", "#F4A89A", "#FFF8F2", "#2D2D2D", "#E8875B"],
  },
  {
    id: "suggestion-enforcement",
    label: "Suggestion to Enforcement",
    image: themePlaceholder,
    promptContext: "Style: horizontal numbered pipeline with bordered step cards connected by arrows. Warm soft background. Tone: clear, sequential.",
    visualPrompt: "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A horizontal row of 4 numbered step cards connected by arrows. Each card: tall rounded rectangle with large number at top in colored circle, an icon below. Number circles alternate: peach (#FDDCB5), coral (#F4A89A), lavender (#D6BBFB), mint (#B5E4CA). Between cards: thick horizontal arrows in matching color. White/cream card backgrounds with colored top-borders.",
    palette: ["#FDDCB5", "#F4A89A", "#7F56D9", "#D6BBFB", "#B5E4CA", "#FFF8F2"],
  },
  {
    id: "agentic-ide",
    label: "Dangers of Agentic IDEs",
    image: themePlaceholder,
    promptContext: "Style: split layout with stacked cards on left and diagram on right. Risk/warning theme. Warm gradient background. Tone: alarming, educational.",
    visualPrompt: "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): Left side: 4 stacked horizontal cards with warning icons. Each card: white rounded rectangle with red left-accent bar and an icon in light-red circle. Right side: laptop with warning badge overlay, below it a circular flow diagram with 3 nodes connected by curved arrows in red/coral. Bottom: row of 5 small circular placeholders.",
    palette: ["#D92D20", "#FEE4E2", "#FDDCB5", "#F4A89A", "#FFF8F2", "#E8875B"],
  },
  {
    id: "flowchart",
    label: "Flowchart",
    image: themePlaceholder,
    promptContext: "Style: detailed numbered flowchart with steps, branches, and decision points. Warm peach/pink gradient background. Tone: technical, architectural, process-oriented.",
    visualPrompt: "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A detailed vertical flowchart with 10-12 numbered steps. Each step: numbered circle connected by colored directional arrows flowing downward with branches. Includes a group of 3 parallel boxes in dashed border (lavender #D6BBFB), a decision branch going left (red #D92D20) and right (green #6DAA6D). Arrows colored: orange forward, pink secondary, green approved. Top: thin banner with circular placeholders.",
    palette: ["#E8875B", "#F4A89A", "#7F56D9", "#D6BBFB", "#6DAA6D", "#D92D20"],
  },
];

const sizes = [
  { name: "1:1", width: 1080, height: 1080 },
  { name: "16:9", width: 1920, height: 1080 },
];

/** Designer tab only — second 1:1 uses custom preview background (postSizeId). */
const DESIGNER_POST_SIZE_TRNS_ID = "1080x1080-trns";

const positions = [
  { id: "top-left", label: "↖ Top Left" },
  { id: "top-center", label: "↑ Top Center" },
  { id: "top-right", label: "↗ Top Right" },
  { id: "bottom-left", label: "↙ Bottom Left" },
  { id: "bottom-center", label: "↓ Bottom Center" },
  { id: "bottom-right", label: "↘ Bottom Right" },
];

/* ── Reusable UI Components ── */

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-border rounded-[var(--radius-card)] p-4 ${className}`}>
      {children}
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <SectionCard className="mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 cursor-pointer bg-transparent border-none p-0 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-[3px] h-[18px] bg-primary rounded-sm flex-shrink-0" />
          <span className="text-foreground truncate" style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>
            {icon} {title}
          </span>
          {badge && (
            <span
              className="flex-shrink-0 px-2 py-0.5 rounded-full bg-primary/10 text-primary"
              style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}
            >
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </SectionCard>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block mb-1.5 text-foreground" style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground mb-3" style={{ fontSize: "var(--text-sm)" }}>
      {children}
    </p>
  );
}

function ToggleGroup({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { id: string; label: string; sublabel?: string; iconSrc?: string }[];
  value: string;
  onChange: (id: string) => void;
  columns?: number;
}) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className="py-2.5 px-3 rounded-[var(--radius)] border-2 cursor-pointer transition-all text-center"
            style={{
              fontSize: "var(--text-sm)",
              fontWeight: active ? 600 : 400,
              background: active ? "var(--primary)" : "var(--card)",
              color: active ? "var(--primary-foreground)" : "var(--foreground)",
              borderColor: active ? "var(--primary)" : "var(--border)",
            }}
          >
            {o.iconSrc ? (
              <img
                src={o.iconSrc}
                alt=""
                className="w-10 h-10 mx-auto mb-1.5 rounded-md object-contain bg-background/50"
              />
            ) : null}
            <div style={{ fontWeight: 600 }}>{o.label}</div>
            {o.sublabel && <div style={{ opacity: 0.8 }}>{o.sublabel}</div>}
          </button>
        );
      })}
    </div>
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

function PrimaryButton({
  onClick,
  disabled,
  loading,
  loadingText,
  icon,
  children,
  variant = "filled",
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  variant?: "filled" | "outline";
}) {
  const isFilled = variant === "filled";
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-3 px-4 rounded-[var(--radius-button)] border-2 cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: isFilled ? "var(--primary)" : "transparent",
        color: isFilled ? "var(--primary-foreground)" : "var(--primary)",
        borderColor: "var(--primary)",
        fontWeight: 700,
        fontSize: "var(--text-base)",
        boxShadow: isFilled ? "var(--elevation-sm)" : "none",
      }}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingText || "Processing..."}</span>
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

const inputClass = "w-full px-3 py-2.5 border-2 border-border rounded-[var(--radius)] bg-input-background text-foreground transition-all focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10";

/* ── Draggable Blog Section Card ── */
const BLOG_CARD_TYPE = "BLOG_SECTION";

function DraggableBlogCard({
  sec,
  idx,
  activeBlogImage,
  themes,
  blogSections,
  setBlogSections,
  handleBlogSelectImage,
  handleBlogRegenerateOne,
  moveSection,
  advancedIdx,
  setAdvancedIdx,
  fontSettings: fSettings,
  setFontSettings: setFS,
  textColorSettings: tCS,
  setTextColorSettings: setTCS,
  textSlots: tSlots,
  setTextSlots: setTS,
  useHeading: uH,
  useSubheading: uSH,
  useFooter: uF,
  setUseHeading: setUH,
  setUseSubheading: setUSH,
  setUseFooter: setUF,
  updateSettings: updS,
  selectedWord: selWord,
  setSelectedWord: setSelWord,
  setExpandedTheme: setExpTheme,
  visualSlot: vSlot,
  setVisualSlot: setVSlot,
}: {
  sec: BlogSection;
  idx: number;
  activeBlogImage: number;
  themes: ThemeItem[];
  blogSections: BlogSection[];
  setBlogSections: (s: BlogSection[]) => void;
  handleBlogSelectImage: (i: number) => void;
  handleBlogRegenerateOne: (i: number) => void;
  moveSection: (from: number, to: number) => void;
  advancedIdx: number | null;
  setAdvancedIdx: (i: number | null) => void;
  fontSettings: { heading: { size: number; weight: number }; subheading: { size: number; weight: number }; footer: { size: number; weight: number } };
  setFontSettings: (f: any) => void;
  textColorSettings: TextColorSettings;
  setTextColorSettings: (c: TextColorSettings) => void;
  textSlots: { heading: TextSlotPos; subheading: TextSlotPos; footer: TextSlotPos };
  setTextSlots: (t: any) => void;
  useHeading: boolean;
  useSubheading: boolean;
  useFooter: boolean;
  setUseHeading: (v: boolean) => void;
  setUseSubheading: (v: boolean) => void;
  setUseFooter: (v: boolean) => void;
  updateSettings: (overrides: Partial<SettingsPayload>) => void;
  selectedWord: { field: "heading" | "subheading" | "footer"; index: number } | null;
  setSelectedWord: (w: { field: "heading" | "subheading" | "footer"; index: number } | null) => void;
  setExpandedTheme: (id: string | null) => void;
  visualSlot: { widthPct: number; heightPct: number; yPct: number };
  setVisualSlot: (v: { widthPct: number; heightPct: number; yPct: number }) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const sectionTheme = themes.find(t => t.id === sec.themeId) || themes[0];

  const [{ isDragging }, drag, preview] = useDrag({
    type: BLOG_CARD_TYPE,
    item: { index: idx },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: BLOG_CARD_TYPE,
    hover: (item: { index: number }) => {
      if (item.index !== idx) {
        moveSection(item.index, idx);
        item.index = idx;
      }
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  preview(drop(ref));

  return (
    <div
      ref={ref}
      className="rounded-[var(--radius)] border overflow-hidden transition-all"
      style={{
        borderColor: isOver ? "var(--primary)" : !sec.enabled ? "var(--border)" : activeBlogImage === idx ? "var(--primary)" : "var(--border)",
        boxShadow: sec.enabled && activeBlogImage === idx ? "0 0 0 1px var(--primary)" : "none",
        opacity: isDragging ? 0.4 : sec.enabled ? 1 : 0.5,
      }}
    >
      <div className="flex gap-2 p-3 cursor-pointer" onClick={() => sec.enabled && handleBlogSelectImage(idx)}>
        {/* Drag handle */}
        <div
          ref={(node) => { drag(node); }}
          className="flex-shrink-0 flex items-center cursor-grab active:cursor-grabbing self-center"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Enable/disable toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const updated = [...blogSections];
            updated[idx] = { ...sec, enabled: !sec.enabled };
            setBlogSections(updated);
          }}
          className="flex-shrink-0 w-5 h-5 rounded-[4px] border-2 flex items-center justify-center cursor-pointer transition-all self-center"
          style={{
            borderColor: sec.enabled ? "var(--primary)" : "var(--border)",
            background: sec.enabled ? "var(--primary)" : "transparent",
          }}
        >
          {sec.enabled && <Check className="w-3 h-3" style={{ color: "var(--primary-foreground)" }} />}
        </button>

        {/* Thumbnail or status */}
        <div
          className="flex-shrink-0 w-14 h-14 rounded-[var(--radius-utility)] overflow-hidden flex items-center justify-center border border-border"
          style={{ background: "var(--muted)" }}
        >
          {sec.status === "generating" ? (
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          ) : sec.status === "done" && sec.image ? (
            <img src={sec.image} alt={`Section ${idx + 1}`} className="w-full h-full object-cover" />
          ) : sec.status === "error" ? (
            <X className="w-5 h-5 text-destructive" />
          ) : (
            <span className="text-muted-foreground" style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>{idx + 1}</span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="px-1.5 py-0.5 rounded-full"
              style={{
                fontSize: "var(--text-2xs)",
                fontWeight: 700,
                background: sec.status === "done" ? "var(--primary)" : sec.status === "error" ? "var(--destructive)" : "var(--muted)",
                color: sec.status === "done" ? "var(--primary-foreground)" : sec.status === "error" ? "var(--destructive-foreground)" : "var(--muted-foreground)",
              }}
            >
              {sec.status === "done" ? <Check className="w-3 h-3 inline" /> : sec.status === "generating" ? "..." : sec.status === "error" ? "!" : idx + 1}
            </span>
            <span className="text-foreground truncate" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>{sec.heading}</span>
          </div>
          <p className="text-muted-foreground truncate" style={{ fontSize: "var(--text-sm)" }}>{sec.subheading}</p>
          <p className="text-muted-foreground truncate" style={{ fontSize: "var(--text-2xs)", opacity: 0.7 }}>{sec.footer}</p>
        </div>

        {/* Regenerate button */}
        {sec.status === "done" || sec.status === "error" ? (
          <button
            onClick={(e) => { e.stopPropagation(); handleBlogRegenerateOne(idx); }}
            className="flex-shrink-0 w-7 h-7 rounded-[var(--radius-utility)] border border-border bg-card flex items-center justify-center cursor-pointer hover:bg-muted transition-colors self-center"
            title="Regenerate this image"
          >
            <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        ) : null}

        {/* Advanced toggle button */}
        {sec.enabled && (
          <button
            onClick={(e) => { e.stopPropagation(); setAdvancedIdx(advancedIdx === idx ? null : idx); }}
            className="flex-shrink-0 w-7 h-7 rounded-[var(--radius-utility)] border flex items-center justify-center cursor-pointer hover:bg-muted transition-colors self-center"
            style={{
              background: advancedIdx === idx ? "var(--primary)" : "var(--card)",
              borderColor: advancedIdx === idx ? "var(--primary)" : "var(--border)",
            }}
            title="Advanced settings"
          >
            <Settings2 className="w-3.5 h-3.5" style={{ color: advancedIdx === idx ? "var(--primary-foreground)" : "var(--muted-foreground)" }} />
          </button>
        )}
      </div>

      {/* Per-section template picker */}
      {sec.enabled && (
        <div className="px-3 pb-3 pt-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground" style={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}>Template:</span>
              <span className="text-foreground" style={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}>{sectionTheme.label}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBlogSections(blogSections.map(s => ({ ...s, themeId: sec.themeId })));
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-utility)] border border-border bg-card text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground transition-colors"
              style={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}
              title="Apply this template to all sections"
            >
              <Copy className="w-3 h-3" />
              Apply to all
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "thin" }}>
            {themes.map((t) => (
              <div key={t.id} className="relative flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = [...blogSections];
                    updated[idx] = { ...sec, themeId: t.id };
                    setBlogSections(updated);
                  }}
                  className="w-10 h-10 rounded-[var(--radius-utility)] overflow-hidden border-2 cursor-pointer transition-all hover:opacity-90"
                  style={{
                    borderColor: sec.themeId === t.id ? "var(--primary)" : "var(--border)",
                    boxShadow: sec.themeId === t.id ? "0 0 0 1px var(--primary)" : "none",
                  }}
                  title={t.label}
                >
                  {t.isNone ? (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${BRAND_COLORS.gradientStart}22, ${BRAND_COLORS.gradientEnd}22)` }}>
                      <ImageIcon className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                    </div>
                  ) : (
                    <img src={t.image} alt={t.label} className="w-full h-full object-cover" />
                  )}
                </button>
                {!t.isNone && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpTheme(t.id); }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-card border border-border flex items-center justify-center cursor-pointer hover:bg-muted transition-colors z-10"
                    title={`Preview ${t.label}`}
                  >
                    <Maximize2 className="w-2.5 h-2.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Per-section Advanced Controls */}
      {advancedIdx === idx && sec.enabled && (() => {
        const secContent: GeneratedContent = { heading: sec.heading, subheading: sec.subheading, footer: sec.footer };
        const _editableFields: ("heading" | "subheading" | "footer")[] = ["heading", "subheading", "footer"];
        const _fieldLabels: Record<string, string> = { heading: "Heading", subheading: "Subheading", footer: "Footer" };
        const _fieldChecks: Record<string, boolean> = { heading: uH, subheading: uSH, footer: uF };
        const _fieldSetChecks: Record<string, (v: boolean) => void> = { heading: setUH, subheading: setUSH, footer: setUF };
        const _settingsKeyMap: Record<string, string> = { heading: "useHeading", subheading: "useSubheading", footer: "useFooter" };
        const weightOpts = [
          { label: "Lt", value: 300 }, { label: "Reg", value: 400 }, { label: "Med", value: 500 },
          { label: "SB", value: 600 }, { label: "Bd", value: 700 }, { label: "XB", value: 800 },
        ];
        const colorPresets = [
          { label: "White", value: "#FFFFFF" }, { label: "Light", value: "#E0E0E0" },
          { label: "Muted", value: "#A4A7AE" }, { label: "Dark", value: "#414651" },
          { label: "Purple", value: "#7F56D9" }, { label: "Red", value: "#D92D20" },
          { label: "Coral", value: "#F4A89A" }, { label: "Blue", value: "#194185" },
        ];

        return (
          <div className="px-3 pb-3 border-t border-border" style={{ background: "var(--muted)" }}>
            <div className="flex items-center gap-2 py-2 mb-2">
              <Settings2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-foreground" style={{ fontSize: "var(--text-sm)", fontWeight: 700 }}>Advanced — Section {idx + 1}</span>
            </div>

            {/* Text Field Toggles */}
            <div className="mb-3">
              <span className="text-muted-foreground block mb-1" style={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}>Text Fields</span>
              {_editableFields.map((field) => (
                <div key={field} className="flex items-center justify-between py-0.5">
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--foreground)" }}>{_fieldLabels[field]}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground truncate" style={{ fontSize: "var(--text-2xs)", maxWidth: 100 }}>{secContent[field]}</span>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={_fieldChecks[field]}
                        onChange={(e) => { _fieldSetChecks[field](e.target.checked); updS({ [_settingsKeyMap[field]]: e.target.checked }); }}
                        className="w-3.5 h-3.5 cursor-pointer accent-primary" />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Typography per field */}
            {_editableFields.map((field) => {
              const fs2 = fSettings[field];
              const cs = tCS[field];
              const isEnabled = _fieldChecks[field];
              const words = (secContent[field] ?? "").split(" ").filter(Boolean);
              return (
                <div key={field} className="mb-3 pb-2" style={{ borderBottom: field !== "footer" ? "1px solid var(--border)" : "none", opacity: isEnabled ? 1 : 0.4 }}>
                  <span className="text-foreground block mb-1" style={{ fontSize: "var(--text-2xs)", fontWeight: 700 }}>{_fieldLabels[field]}</span>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <SliderControl label="Size" value={fs2.size} min={12} max={120} step={1} unit="px"
                      onChange={(v) => { const u = { ...fSettings, [field]: { ...fs2, size: v } }; setFS(u); updS({ fontSettings: u }); }} />
                    <div>
                      <span className="text-muted-foreground block mb-0.5" style={{ fontSize: "var(--text-2xs)" }}>Weight</span>
                      <select
                        value={fs2.weight}
                        disabled={!isEnabled}
                        onChange={(e) => { const u = { ...fSettings, [field]: { ...fs2, weight: Number(e.target.value) } }; setFS(u); updS({ fontSettings: u }); }}
                        className="w-full px-2 py-1 rounded border border-border bg-input-background text-foreground cursor-pointer disabled:opacity-50"
                        style={{ fontSize: "var(--text-2xs)" }}
                      >
                        {weightOpts.map((w) => (
                          <option key={w.value} value={w.value}>{w.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mb-1">
                    <span className="text-muted-foreground block mb-0.5" style={{ fontSize: "var(--text-2xs)" }}>Color</span>
                    <div className="flex flex-wrap gap-1 items-center">
                      {colorPresets.map((cp) => (
                        <button key={cp.value} title={cp.label} disabled={!isEnabled}
                          onClick={() => { const u = { ...tCS, [field]: { ...cs, baseColor: cp.value, useGradient: false } }; setTCS(u); updS({ textColorSettings: u }); }}
                          className="w-5 h-5 rounded-full border-2 cursor-pointer transition-all hover:scale-110 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: cp.value, borderColor: cs.baseColor === cp.value && !cs.useGradient ? "var(--primary)" : "var(--border)" }} />
                      ))}
                      <button disabled={!isEnabled}
                        onClick={() => { const u = { ...tCS, [field]: { ...cs, useGradient: !cs.useGradient } }; setTCS(u); updS({ textColorSettings: u }); }}
                        className="ml-0.5 flex items-center gap-0.5 py-0.5 px-1.5 rounded-[var(--radius-utility)] border-2 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ background: cs.useGradient ? "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" : "var(--card)", color: cs.useGradient ? "#FFF" : "var(--foreground)", borderColor: cs.useGradient ? "var(--primary)" : "var(--border)", fontSize: "var(--text-2xs)", fontWeight: 600 }}>
                        ✦ Gradient
                      </button>
                    </div>
                  </div>
                  {words.length > 0 && isEnabled && (
                    <div>
                      <span className="text-muted-foreground block mb-0.5" style={{ fontSize: "var(--text-2xs)" }}>Word Styling</span>
                      <div className="flex flex-wrap gap-0.5 p-1.5 rounded-[var(--radius)] border border-border bg-card" style={{ minHeight: 22 }}>
                        {words.map((word, i) => {
                          const ws = cs.wordStyles[i];
                          const isSel = selWord?.field === field && selWord?.index === i;
                          return (
                            <span key={i} onClick={() => setSelWord(isSel ? null : { field, index: i })}
                              className="px-1 py-0.5 rounded cursor-pointer transition-all hover:bg-primary/10"
                              style={{ fontSize: ws?.fontSize ? `${ws.fontSize}px` : "var(--text-2xs)", fontWeight: ws?.weight ?? (ws?.bold ? 700 : 400), textDecoration: ws?.strikethrough ? "line-through" : "none", color: isSel ? "var(--primary-foreground)" : (ws?.useGradient ? "transparent" : (ws?.color || "var(--foreground)")), background: isSel ? "var(--primary)" : (ws?.useGradient && !isSel ? "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" : "transparent"), WebkitBackgroundClip: ws?.useGradient && !isSel ? "text" : undefined, WebkitTextFillColor: ws?.useGradient && !isSel ? "transparent" : undefined, backgroundClip: ws?.useGradient && !isSel ? "text" : undefined, borderRadius: "var(--radius-utility)" }}>
                              {word}
                            </span>
                          );
                        })}
                      </div>
                      {selWord?.field === field && (() => {
                        const wi = selWord.index;
                        const ws = cs.wordStyles[wi] || {};
                        const slotSize = fs2.size;
                        const slotWeight = fs2.weight;
                        const updWord = (patch: Partial<WordStyle>) => {
                          const nw = { ...ws, ...patch };
                          const isEmpty = !nw.color && !nw.bold && !nw.strikethrough && nw.fontSize == null && nw.weight == null && !nw.useGradient;
                          if (isEmpty) {
                            const { [wi]: _, ...rest } = cs.wordStyles;
                            const u = { ...tCS, [field]: { ...cs, wordStyles: rest } }; setTCS(u); updS({ textColorSettings: u });
                          } else {
                            const u = { ...tCS, [field]: { ...cs, wordStyles: { ...cs.wordStyles, [wi]: nw } } }; setTCS(u); updS({ textColorSettings: u });
                          }
                        };
                        return (
                          <div className="mt-1 p-1.5 rounded-[var(--radius)] border border-primary/30 bg-card">
                            <div className="flex items-center justify-between mb-1">
                              <span style={{ fontSize: "var(--text-2xs)", fontWeight: 600, color: "var(--primary)" }}>&ldquo;{words[wi]}&rdquo;</span>
                              <button onClick={() => setSelWord(null)} className="text-muted-foreground cursor-pointer bg-transparent border-none" style={{ fontSize: "var(--text-2xs)" }}>✕</button>
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-muted-foreground" style={{ fontSize: "var(--text-2xs)", width: 36 }}>Color</span>
                                {colorPresets.map((cp) => (
                                  <button key={cp.value} type="button" title={cp.label} onClick={() => updWord({ color: ws.color === cp.value ? undefined : cp.value, useGradient: false })}
                                    className="w-5 h-5 rounded-full border cursor-pointer flex-shrink-0"
                                    style={{ background: cp.value, borderColor: ws.color === cp.value && !ws.useGradient ? "var(--primary)" : "var(--border)" }} />
                                ))}
                                <button type="button" onClick={() => updWord(ws.useGradient ? { useGradient: false } : { useGradient: true, color: undefined })}
                                  className="ml-0.5 flex items-center gap-0.5 py-0.5 px-1 rounded-[var(--radius-utility)] border-2 cursor-pointer"
                                  style={{ background: ws.useGradient ? "linear-gradient(135deg, var(--gradient-start), var(--gradient-end))" : "var(--card)", color: ws.useGradient ? "#FFF" : "var(--foreground)", borderColor: ws.useGradient ? "var(--primary)" : "var(--border)", fontSize: "var(--text-2xs)", fontWeight: 600 }}
                                  title="Brand gradient (orange → pink)">
                                  ✦ Grad
                                </button>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground" style={{ fontSize: "var(--text-2xs)", width: 36 }}>Size</span>
                                <input type="number" min={8} max={120} value={ws.fontSize ?? slotSize}
                                  onChange={(e) => { const v = parseInt(e.target.value, 10); if (!Number.isNaN(v)) updWord({ fontSize: v === slotSize ? undefined : v }); }}
                                  className="w-12 px-1 py-0.5 rounded border border-border bg-input-background text-foreground" style={{ fontSize: "var(--text-2xs)" }} />
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-muted-foreground" style={{ fontSize: "var(--text-2xs)", width: 36 }}>Weight</span>
                                <select value={ws.weight ?? slotWeight} onChange={(e) => { const v = Number(e.target.value); updWord({ weight: v === slotWeight ? undefined : v }); }}
                                  className="flex-1 min-w-0 px-1 py-0.5 rounded border border-border bg-input-background text-foreground cursor-pointer" style={{ fontSize: "var(--text-2xs)" }}>
                                  {weightOpts.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                                </select>
                              </div>
                              <div className="flex gap-1">
                                <button onClick={() => updWord({ bold: !ws.bold })}
                                  className="flex-1 py-0.5 rounded-[var(--radius-utility)] border-2 cursor-pointer"
                                  style={{ fontSize: "var(--text-2xs)", fontWeight: 700, background: ws.bold ? "var(--primary)" : "var(--card)", color: ws.bold ? "var(--primary-foreground)" : "var(--foreground)", borderColor: ws.bold ? "var(--primary)" : "var(--border)" }}>B</button>
                                <button onClick={() => updWord({ strikethrough: !ws.strikethrough })}
                                  className="flex-1 py-0.5 rounded-[var(--radius-utility)] border-2 cursor-pointer"
                                  style={{ fontSize: "var(--text-2xs)", textDecoration: "line-through", background: ws.strikethrough ? "var(--primary)" : "var(--card)", color: ws.strikethrough ? "var(--primary-foreground)" : "var(--foreground)", borderColor: ws.strikethrough ? "var(--primary)" : "var(--border)" }}>S</button>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Visual Slot Size & Position */}
            <div className="mb-2 pb-2" style={{ borderBottom: "1px solid var(--border)" }}>
              <span className="text-muted-foreground block mb-1" style={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}>Visual Slot</span>
              <div className="grid grid-cols-2 gap-2">
                <SliderControl label="Width" value={vSlot.widthPct} min={20} max={100} step={1} unit="%"
                  onChange={(v) => { const u = { ...vSlot, widthPct: v }; setVSlot(u); updS({ visualSlot: u }); }} />
                <SliderControl label="Height" value={vSlot.heightPct} min={10} max={100} step={1} unit="%"
                  onChange={(v) => { const u = { ...vSlot, heightPct: v }; setVSlot(u); updS({ visualSlot: u }); }} />
                <SliderControl label="Y position" value={vSlot.yPct ?? 14} min={2} max={95} step={1} unit="%"
                  onChange={(v) => { const u = { ...vSlot, yPct: v }; setVSlot(u); updS({ visualSlot: u }); }} />
              </div>
            </div>

            {/* Text Y-Positions */}
            <div className="mb-1">
              <span className="text-muted-foreground block mb-1" style={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}>Text Y-Positions</span>
              {_editableFields.map((slot) => {
                const slotC: Record<string, string> = { heading: "var(--primary)", subheading: "var(--accent)", footer: "var(--destructive)" };
                return (
                  <div key={slot} className="mb-1.5 flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: slotC[slot] }} />
                    <SliderControl label={`${_fieldLabels[slot]}${!_fieldChecks[slot] ? " (off)" : ""}`}
                      value={tSlots[slot].yPct} min={2} max={95} step={1} unit="%"
                      disabled={!_fieldChecks[slot]}
                      onChange={(v) => { const u = { ...tSlots, [slot]: { yPct: v } }; setTS(u); updS({ textSlots: u }); }} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ───────────────────────────────────────────── */
export function LeftPanel({ onContentGenerated, onSettingsChange, onGenerateVisual, hasContent, provider, apiKeyRaw, headerMode, mode, setMode, settings: settingsFromProps, registerPreviewToolbar }: LeftPanelProps) {
  /* ── Shared state ── */
  /** Sanitize API key: strip non-ASCII / invisible Unicode chars that break fetch headers */
  const apiKey = apiKeyRaw.replace(/[^\x20-\x7E]/g, "").trim();
  const [rawContent, setRawContent] = useState("");
  const [contentUploadedImage, setContentUploadedImage] = useState<string | null>(null);
  const [contentCustomInstructions, setContentCustomInstructions] = useState("");
  const contentImageInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [visualLoading, setVisualLoading] = useState(false);
  /** Tracks multi-image general generate for preview progress (not blog). */
  const [visualBatch, setVisualBatch] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editValues, setEditValues] = useState<GeneratedContent>({ heading: "", subheading: "", footer: "" });
  const [useHeading, setUseHeading] = useState(true);
  const [useSubheading, setUseSubheading] = useState(true);
  const [useFooter, setUseFooter] = useState(true);
  const [theme, setTheme] = useState("none");
  const [logoPosition, setLogoPosition] = useState("top-left");
  const [padding, setPadding] = useState(20);
  const [logoScale, setLogoScale] = useState(60);
  const [visualImage, setVisualImage] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 1080, height: 1080 });
  const [step, setStep] = useState(1);
  const [expandedTheme, setExpandedTheme] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fontSettings, setFontSettings] = useState({
    heading: { size: 40, weight: 600 },
    subheading: { size: 27, weight: 600 },
    footer: { size: 24, weight: 400 },
  });
  const [visualSlot, setVisualSlot] = useState({ widthPct: 100, heightPct: 100, yPct: 14 });
  const [textSlots, setTextSlots] = useState({
    heading: { yPct: 7 },
    subheading: { yPct: 10 },
    footer: { yPct: 80 },
  });
  const [textColorSettings, setTextColorSettings] = useState<TextColorSettings>({
    heading: { baseColor: "#FFFFFF", useGradient: true, wordStyles: {} },
    subheading: { baseColor: "#000000", useGradient: false, wordStyles: {} },
    footer: { baseColor: "#FFFFFF", useGradient: true, wordStyles: {} },
  });
  const [selectedWord, setSelectedWord] = useState<{ field: "heading" | "subheading" | "footer"; index: number } | null>(null);
  const [selectedThemes, setSelectedThemes] = useState<string[]>(["none"]);
  const [variationCount, setVariationCount] = useState(1);
  const [variations, setVariations] = useState<string[]>([]);
  const [activeVariation, setActiveVariation] = useState(0);
  const activeVariationRef = useRef(0);
  const [editPrompt, setEditPrompt] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [originalVariations, setOriginalVariations] = useState<string[]>([]);

  /* ── Blog mode state ── */
  const [blogContent, setBlogContent] = useState("");
  const [blogSections, setBlogSections] = useState<BlogSection[]>([]);
  const [blogLoading, setBlogLoading] = useState(false);
  const [blogImageLoading, setBlogImageLoading] = useState(false);
  const [blogProgress, setBlogProgress] = useState({ current: 0, total: 0 });
  const [activeBlogImage, setActiveBlogImage] = useState(0);
  const [blogCarouselOpen, setBlogCarouselOpen] = useState(false);
  const [blogEditPrompt, setBlogEditPrompt] = useState("");
  const [blogEditLoading, setBlogEditLoading] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselAutoplay, setCarouselAutoplay] = useState(false);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [blogInputMode, setBlogInputMode] = useState<"text" | "image">("text");
  const [blogUploadedImage, setBlogUploadedImage] = useState<string | null>(null);
  const [blogCustomInstructions, setBlogCustomInstructions] = useState("");
  const [blogAdvancedIdx, setBlogAdvancedIdx] = useState<number | null>(null);
  const blogImageInputRef = useRef<HTMLInputElement>(null);

  /* ── Template management state ── */
  const [customTemplates, setCustomTemplates] = useState<ThemeItem[]>(() => {
    try {
      const saved = localStorage.getItem("enkrypt-custom-templates");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [templatePasswordModal, setTemplatePasswordModal] = useState<{
    action: "upload" | "add" | "delete" | "edit";
    themeId?: string;
    pendingData?: Partial<ThemeItem>;
  } | null>(null);
  const [templatePasswordInput, setTemplatePasswordInput] = useState("");
  const [templatePasswordError, setTemplatePasswordError] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editTemplateForm, setEditTemplateForm] = useState<{ label: string; promptContext: string; visualPrompt: string; palette: string }>({ label: "", promptContext: "", visualPrompt: "", palette: "" });
  const templateUploadRef = useRef<HTMLInputElement>(null);
  const [pendingUploadThemeId, setPendingUploadThemeId] = useState<string | null>(null);

  /** All themes = defaults + custom */
  const themesBase: ThemeItem[] = [...defaultThemes.map(t => {
    const override = customTemplates.find(c => c.id === t.id);
    return override ? { ...t, ...override } : t;
  }), ...customTemplates.filter(c => !defaultThemes.some(d => d.id === c.id))];
  // Prepend "No Template" option so it appears first
  const themes: ThemeItem[] = [NO_TEMPLATE_THEME, ...themesBase];

  const saveCustomTemplates = (updated: ThemeItem[]) => {
    setCustomTemplates(updated);
    try { localStorage.setItem("enkrypt-custom-templates", JSON.stringify(updated)); } catch {}
  };

  const verifyTemplatePassword = (pw: string) => TEMPLATE_PASSWORDS.includes(pw);

  const handleTemplatePasswordSubmit = () => {
    if (!verifyTemplatePassword(templatePasswordInput)) {
      setTemplatePasswordError("Incorrect password");
      return;
    }
    setTemplatePasswordError("");
    const modal = templatePasswordModal;
    if (!modal) return;

    if (modal.action === "upload" && modal.themeId && modal.pendingData?.image) {
      const existing = customTemplates.find(c => c.id === modal.themeId);
      if (existing) {
        saveCustomTemplates(customTemplates.map(c => c.id === modal.themeId ? { ...c, image: modal.pendingData!.image! } : c));
      } else {
        const base = defaultThemes.find(t => t.id === modal.themeId);
        if (base) saveCustomTemplates([...customTemplates, { ...base, image: modal.pendingData!.image!, isCustom: true }]);
      }
    } else if (modal.action === "add" && modal.pendingData) {
      const newT: ThemeItem = {
        id: `custom-${Date.now()}`,
        label: modal.pendingData.label || "New Template",
        image: modal.pendingData.image || "",
        promptContext: modal.pendingData.promptContext || "",
        visualPrompt: modal.pendingData.visualPrompt || "",
        palette: modal.pendingData.palette || ["#7F56D9", "#FF7404", "#FF3BA2", "#FDDCB5", "#FFF8F2", "#333333"],
        isCustom: true,
      };
      saveCustomTemplates([...customTemplates, newT]);
    } else if (modal.action === "delete" && modal.themeId) {
      saveCustomTemplates(customTemplates.filter(c => c.id !== modal.themeId));
    } else if (modal.action === "edit" && modal.themeId && modal.pendingData) {
      const existing = customTemplates.find(c => c.id === modal.themeId);
      if (existing) {
        saveCustomTemplates(customTemplates.map(c => c.id === modal.themeId ? { ...c, ...modal.pendingData } : c));
      } else {
        const base = defaultThemes.find(t => t.id === modal.themeId);
        if (base) saveCustomTemplates([...customTemplates, { ...base, ...modal.pendingData, isCustom: true }]);
      }
    }
    setTemplatePasswordModal(null);
    setTemplatePasswordInput("");
  };

  const handleTemplateImageUpload = (file: File, themeId: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setTemplatePasswordModal({ action: "upload", themeId, pendingData: { image: dataUrl } });
    };
    reader.readAsDataURL(file);
  };

  const handleAddNewTemplate = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setTemplatePasswordModal({
        action: "add",
        pendingData: {
          label: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
          image: dataUrl,
          promptContext: "",
          visualPrompt: "",
          palette: ["#7F56D9", "#FF7404", "#FF3BA2", "#FDDCB5", "#FFF8F2", "#333333"],
        },
      });
    };
    reader.readAsDataURL(file);
  };

  /* ── Helpers ── */
  const updateSettings = useCallback((overrides: Partial<SettingsPayload>) => {
    if (settingsFromProps) {
      onSettingsChange({ ...settingsFromProps, ...overrides });
      return;
    }
    onSettingsChange({
      theme, selectedThemes, logoPosition, padding, logoScale, visualImage, size, content: generated,
      useHeading, useSubheading, useFooter,
      fontSettings, visualSlot, textSlots, mode, textColorSettings,
      variations, activeVariation, ...overrides,
    });
  }, [theme, selectedThemes, logoPosition, padding, logoScale, visualImage, size, generated, useHeading, useSubheading, useFooter, fontSettings, visualSlot, textSlots, mode, textColorSettings, variations, activeVariation, onSettingsChange, settingsFromProps]);

  useEffect(() => {
    activeVariationRef.current = activeVariation;
  }, [activeVariation]);

  // Re-push settings when text field toggles change so preview updates immediately
  useEffect(() => { updateSettings({}); }, [useHeading, useSubheading, useFooter]); // eslint-disable-line react-hooks/exhaustive-deps

  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(""), 5000); };
  const getSelectedTheme = () => themes.find((t) => t.id === theme) ?? themes[0];
  const getThemeById = (id: string) => themes.find((t) => t.id === id) ?? themes[0];
  const toggleThemeSelection = (id: string) => {
    const next = selectedThemes.includes(id) ? selectedThemes.filter((t) => t !== id) : [...selectedThemes, id];
    if (next.length === 0) return;
    setSelectedThemes(next);
    if (!next.includes(theme)) {
      setTheme(next[0]);
      updateSettings({ selectedThemes: next, theme: next[0] });
    } else {
      updateSettings({ selectedThemes: next });
    }
  };

  /* ── Convert an image URL to base64 for multimodal API calls ── */
  const imageUrlToBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  /* ── Build layout context shared across prompts ── */
  const buildLayoutContext = () => {
    const pos = positions.find((p) => p.id === logoPosition);
    const sizeLabel = size.width === size.height ? "1:1 square (1080×1080)" : "16:9 landscape (1920×1080)";
    return `POST LAYOUT:\n- Canvas size: ${sizeLabel}\n- Logo placement: ${pos?.label ?? logoPosition} at ${logoScale}% scale\n- Edge padding: ${padding}px\n- Background: warm peach/coral Enkrypt AI branded gradient (already provided — do NOT recreate the bg)`;
  };

  /* ── API: Generate text structure (sends template image via vision) ── */
  const handleGenerateStructure = async () => {
    if (!apiKey) { showError("Enter API key"); return; }
    const hasText = !!rawContent.trim();
    const hasImg = !!contentUploadedImage;
    if (!hasText && !hasImg) { showError("Enter content or upload an image"); return; }
    setLoading(true);
    setError("");

    const selectedTheme = getSelectedTheme();
    const layoutCtx = buildLayoutContext();
    const paletteStr = selectedTheme.palette.join(", ");

    const customInstr = contentCustomInstructions.trim() ? `\n\nCUSTOM INSTRUCTIONS FROM USER:\n${contentCustomInstructions.trim()}` : "";

    const sourceDesc = hasImg && !hasText
      ? "I am sharing an image (screenshot, infographic, slide, or visual content). Analyze the image carefully — extract ALL text, data points, concepts, and structure from it. Use the extracted content as the raw material to create structured text fields."
      : hasImg && hasText
        ? "I am sharing both an image AND raw text content. Use the image as primary reference — extract its text, layout, and data. Combine with the text content provided to create the best structured output."
        : "Take the following raw content and structure it into text fields that would fit naturally into the template layout shown in the image.";

    const isNoTemplate = selectedTheme.isNone;
    const textPrompt = `You are a content creator for Enkrypt AI (AI security company).\n\n${isNoTemplate ? "No specific template is selected. Use a clean, modern, professional tone." : `Style reference: "${selectedTheme.label}"\n${selectedTheme.promptContext}`}\nCOLOR PALETTE: ${paletteStr}\n\n${layoutCtx}\n\nIMPORTANT: Generate content based SOLELY on the user's raw content below. Do NOT use any text or subject matter from any template.\n\nYOUR TASK:\n${sourceDesc} Structure the USER'S content into heading, subheading, and footer fields.${isNoTemplate ? "" : " Match the template's tone/style but use ONLY the user's topic."}\n\n${hasText ? `RAW CONTENT (use ONLY this for topic and substance):\n${rawContent}\n` : ""}${customInstr}\n\nReturn ONLY valid JSON — no markdown, no explanation:\n{\n    "heading": "catchy heading from the user's content (max 10 words)",\n    "subheading": "supporting text from the user's content (max 15 words)",\n    "footer": "call-to-action or tagline relevant to the user's topic (max 10 words)"\n}`;

    try {
      // Template image is NOT sent — style is described in text prompt to prevent content copying

      let uploadedB64 = "";
      if (hasImg && contentUploadedImage) {
        uploadedB64 = contentUploadedImage.split(",")[1] || "";
      }

      let response: Response;
      if (provider === "openai") {
        const contentParts: any[] = [];
        // Only send user-uploaded image (no template image)
        if (uploadedB64) {
          contentParts.push({ type: "image_url", image_url: { url: contentUploadedImage!, detail: "high" } });
        }
        contentParts.push({ type: "text", text: textPrompt });
        const messages: any[] = [{ role: "user", content: contentParts }];
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
          body: JSON.stringify({
            model: ENKRYPT_OPENAI_CHAT_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 500,
            ...openAiChatCompletionsExtras(ENKRYPT_OPENAI_CHAT_MODEL),
          }),
        });
      } else {
        const parts: any[] = [];
        if (uploadedB64) {
          const mimeMatch = contentUploadedImage?.match(/data:([^;]+);/);
          const mime = mimeMatch ? mimeMatch[1] : "image/png";
          parts.push({ inlineData: { mimeType: mime, data: uploadedB64 } });
        }
        parts.push({ text: textPrompt });
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts }] }),
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "API Error " + response.status);
      }

      const data = await response.json();
      let content = provider === "openai"
        ? data.choices[0].message.content
        : data.candidates[0].content.parts[0].text;

      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const structured: GeneratedContent = JSON.parse(content);
      setGenerated(structured);
      setEditValues(structured);
      onContentGenerated(structured);
      updateSettings({ content: structured });
      setStep(2);
      return structured;
    } catch (err: any) {
      showError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* ── API: Generate a single visual image for a specific theme ── */
  const generateSingleVisual = async (content: GeneratedContent, themeId: string, variationIdx: number, sourceImage?: string | null, omitContentTextInImage?: boolean, visualBrief?: string | null): Promise<string | null> => {
    const selectedTheme = getThemeById(themeId);
    const paletteStr = selectedTheme.palette.join(", ");
    const layoutCtx = buildLayoutContext();

    // Compute actual visual slot dimensions from layout (heading/subheading/footer + gap); prompt AI to generate for that size; image can be scaled in slot if user changes font/gap later
    const s = settingsFromProps;
    const slotDims = getVisualSlotDimensions({
      size,
      padding: s?.padding ?? padding,
      slotGap: s?.slotGap ?? 14,
      content,
      useHeading: s?.useHeading ?? useHeading,
      useSubheading: s?.useSubheading ?? useSubheading,
      useFooter: s?.useFooter ?? useFooter,
      fontSettings: s?.fontSettings ?? fontSettings,
      textSlots: s?.textSlots ?? textSlots,
      visualSlot: s?.visualSlot ?? visualSlot,
    });
    const visualSlotSizeCtx = `VISUAL SLOT: The image will be displayed in a slot of size ${slotDims.width}×${slotDims.height} pixels (this is the remaining space after heading, subheading, and footer). Generate the image for this exact width×height so it fills the whole slot. The image may be scaled when displayed if the user changes font size or spacing.`;

    // Template image is NOT sent to the AI — style is described in the prompt text.
    // This prevents the AI from copying the template's content/text.

    // Extract base64 from source image if provided
    let sourceB64 = "";
    let sourceMime = "image/png";
    if (sourceImage) {
      sourceB64 = sourceImage.split(",")[1] || "";
      const mimeMatch = sourceImage.match(/data:([^;]+);/);
      if (mimeMatch) sourceMime = mimeMatch[1];
    }

    const sourceImageCtx = sourceB64
      ? `\n\nSOURCE IMAGE PROVIDED: I have also attached the user's uploaded source image. Study it carefully — extract its visual structure, data, layout, icons, charts, and any text content. Your goal is to CONVERT and TRANSFORM this source image's content into the template style above. Preserve the meaning and information from the source but completely restyle it to match the template's visual language, colors, and layout patterns.`
      : "";

    const variationHint = variationIdx > 0 ? `\nVARIATION #${variationIdx + 1}: Create a distinctly DIFFERENT composition from previous variations. Use different icon arrangements, card layouts, and visual flow while keeping the same content and color palette.` : "";

    const designerWhiteBgClause =
      headerMode === "designer" && settingsFromProps?.designerWhiteBg
        ? `\n\n*** DESIGNER — SOLID WHITE BACKGROUND (mandatory; overrides conflicting background rules above): *** The full-bleed canvas background must be pure flat white #FFFFFF only — no outer gradient, peach, cream, gray wash, vignette, or tinted fill behind the entire composition. No colored field with a large white “card” floating on top for the whole image. Inner elements (chips, small cards, diagrams) may use subtle fills for hierarchy. This overrides any instruction to use a single light wash at 20–30% opacity for the whole image — use solid #FFFFFF for the overall background instead.`
        : "";

    const isNoTemplate = selectedTheme.isNone;

    // Brand color instructions that apply to ALL generations (with or without template)
    const brandColorRules = `\nBRAND COLOR GUIDANCE (follow strictly):\n- Primary accents: brand gradient orange #FF7404 → pink #FF3BA2 for icons, highlights, and decorative elements.\n- RED COLOR — this is a targeted rule, not a generic guideline: The CONTENT & VISUAL DIRECTION section below contains a VISUAL BRIEF with a ⚑ RED COLOR INSTRUCTION and a RED DECISION field. Read those fields now. If RED DECISION says ACTIVE, apply red #D92D20 to ONLY the exact element(s) named — do not use red anywhere else. If RED DECISION says INACTIVE, do NOT use red anywhere in this image — not as a border, frame, accent, glow, or any form of emphasis. This rule overrides any default behavior.\n- Extended accents: electric teal #06B6D4 or violet #7C3AED may be used as secondary accents when specified in the brief's PALETTE field.\n- Success/protected/secure: green #16B364 only for explicitly positive/secure/approved states.\n- Backgrounds: follow the PALETTE field in the brief. Dark backgrounds (#0A0F1E, #0D0F14) are valid and preferred for security/threat content. On dark backgrounds, use cool white #F0F4FF for labels and annotations.`;

    const templateCtx = isNoTemplate
      ? `\nYou have full creative freedom for the layout and style. Create a clean, modern, professional social media visual.\n${selectedTheme.visualPrompt}`
      : `\nTHEME REFERENCE (color palette and visual tone ONLY — do NOT copy the template's layout, structure, or content):\nTheme name: "${selectedTheme.label}"\nColor palette: ${paletteStr}\nTone/mood: ${selectedTheme.promptContext}\n\n*** CRITICAL: The template is ONLY a color/style/mood reference. Do NOT replicate the template's layout structure, card arrangement, grid, icons, diagrams, flowcharts, or any visual composition from the template. Create your OWN original layout that best presents the user's content. Use the template's colors and visual tone to style your original layout. ***`;

    const contentAndVisualBlock = buildContentAndVisualBlock(content, visualBrief ?? null, !!omitContentTextInImage);
    const imgPrompt = omitContentTextInImage
      ? `You are an expert graphic designer. Generate a supporting visual (illustration, diagram, or graphic) that will be composed with text displayed separately by the app.\n\n${templateCtx}\n${brandColorRules}\n\n--- CONTENT & VISUAL DIRECTION ---\n${contentAndVisualBlock}\n---\n\n${layoutCtx}\n${visualSlotSizeCtx}\n\nREQUIREMENTS:\n*** CRITICAL — ONE BACKGROUND ONLY (no \"2 bg\"): *** Do NOT use two layers. FORBIDDEN: outer peach/orange/gradient fill with a white card or white panel on top. FORBIDDEN: colored background visible around the edges of a central white rectangle. FORBIDDEN: white card in the center with gradient around it. REQUIRED: one unified light background only (e.g. one light fill at 20–30% opacity for the whole image). Put all content (icons, list items, text) directly on that one background; no second card or panel behind the content. No white rectangle floating on a colored background. The app has a white/light canvas; do not use a fully transparent background.\n1. SINGLE BACKGROUND — One light fill (20–30% opacity) for the whole image only; no second layer, no white card on gradient.\n2. NO THICK BORDER OR FRAME — Do not add any thick border, frame, or outer margin in brand colors (no orange, pink, peach, or gradient band around the image or around inner containers). No thick colored strip, decorative edge, or "brand frame." Content must fill the slot edge to edge with zero wasted space. Inside cards/containers, keep inner padding minimal — do not create a wide empty "border" inside white boxes; let content use the space.\n3. CURVED BORDERS — Use rounded, curved corners for the overall visual and any main containers; no sharp rectangular edges.\n4. NO LOGO — Do not draw any logo, brand mark, or "Enkrypt". Leave the ${logoPosition} area clear.\n5. Use the color palette as guidance: ${paletteStr}. Brand gradient (orange #FF7404 to pink #FF3BA2) for accents; red (#D92D20) for danger/warning; green (#16B364) for success.\n6. ASPECT RATIO: ${size.width === size.height ? "Square (1:1)" : "Landscape (16:9)"}.${sourceImageCtx}${variationHint}${designerWhiteBgClause}`
      : `You are an expert graphic designer and visual storyteller. The user has already provided three pieces of content. Your job is to generate an image that brings this content to life — the image must prominently feature and be built around these three elements.\n\n${templateCtx}\n${brandColorRules}\n\n--- CONTENT & VISUAL DIRECTION ---\n${contentAndVisualBlock}\n---\n\nGenerate a visual that:\n- Renders the heading, subheading, and footer as clear, legible text in the image. Place them where they best support the composition.\n- Can include as much additional text as you want: bullet points, labels, stats, captions, annotations, list items, callouts — anything that supports the message.\n- Uses your own layout and composition. Apply the theme's colors and tone. Include icons, illustrations, diagrams, charts, or any visual elements that fit the topic.\n- Feels complete and polished — whatever style best serves the message.\n\n${layoutCtx}\n${visualSlotSizeCtx}\n\nREQUIREMENTS:\n*** CRITICAL — ONE BACKGROUND ONLY (no \"2 bg\"): *** Do NOT use two layers. FORBIDDEN: outer peach/orange/gradient fill with a white card or white panel on top. FORBIDDEN: colored background visible around the edges of a central white rectangle. FORBIDDEN: white card in the center with gradient around it. REQUIRED: one unified light background only (e.g. one light fill at 20–30% opacity for the whole image). Put all content (icons, list items, text) directly on that one background; no second card or panel behind the content. No white rectangle floating on a colored background. The app has a white/light canvas; do not use a fully transparent background.\n1. SINGLE BACKGROUND — One light fill (20–30% opacity) for the whole image only; no second layer, no white card on gradient.\n2. NO THICK BORDER OR FRAME — Do not add any thick border, frame, or outer margin in brand colors (no orange, pink, peach, or gradient band around the image or around inner containers). No thick colored strip, decorative edge, or "brand frame." Content must fill the slot edge to edge with zero wasted space. Inside cards/containers, keep inner padding minimal — do not create a wide empty "border" inside white boxes; let content use the space.\n3. CURVED BORDERS — Use rounded, curved corners for the overall visual and any main containers; no sharp rectangular edges.\n4. Include the three content pieces above as text in the image. You may use any typography, size, and placement that works. Add any other text that strengthens the visual.\n5. NO LOGO — Do not draw any logo, brand mark, or "Enkrypt". Leave the ${logoPosition} area clear.\n6. Use the color palette as guidance: ${paletteStr}. Brand gradient (orange #FF7404 to pink #FF3BA2) for accents; red (#D92D20) for danger/warning; green (#16B364) for success; near-black for body text where readable.\n7. ASPECT RATIO: ${size.width === size.height ? "Square (1:1)" : "Landscape (16:9)"}.\n8. No arbitrary limits on layout, amount of text, or style — do what best communicates the heading, subheading, and footer.${sourceImageCtx}${variationHint}${designerWhiteBgClause}`;

    try {
      if (provider === "openai") {
        // Never send the template image — it causes the AI to copy template content.
        // Template style is fully described in the text prompt instead.
        // Only use /edits when user has a source image; otherwise use /generations.
        if (sourceB64) {
          const formData = new FormData();
          formData.append("model", "gpt-image-1");
          formData.append("prompt", imgPrompt);
          formData.append("n", "1");
          formData.append("size", "1024x1024");
          formData.append("quality", "high");

          const byteStr2 = atob(sourceB64);
          const ab2 = new Uint8Array(byteStr2.length);
          for (let i = 0; i < byteStr2.length; i++) ab2[i] = byteStr2.charCodeAt(i);
          const sourceBlob = new Blob([ab2], { type: sourceMime });
          formData.append("image[]", sourceBlob, "source-content.png");

          const response = await fetch("https://api.openai.com/v1/images/edits", {
            method: "POST",
            headers: { Authorization: "Bearer " + apiKey },
            body: formData,
          });

          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "Image generation failed: " + response.status);
          }

          const data = await response.json();
          const b64 = data.data[0].b64_json;
          return `data:image/png;base64,${b64}`;
        }

        const response = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-image-1",
            prompt: imgPrompt,
            n: 1,
            size: "1024x1024",
            quality: "high",
            output_format: "png",
          }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || "Image generation failed: " + response.status);
        }

        const data = await response.json();
        const b64 = data.data[0].b64_json;
        return `data:image/png;base64,${b64}`;
      } else {
        const parts: any[] = [];
        // Don't send template image — style is described in the prompt text only
        if (sourceB64) {
          parts.push({ inlineData: { mimeType: sourceMime, data: sourceB64 } });
        }
        parts.push({ text: imgPrompt });

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || "Image generation failed: " + response.status);
        }

        const data = await response.json();
        const respParts = data.candidates?.[0]?.content?.parts || [];
        const imgPart = respParts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
        if (imgPart) {
          return `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
        } else {
          throw new Error("Gemini did not return an image. Try OpenAI for image generation.");
        }
      }
    } catch (err: any) {
      throw err;
    }
  };

  /* ── API: Generate visual image(s) — handles variations + multi-template ── */
  const generateVisualImage = async (contentOverride?: GeneratedContent) => {
    const content = contentOverride ?? generated;
    if (!apiKey) { showError("Enter API key to generate visual"); return; }
    if (!content) { showError("Generate content structure first"); return; }
    setVisualLoading(true);
    setError("");

    setVariations([]);
    setOriginalVariations([]);
    setVisualImage(null);
    setActiveVariation(0);
    // Always pass `content` here: props may still be stale right after handleGenerateStructure
    // (parent has not re-rendered), so spreading settingsFromProps alone would drop structured text.
    updateSettings({ visualImage: null, variations: [], activeVariation: 0, content });
    onGenerateVisual();

    const themesToUse = selectedThemes.length > 0 ? selectedThemes : [theme];
    const batchTotal = themesToUse.length * variationCount;
    setVisualBatch(batchTotal > 1 ? { done: 0, total: batchTotal } : null);
    const accumulated: string[] = [];

    try {
      // Build a content-aware visual brief from pasted content + heading/subheading/footer for better image prompting
      const visualBrief = await buildVisualBrief(rawContent, content, apiKey, provider);

      let idx = 0;
      for (const tid of themesToUse) {
        for (let v = 0; v < variationCount; v++) {
          const dataUrl = await generateSingleVisual(content, tid, idx, contentUploadedImage, true, visualBrief);
          if (dataUrl) {
            accumulated.push(dataUrl);
            setVariations([...accumulated]);
            setOriginalVariations([...accumulated]);
            if (batchTotal > 1) setVisualBatch({ done: accumulated.length, total: batchTotal });

            // Always merge explicit visualImage + activeVariation: later updates only passed
            // { variations, content } and stale settingsFromProps could omit visualImage from
            // the parent state that was set on the first image — canvas stayed blank until Versions click.
            const av = Math.min(
              Math.max(0, activeVariationRef.current),
              accumulated.length - 1,
            );
            const imgForPreview = accumulated[av];
            setVisualImage(imgForPreview);
            if (av !== activeVariation) setActiveVariation(av);
            updateSettings({
              visualImage: imgForPreview,
              content,
              variations: [...accumulated],
              activeVariation: av,
            });
            onGenerateVisual();
          }
          idx++;
        }
      }

      if (accumulated.length === 0) {
        showError("No images were generated.");
      }
    } catch (err: any) {
      showError(err.message);
    } finally {
      setVisualLoading(false);
      setVisualBatch(null);
    }
  };

  /* ── API: Edit generated image with prompt ── */
  const handleEditImage = async () => {
    if (!apiKey) { showError("Enter API key"); return; }
    if (!editPrompt.trim()) { showError("Enter an edit instruction"); return; }
    const currentImg = variations[activeVariation] || visualImage;
    if (!currentImg) { showError("No image to edit"); return; }
    setEditLoading(true);
    setError("");

    try {
      const b64Data = currentImg.split(",")[1];
      if (!b64Data) throw new Error("Invalid image data");

      const editFullPrompt = `You are editing an EXISTING image. The attached image is the current design — do NOT regenerate it from scratch. Make ONLY the specific change described below while preserving everything else exactly as-is.\n\nEDIT INSTRUCTION: ${editPrompt.trim()}\n\nCRITICAL: Keep the existing layout, colors, icons, text, composition, and light background completely intact. Only apply the minimal change requested above. The result should look identical to the original except for the specific edit.`;

      if (provider === "openai") {
        const byteStr = atob(b64Data);
        const ab = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) ab[i] = byteStr.charCodeAt(i);
        const imgBlob = new Blob([ab], { type: "image/png" });

        const formData = new FormData();
        formData.append("model", "gpt-image-1");
        formData.append("prompt", editFullPrompt);
        formData.append("image[]", imgBlob, "current-image.png");
        formData.append("n", "1");
        formData.append("size", "1024x1024");
        formData.append("quality", "high");

        const response = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: "Bearer " + apiKey },
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || "Edit failed: " + response.status);
        }

        const data = await response.json();
        const newB64 = data.data[0].b64_json;
        const dataUrl = `data:image/png;base64,${newB64}`;

        const newVariations = [...variations];
        newVariations[activeVariation] = dataUrl;
        setVariations(newVariations);
        setVisualImage(dataUrl);
        updateSettings({ visualImage: dataUrl, variations: newVariations });
        onGenerateVisual();
      } else {
        const parts: any[] = [
          { inlineData: { mimeType: "image/png", data: b64Data } },
          { text: editFullPrompt },
        ];

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || "Edit failed: " + response.status);
        }

        const data = await response.json();
        const respParts = data.candidates?.[0]?.content?.parts || [];
        const imgPart = respParts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
        if (imgPart) {
          const dataUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
          const newVariations = [...variations];
          newVariations[activeVariation] = dataUrl;
          setVariations(newVariations);
          setVisualImage(dataUrl);
          updateSettings({ visualImage: dataUrl, variations: newVariations });
          onGenerateVisual();
        } else {
          throw new Error("Gemini did not return an edited image.");
        }
      }
      setEditPrompt("");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  /* ── API: Edit blog section image with prompt ── */
  const handleBlogEditImage = async () => {
    if (!apiKey) { showError("Enter API key"); return; }
    if (!blogEditPrompt.trim()) { showError("Enter an edit instruction"); return; }
    const sec = blogSections[activeBlogImage];
    if (!sec?.image) { showError("No image to edit — select a generated section"); return; }
    setBlogEditLoading(true);
    setError("");

    try {
      const b64Data = sec.image.split(",")[1];
      if (!b64Data) throw new Error("Invalid image data");

      const editFullPrompt = `You are editing an EXISTING image. The attached image is the current design — do NOT regenerate it from scratch. Make ONLY the specific change described below while preserving everything else exactly as-is.\n\nEDIT INSTRUCTION: ${blogEditPrompt.trim()}\n\nCRITICAL: Keep the existing layout, colors, icons, text, composition, and light background completely intact. Only apply the minimal change requested above. The result should look identical to the original except for the specific edit.`;

      if (provider === "openai") {
        const byteStr = atob(b64Data);
        const ab = new Uint8Array(byteStr.length);
        for (let i = 0; i < byteStr.length; i++) ab[i] = byteStr.charCodeAt(i);
        const imgBlob = new Blob([ab], { type: "image/png" });

        const formData = new FormData();
        formData.append("model", "gpt-image-1");
        formData.append("prompt", editFullPrompt);
        formData.append("image[]", imgBlob, "current-image.png");
        formData.append("n", "1");
        formData.append("size", "1024x1024");
        formData.append("quality", "high");

        const response = await fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: "Bearer " + apiKey },
          body: formData,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || "Edit failed: " + response.status);
        }

        const data = await response.json();
        const newB64 = data.data[0].b64_json;
        const dataUrl = `data:image/png;base64,${newB64}`;

        const updated = [...blogSections];
        updated[activeBlogImage] = { ...sec, image: dataUrl };
        setBlogSections(updated);
        updateSettings({ visualImage: dataUrl });
        onGenerateVisual();
      } else {
        const parts: any[] = [
          { inlineData: { mimeType: "image/png", data: b64Data } },
          { text: editFullPrompt },
        ];

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }],
              generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
            }),
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message || "Edit failed: " + response.status);
        }

        const data = await response.json();
        const respParts = data.candidates?.[0]?.content?.parts || [];
        const imgPart = respParts.find((p: any) => p.inlineData?.mimeType?.startsWith("image/"));
        if (imgPart) {
          const dataUrl = `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`;
          const updated = [...blogSections];
          updated[activeBlogImage] = { ...sec, image: dataUrl };
          setBlogSections(updated);
          updateSettings({ visualImage: dataUrl });
          onGenerateVisual();
        } else {
          throw new Error("Gemini did not return an edited image.");
        }
      }
      setBlogEditPrompt("");
    } catch (err: any) {
      showError(err.message);
    } finally {
      setBlogEditLoading(false);
    }
  };

  /* ── Crop: apply cropped image back (general + blog section image) ── */
  const handleCropApply = useCallback((croppedDataUrl: string) => {
    const currentImg = variations[activeVariation];
    const newVariations = [...variations];
    newVariations[activeVariation] = croppedDataUrl;
    setVariations(newVariations);
    setVisualImage(croppedDataUrl);
    updateSettings({ visualImage: croppedDataUrl, variations: newVariations });
    if (mode === "blog" && currentImg) {
      const secIdx = blogSections.findIndex(s => s.image === currentImg);
      if (secIdx >= 0) {
        const updated = [...blogSections];
        updated[secIdx] = { ...updated[secIdx], image: croppedDataUrl };
        setBlogSections(updated);
      }
    }
    onGenerateVisual();
    setShowCropModal(false);
  }, [variations, activeVariation, mode, blogSections, updateSettings, onGenerateVisual]);

  const handleCropResetOriginal = useCallback(() => {
    const orig = originalVariations[activeVariation];
    if (!orig) return;
    const currentImg = variations[activeVariation];
    const newVariations = [...variations];
    newVariations[activeVariation] = orig;
    setVariations(newVariations);
    setVisualImage(orig);
    updateSettings({ visualImage: orig, variations: newVariations });
    if (mode === "blog" && currentImg) {
      const secIdx = blogSections.findIndex(s => s.image === currentImg);
      if (secIdx >= 0) {
        const updated = [...blogSections];
        updated[secIdx] = { ...updated[secIdx], image: orig };
        setBlogSections(updated);
      }
    }
    onGenerateVisual();
  }, [originalVariations, activeVariation, variations, mode, blogSections, updateSettings, onGenerateVisual]);

  /* ── General mode: one-click generate (advanced only; basic removed) ── */
  const handleBasicGenerate = async () => {
    if (!apiKey) { showError("Enter your API key first"); return; }
    if (!rawContent && !contentUploadedImage) { showError("Enter content or upload an image"); return; }
    setLoading(true);
    const structured = await handleGenerateStructure();
    if (structured) {
      await generateVisualImage(structured);
    }
    setLoading(false);
  };

  /* ── Blog mode: split blog into sections ── */
  const handleBlogSplit = async () => {
    if (!apiKey) { showError("Enter API key"); return; }
    const hasText = blogContent.trim().length > 0;
    const hasImage = !!blogUploadedImage;
    if (!hasText && !hasImage) { showError("Provide blog content or upload an image"); return; }
    setBlogLoading(true);
    setError("");

    const customInstr = blogCustomInstructions.trim() ? `\n\nCUSTOM INSTRUCTIONS FROM USER:\n${blogCustomInstructions.trim()}` : "";

    const sourceDescription = hasImage && !hasText
      ? "I am sharing an image (screenshot, infographic, slide, or visual content). Analyze the image carefully — extract ALL text, data points, concepts, and structure from it. Then split the extracted content into visual sections."
      : hasImage && hasText
        ? "I am sharing both an image AND text content below. Use the image as primary reference — extract its text, layout, and data. Combine with the text content provided to create comprehensive visual sections."
        : "Analyze the following blog post and split it into logical visual sections.";

    const splitPrompt = `You are a content strategist for Enkrypt AI (AI security company).

${sourceDescription}

Your job: split the content into a small number of DISTINCT sections. Each section will get exactly one generated visual, so each must be a different topic, theme, or narrative beat.

RULES:
- Create 3 to 5 sections only. Prefer fewer, high-impact sections over many small ones. Short or thin content → 3 sections; long, dense content → up to 5. Never return more than 5 sections.
- Be content-aware: identify the real structure of the post (e.g. intro, problem, solution, CTA; or topic 1, topic 2, topic 3). Do not split into tiny fragments or repeat the same idea.
- Each section must be clearly different from the others so each visual will be unique.

For each section provide:
- heading: A bold, attention-grabbing title for that section only (max 8 words)
- subheading: Supporting text specific to this section (max 15 words)
- footer: A CTA, stat, or tagline for this section (max 8 words)

BRAND STYLE: Clean, modern, professional Enkrypt AI branded visuals. Brand gradient (#FF7404 → #FF3BA2) for icons, red (#D92D20) for danger, green (#16B364) for success, near-black (#1A1A1A) for text.
${hasText ? `\nTEXT CONTENT:\n${blogContent}` : ""}${customInstr}

Return ONLY a valid JSON array with 3 to 5 items — no markdown, no explanation:
[
  { "heading": "...", "subheading": "...", "footer": "..." },
  ...
]`;

    try {
      let response: Response;
      // Template image is NOT sent — style is described in the text prompt to prevent content copying

      // Extract base64 from uploaded image if present
      let uploadedB64 = "";
      if (hasImage && blogUploadedImage) {
        uploadedB64 = blogUploadedImage.split(",")[1] || "";
      }

      if (provider === "openai") {
        const contentParts: any[] = [];
        // Only send user-uploaded image (no template image)
        if (uploadedB64) {
          contentParts.push({ type: "image_url", image_url: { url: blogUploadedImage!, detail: "high" } });
        }
        contentParts.push({ type: "text", text: splitPrompt });

        const messages: any[] = [{ role: "user", content: contentParts }];
        response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + apiKey },
          body: JSON.stringify({
            model: ENKRYPT_OPENAI_CHAT_MODEL,
            messages,
            temperature: 0.7,
            max_tokens: 2000,
            ...openAiChatCompletionsExtras(ENKRYPT_OPENAI_CHAT_MODEL),
          }),
        });
      } else {
        const parts: any[] = [];
        if (uploadedB64) {
          const mimeMatch = blogUploadedImage?.match(/data:([^;]+);/);
          const mime = mimeMatch ? mimeMatch[1] : "image/png";
          parts.push({ inlineData: { mimeType: mime, data: uploadedB64 } });
        }
        parts.push({ text: splitPrompt });
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ENKRYPT_GEMINI_CHAT_MODEL}:generateContent?key=${apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts }] }),
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "API Error " + response.status);
      }

      const data = await response.json();
      let content = provider === "openai"
        ? data.choices[0].message.content
        : data.candidates[0].content.parts[0].text;

      content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      let sections: { heading: string; subheading: string; footer: string }[] = JSON.parse(content);
      // Blog mode: cap at 5 sections so we don't get too many variants; keep content-aware subset
      if (sections.length > 5) sections = sections.slice(0, 5);

      const defaultThemeId = "none";
      const blogSecs: BlogSection[] = sections.map((s, i) => ({
        index: i,
        heading: s.heading,
        subheading: s.subheading,
        footer: s.footer,
        status: "pending" as const,
        enabled: true,
        themeId: defaultThemeId,
      }));

      setBlogSections(blogSecs);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setBlogLoading(false);
    }
  };

  /* ── Blog mode: generate all images for blog sections ── */
  const handleBlogGenerateAll = async () => {
    if (!apiKey) { showError("Enter API key"); return; }
    const enabledSections = blogSections.filter(s => s.enabled);
    if (enabledSections.length === 0) { showError("Enable at least one section to generate"); return; }
    setBlogImageLoading(true);
    setError("");

    const total = enabledSections.length;
    setBlogProgress({ current: 0, total });

    const updatedSections = [...blogSections];
    let generatedCount = 0;

    for (let i = 0; i < updatedSections.length; i++) {
      const sec = updatedSections[i];
      if (!sec.enabled) continue;

      updatedSections[i] = { ...sec, status: "generating" };
      setBlogSections([...updatedSections]);
      setBlogProgress({ current: generatedCount, total });

      try {
        const contentForSection: GeneratedContent = {
          heading: sec.heading,
          subheading: sec.subheading,
          footer: sec.footer,
        };
        // Blog mode: prompt for this section only — use only this section's content so the image is content-aware and distinct
        const sectionRawContext = [sec.heading, sec.subheading, sec.footer].filter(Boolean).join(" ");
        const sectionBrief = await buildVisualBrief(sectionRawContext, contentForSection, apiKey, provider);
        const visualBrief = sectionBrief + " This image is for ONE section of a multi-section blog. Illustrate ONLY this section's topic; do not combine with other sections. The visual must clearly match this section's concept (e.g. if the section is about scanning, show scan-related visuals; if about permissions, show permission/shield visuals).";
        const imgUrl = await generateSingleVisual(contentForSection, sec.themeId, i, blogUploadedImage, true, visualBrief);
        updatedSections[i] = { ...updatedSections[i], image: imgUrl || undefined, status: imgUrl ? "done" : "error" };
      } catch {
        updatedSections[i] = { ...updatedSections[i], status: "error" };
      }
      setBlogSections([...updatedSections]);
      generatedCount++;
    }

    setBlogProgress({ current: total, total });
    setBlogImageLoading(false);

    // Set first image as the preview
    const firstDone = updatedSections.find(s => s.status === "done");
    if (firstDone?.image) {
      setVisualImage(firstDone.image);
      const allImages = updatedSections.filter(s => s.image).map(s => s.image!);
      setVariations(allImages);
      setOriginalVariations([...allImages]);
      setActiveVariation(0);
      setActiveBlogImage(0);
      const firstContent: GeneratedContent = { heading: firstDone.heading, subheading: firstDone.subheading, footer: firstDone.footer };
      setGenerated(firstContent);
      onContentGenerated(firstContent);
      updateSettings({ visualImage: firstDone.image, content: firstContent, variations: allImages, activeVariation: 0 });
      onGenerateVisual();
    }
  };

  /* ── Blog mode: regenerate a single section image ── */
  const handleBlogRegenerateOne = async (idx: number) => {
    if (!apiKey) { showError("Enter API key"); return; }
    const sec = blogSections[idx];
    if (!sec) return;

    const updatedSections = [...blogSections];
    updatedSections[idx] = { ...sec, status: "generating" };
    setBlogSections(updatedSections);

    try {
      const contentForSection: GeneratedContent = { heading: sec.heading, subheading: sec.subheading, footer: sec.footer };
      // Blog mode: prompt for this section only — content-aware so the image matches this section's topic
      const sectionRawContext = [sec.heading, sec.subheading, sec.footer].filter(Boolean).join(" ");
      const sectionBrief = await buildVisualBrief(sectionRawContext, contentForSection, apiKey, provider);
      const visualBrief = sectionBrief + " This image is for ONE section of a multi-section blog. Illustrate ONLY this section's topic; do not combine with other sections. The visual must clearly match this section's concept (e.g. if the section is about scanning, show scan-related visuals; if about permissions, show permission/shield visuals).";
      const imgUrl = await generateSingleVisual(contentForSection, sec.themeId, idx, blogUploadedImage, true, visualBrief);
      updatedSections[idx] = { ...updatedSections[idx], image: imgUrl || undefined, status: imgUrl ? "done" : "error" };
    } catch {
      updatedSections[idx] = { ...updatedSections[idx], status: "error" };
    }
    setBlogSections([...updatedSections]);

    // Update variations array
    const allImages = updatedSections.filter(s => s.image).map(s => s.image!);
    setVariations(allImages);
    if (updatedSections[idx].image) {
      setVisualImage(updatedSections[idx].image!);
      const c: GeneratedContent = { heading: sec.heading, subheading: sec.subheading, footer: sec.footer };
      setGenerated(c);
      onContentGenerated(c);
      updateSettings({ visualImage: updatedSections[idx].image!, content: c, variations: allImages, activeVariation: allImages.indexOf(updatedSections[idx].image!) });
      onGenerateVisual();
    }
  };

  /* ── Blog mode: select a blog image for preview ── */
  const handleBlogSelectImage = useCallback((idx: number) => {
    const sec = blogSections[idx];
    if (!sec?.image) return;
    setActiveBlogImage(idx);
    setVisualImage(sec.image);
    const c: GeneratedContent = { heading: sec.heading, subheading: sec.subheading, footer: sec.footer };
    setGenerated(c);
    onContentGenerated(c);
    const allImages = blogSections.filter(s => s.image).map(s => s.image!);
    const varIdx = allImages.indexOf(sec.image);
    setVariations(allImages);
    setActiveVariation(varIdx >= 0 ? varIdx : 0);
    updateSettings({ visualImage: sec.image, content: c, variations: allImages, activeVariation: varIdx >= 0 ? varIdx : 0 });
    onGenerateVisual();
  }, [blogSections, onContentGenerated, onGenerateVisual, updateSettings]);

  /** Jump to variation index (general + blog); syncs blog section + content in blog mode */
  const goVariationTo = useCallback((i: number) => {
    if (variations.length === 0) return;
    const idx = ((i % variations.length) + variations.length) % variations.length;
    const img = variations[idx];
    if (mode === "blog") {
      const secIdx = blogSections.findIndex(s => s.image === img);
      if (secIdx >= 0) {
        const sec = blogSections[secIdx];
        const c: GeneratedContent = { heading: sec.heading, subheading: sec.subheading, footer: sec.footer };
        setActiveBlogImage(secIdx);
        setVisualImage(img);
        setGenerated(c);
        onContentGenerated(c);
        setActiveVariation(idx);
        updateSettings({ visualImage: img, content: c, variations, activeVariation: idx });
        onGenerateVisual();
        return;
      }
    }
    setActiveVariation(idx);
    setVisualImage(img);
    updateSettings({ visualImage: img, activeVariation: idx, variations });
    onGenerateVisual();
  }, [mode, variations, blogSections, onContentGenerated, onGenerateVisual, updateSettings]);

  const goVariationPrev = useCallback(() => {
    if (variations.length === 0) return;
    goVariationTo(activeVariation - 1);
  }, [variations.length, activeVariation, goVariationTo]);

  const goVariationNext = useCallback(() => {
    if (variations.length === 0) return;
    goVariationTo(activeVariation + 1);
  }, [variations.length, activeVariation, goVariationTo]);

  /* ── Blog mode: reorder sections via drag ── */
  const moveSection = useCallback((from: number, to: number) => {
    setBlogSections((prev: BlogSection[]) => {
      const updated = [...prev];
      const [moved] = updated.splice(from, 1);
      updated.splice(to, 0, moved);
      return updated.map((s, i) => ({ ...s, index: i }));
    });
  }, []);

  /* ── Blog mode: download all as ZIP ── */
  const handleBlogDownloadZip = async () => {
    const doneItems = blogSections.filter(s => s.status === "done" && s.image);
    if (doneItems.length === 0) return;

    const zip = new JSZip();
    for (let i = 0; i < doneItems.length; i++) {
      const sec = doneItems[i];
      const b64 = sec.image!.split(",")[1];
      if (b64) {
        const safeHeading = sec.heading.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "-").slice(0, 40);
        zip.file(`${String(i + 1).padStart(2, "0")}-${safeHeading}.png`, b64, { base64: true });
      }
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `enkrypt-blog-visuals-${Date.now()}.zip`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  /* ── Blog carousel helpers ── */
  const blogDoneImages = blogSections.filter(s => s.status === "done" && s.image);

  const openCarousel = (startIdx: number) => {
    setCarouselIndex(startIdx);
    setBlogCarouselOpen(true);
  };

  const carouselNext = () => setCarouselIndex(i => (i + 1) % blogDoneImages.length);
  const carouselPrev = () => setCarouselIndex(i => (i - 1 + blogDoneImages.length) % blogDoneImages.length);

  useEffect(() => {
    if (carouselAutoplay && blogCarouselOpen && blogDoneImages.length > 1) {
      autoplayRef.current = setInterval(carouselNext, 3000);
    }
    return () => { if (autoplayRef.current) clearInterval(autoplayRef.current); };
  }, [carouselAutoplay, blogCarouselOpen, blogDoneImages.length]);

  useEffect(() => {
    if (!blogCarouselOpen) {
      setCarouselAutoplay(false);
      return;
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") carouselNext();
      else if (e.key === "ArrowLeft") carouselPrev();
      else if (e.key === "Escape") setBlogCarouselOpen(false);
      else if (e.key === " ") { e.preventDefault(); setCarouselAutoplay(a => !a); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [blogCarouselOpen, blogDoneImages.length]);

  /* ── Advanced: edit toggle ── */
  const handleEditToggle = () => {
    if (isEditMode && generated) {
      const updated = { ...editValues };
      setGenerated(updated);
      onContentGenerated(updated);
      updateSettings({ content: updated });
    } else if (generated) {
      setEditValues({ ...generated });
    }
    setIsEditMode(!isEditMode);
  };

  /* ── Image upload ── */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setVisualImage(dataUrl);
      updateSettings({ visualImage: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setVisualImage(null);
    setVariations([]);
    setOriginalVariations([]);
    setActiveVariation(0);
    setVisualBatch(null);
    updateSettings({ visualImage: null, variations: [], activeVariation: 0 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ── Derived ── */
  const editableFields: ("heading" | "subheading" | "footer")[] = ["heading", "subheading", "footer"];
  const fieldLabels: Record<string, string> = { heading: "Heading", subheading: "Subheading", footer: "Footer" };
  const fieldChecks: Record<string, boolean> = { heading: useHeading, subheading: useSubheading, footer: useFooter };
  const fieldSetChecks: Record<string, (v: boolean) => void> = { heading: setUseHeading, subheading: setUseSubheading, footer: setUseFooter };
  const settingsKeyMap: Record<string, string> = { heading: "useHeading", subheading: "useSubheading", footer: "useFooter" };
  const selectedThemeObj = getSelectedTheme();
  const isProcessing = loading || visualLoading;
  const totalImages = variationCount * selectedThemes.length;
  const blogHasDoneImages = blogSections.some(s => s.status === "done" && s.image);

  /* ── Register center Preview toolbar (variations, crop, edit) ── */
  useEffect(() => {
    if (!registerPreviewToolbar) return;
    const showGeneral =
      mode === "general" && !loading && (variations.length > 0 || visualLoading);
    const showBlog = mode === "blog" && blogHasDoneImages && !blogImageLoading;
    if (!showGeneral && !showBlog) {
      registerPreviewToolbar(null);
      return;
    }

    const img = variations[activeVariation] ?? visualImage;
    const orig = originalVariations[activeVariation];
    const showVersionNav = mode === "blog" || variationCount > 1;
    const canVersionPrev = variations.length > 0 && activeVariation > 0;
    const canVersionNext = variations.length > 0 && activeVariation < variations.length - 1;
    const api: PreviewToolbarApi = {
      mode,
      show: true,
      showVersionNav,
      visualBatch: mode === "general" ? visualBatch : null,
      canVersionPrev,
      canVersionNext,
      arrowHotkeysActive: !blogCarouselOpen && showVersionNav && variations.length > 1,
      navCount: variations.length,
      navLabelIndex: activeVariation + 1,
      goPrev: goVariationPrev,
      goNext: goVariationNext,
      goToIndex: goVariationTo,
      thumbnailSrcs: [...variations],
      crop: {
        isOpen: showCropModal,
        open: () => setShowCropModal(true),
        close: () => setShowCropModal(false),
        imageSrc: img ?? null,
        originalSrc: orig,
        onApply: handleCropApply,
        onResetOriginal: handleCropResetOriginal,
      },
      edit: {
        prompt: mode === "blog" ? blogEditPrompt : editPrompt,
        setPrompt: mode === "blog" ? setBlogEditPrompt : setEditPrompt,
        apply: mode === "blog" ? handleBlogEditImage : handleEditImage,
        loading: mode === "blog" ? blogEditLoading : editLoading,
        sectionHint:
          mode === "blog" && blogSections[activeBlogImage]?.image
            ? `Section ${activeBlogImage + 1}: ${blogSections[activeBlogImage]?.heading ?? ""}`
            : undefined,
      },
    };
    registerPreviewToolbar(api);
    return () => registerPreviewToolbar(null);
  }, [
    registerPreviewToolbar,
    mode,
    variations,
    activeVariation,
    visualImage,
    originalVariations,
    loading,
    visualLoading,
    visualBatch,
    variationCount,
    blogHasDoneImages,
    blogImageLoading,
    showCropModal,
    blogEditPrompt,
    editPrompt,
    blogEditLoading,
    editLoading,
    blogSections,
    activeBlogImage,
    blogCarouselOpen,
    goVariationPrev,
    goVariationNext,
    goVariationTo,
    handleCropApply,
    handleCropResetOriginal,
    handleBlogEditImage,
    handleEditImage,
  ]);

  /* ── Shared template grid ── */
  const renderTemplateGrid = () => (
    <>
      {selectedThemes.length > 1 && (
        <div className="mb-3 p-2 rounded-[var(--radius)] bg-primary/10 border border-primary/30" style={{ fontSize: "var(--text-sm)", color: "var(--primary)" }}>
          <span style={{ fontWeight: 600 }}>{selectedThemes.length} templates</span> × {variationCount} variation{variationCount > 1 ? "s" : ""} = {totalImages} image{totalImages > 1 ? "s" : ""}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {themes.map((t) => {
          const isSelected = selectedThemes.includes(t.id);
          return (
            <div
              key={t.id}
              className="relative rounded-[var(--radius-card)] overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5"
              style={{
                border: isSelected ? "3px solid var(--primary)" : "2px solid var(--border)",
                boxShadow: isSelected ? "0 0 0 2px var(--primary)" : "none",
              }}
              onClick={() => toggleThemeSelection(t.id)}
            >
              <div className="relative">
                {t.isNone ? (
                  <div className="w-full flex items-center justify-center" style={{ height: 80, background: `linear-gradient(135deg, ${BRAND_COLORS.gradientStart}22, ${BRAND_COLORS.gradientEnd}22)` }}>
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
                      <span style={{ fontSize: "var(--text-2xs)", color: "var(--muted-foreground)" }}>Auto Layout</span>
                    </div>
                  </div>
                ) : (
                  <img src={t.image} alt={t.label} className="w-full object-cover" style={{ height: 80 }} />
                )}
                {!t.isNone && <div className="absolute top-1 right-1 flex gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingUploadThemeId(t.id);
                      templateUploadRef.current?.click();
                    }}
                    className="w-5 h-5 rounded-[var(--radius-utility)] bg-card/80 flex items-center justify-center cursor-pointer hover:bg-card transition-colors"
                    style={{ backdropFilter: "blur(4px)" }}
                    title="Replace image"
                  >
                    <Upload className="w-3 h-3 text-foreground" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandedTheme(t.id); }}
                    className="w-5 h-5 rounded-[var(--radius-utility)] bg-card/80 flex items-center justify-center cursor-pointer hover:bg-card transition-colors"
                    style={{ backdropFilter: "blur(4px)" }}
                  >
                    <Maximize2 className="w-3 h-3 text-foreground" />
                  </button>
                  {t.isCustom && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTemplate(t.id);
                          setEditTemplateForm({
                            label: t.label,
                            promptContext: t.promptContext,
                            visualPrompt: t.visualPrompt,
                            palette: t.palette.join(", "),
                          });
                        }}
                        className="w-5 h-5 rounded-[var(--radius-utility)] bg-card/80 flex items-center justify-center cursor-pointer hover:bg-card transition-colors"
                        style={{ backdropFilter: "blur(4px)" }}
                        title="Edit template"
                      >
                        <Pencil className="w-3 h-3 text-foreground" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTemplatePasswordModal({ action: "delete", themeId: t.id });
                        }}
                        className="w-5 h-5 rounded-[var(--radius-utility)] bg-destructive/80 flex items-center justify-center cursor-pointer hover:bg-destructive transition-colors"
                        style={{ backdropFilter: "blur(4px)" }}
                        title="Delete template"
                      >
                        <Trash2 className="w-3 h-3 text-destructive-foreground" />
                      </button>
                    </>
                  )}
                </div>}
                {isSelected && (
                  <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="var(--primary-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                )}
              </div>
              <div className="flex h-1">
                {t.palette.slice(0, 6).map((c, i) => (
                  <div key={i} className="flex-1" style={{ background: c }} />
                ))}
              </div>
              <div
                className="px-1.5 py-1 text-center truncate"
                style={{
                  fontSize: "var(--text-sm)",
                  fontWeight: 600,
                  color: isSelected ? "var(--primary-foreground)" : "var(--foreground)",
                  background: isSelected ? "var(--primary)" : "var(--card)",
                }}
              >
                {t.label}
              </div>
            </div>
          );
        })}
        {/* Add New Template card */}
        <div
          className="relative rounded-[var(--radius-card)] overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center"
          style={{ minHeight: 110 }}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleAddNewTemplate(file);
            };
            input.click();
          }}
        >
          <Plus className="w-6 h-6 text-muted-foreground mb-1" />
          <span className="text-muted-foreground" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Add Template</span>
        </div>
      </div>

      {/* Hidden file input for template image replacement */}
      <input
        ref={templateUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && pendingUploadThemeId) {
            handleTemplateImageUpload(file, pendingUploadThemeId);
            setPendingUploadThemeId(null);
          }
          e.target.value = "";
        }}
      />

      {/* Active palette preview */}
      <div className="mt-3 p-2.5 bg-muted rounded-[var(--radius)] border border-border">
        <span className="text-muted-foreground block mb-1.5" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
          Primary: {selectedThemeObj.label}
        </span>
        <div className="flex gap-1">
          {selectedThemeObj.palette.map((c, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-[var(--radius-utility)] border border-border" style={{ background: c, height: 22 }} />
              <span className="text-muted-foreground" style={{ fontSize: "var(--text-2xs)" }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );


  /* ──────────────── RENDER ──���───────────── */
  return (
    <div className="bg-muted border-r border-border p-4 sm:p-5 overflow-y-auto" style={{ maxHeight: "100vh" }}>

      {/* API status indicator */}
      {!apiKey && (
        <div className="mb-3 p-2.5 rounded-[var(--radius)] border border-destructive/30 bg-destructive/5 flex items-center gap-2" style={{ fontSize: "var(--text-sm)" }}>
          <span className="text-destructive" style={{ fontWeight: 600 }}>⚠ No API key configured</span>
          <span className="text-muted-foreground">— use ⚙ Settings in the header</span>
        </div>
      )}
      {apiKey && (
        <div className="mb-3 p-2 rounded-[var(--radius)] border border-primary/20 bg-primary/5 flex items-center gap-2" style={{ fontSize: "var(--text-sm)" }}>
          <span className="text-primary" style={{ fontWeight: 600 }}>
            {provider === "openai" ? "OpenAI" : "Gemini"}
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">API key configured ✓</span>
        </div>
      )}

      {/* Sub-mode switcher removed — General mode is unified */}

      {/* ── Error banner ── */}
      {error && (
        <div className="bg-destructive/10 border border-destructive rounded-[var(--radius)] p-3 mb-3" style={{ fontSize: "var(--text-sm)", color: "var(--destructive)" }}>
          {error}
        </div>
      )}

      {/* Shared hidden file input for content image upload (all modes) */}
      <input
        ref={contentImageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev) => setContentUploadedImage(ev.target?.result as string);
          reader.readAsDataURL(file);
        }}
      />

      {/* ═══════════════════════ GENERAL MODE ═══════════════════════ */}
      {mode === "general" && (
        <>
          {/* Generate — first (above content input) */}
          <SectionCard className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-[3px] h-[18px] bg-primary rounded-sm" />
              <span className="text-foreground" style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>Generate</span>
            </div>
            <p className="text-muted-foreground m-0 mb-3" style={{ fontSize: "var(--text-sm)", lineHeight: 1.45 }}>
              Add content below, pick how many variations per template, then run. Templates and post size are further down.
            </p>
            <div className="mb-4">
              <FieldLabel>Variations per Template</FieldLabel>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setVariationCount(n)}
                    className="py-2 rounded-[var(--radius)] border-2 cursor-pointer transition-all"
                    style={{
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      background: variationCount === n ? "var(--primary)" : "var(--card)",
                      color: variationCount === n ? "var(--primary-foreground)" : "var(--foreground)",
                      borderColor: variationCount === n ? "var(--primary)" : "var(--border)",
                    }}
                  >
                    {n === 1 ? "1" : `${n}x`}
                  </button>
                ))}
              </div>
              {totalImages > 1 && (
                <div className="mt-1.5 text-center" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                  Total: {totalImages} image{totalImages > 1 ? "s" : ""}
                </div>
              )}
            </div>
            <PrimaryButton
              onClick={handleBasicGenerate}
              disabled={isProcessing}
              loading={isProcessing}
              loadingText={loading ? "Generating text..." : `Creating visual${totalImages > 1 ? "s" : ""}...`}
              icon={<Sparkles className="w-5 h-5" />}
            >
              Generate {totalImages > 1 ? `${totalImages} Visuals` : "Complete Visual"}
            </PrimaryButton>
          </SectionCard>

          {/* Content + source image */}
          <SectionCard className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-[3px] h-[18px] bg-primary rounded-sm" />
              <span className="text-foreground" style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>Content & source image</span>
            </div>
            <p className="text-muted-foreground m-0 mb-3" style={{ fontSize: "var(--text-sm)", lineHeight: 1.45 }}>
              Paste or type your source material, and optionally add an image for the model to read.
            </p>
            <FieldLabel>Text content</FieldLabel>
            <textarea
              className={inputClass}
              style={{ minHeight: 100, resize: "vertical", fontSize: "var(--text-sm)" }}
              placeholder={"Paste content, a topic, or bullet points...\n\nExample: 'Enkrypt AI Hooks generate audit logs automatically.'"}
              value={rawContent}
              onChange={(e) => setRawContent(e.target.value)}
            />

            {/* Content image upload */}
            <div className="mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-foreground" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Source image <span className="text-muted-foreground" style={{ fontWeight: 400 }}>(optional)</span></span>
              </div>
              <Hint>Upload a screenshot, infographic, or slide — AI will extract its content and convert to the selected template.</Hint>
              {contentUploadedImage ? (
                <div className="relative mb-2">
                  <img
                    src={contentUploadedImage}
                    alt="Uploaded source"
                    className="w-full rounded-[var(--radius)] border-2 border-border object-contain"
                    style={{ maxHeight: 140 }}
                  />
                  <button
                    onClick={() => { setContentUploadedImage(null); if (contentImageInputRef.current) contentImageInputRef.current.value = ""; }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  <div
                    className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-[var(--radius-utility)]"
                    style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", fontSize: "var(--text-2xs)", color: "white", fontWeight: 600 }}
                  >
                    <Check className="w-2.5 h-2.5 inline mr-0.5" />Source ready
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => contentImageInputRef.current?.click()}
                  className="w-full py-4 rounded-[var(--radius)] border-2 border-dashed border-border cursor-pointer transition-all hover:border-primary hover:bg-primary/5 flex items-center justify-center gap-2 bg-card mb-2"
                >
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Click to upload source image</span>
                </button>
              )}

              {/* Custom instructions (shown when image is uploaded) */}
              {contentUploadedImage && (
                <div className="mt-2">
                  <span className="text-foreground block mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                    Custom Instructions <span className="text-muted-foreground" style={{ fontWeight: 400 }}>(optional)</span>
                  </span>
                  <textarea
                    className={inputClass}
                    style={{ minHeight: 56, resize: "vertical", fontSize: "var(--text-sm)" }}
                    placeholder={"e.g. Focus on the stats, rewrite in a technical tone, use bullet points as sections..."}
                    value={contentCustomInstructions}
                    onChange={(e) => setContentCustomInstructions(e.target.value)}
                  />
                </div>
              )}
            </div>
          </SectionCard>

          <CollapsibleSection title="Templates" icon="🎨" defaultOpen={false} badge={selectedThemes.length > 1 ? `${selectedThemes.length}` : undefined}>
            <Hint>Select one or more templates for generation.</Hint>
            {renderTemplateGrid()}
          </CollapsibleSection>

          <CollapsibleSection title="Logo & Spacing" icon="📍" defaultOpen={false}>
            <div className="space-y-4">
              <div>
                <FieldLabel>Logo Position</FieldLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {positions.map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => { setLogoPosition(pos.id); updateSettings({ logoPosition: pos.id }); }}
                      className="py-2 rounded-[var(--radius)] border-2 cursor-pointer transition-all"
                      style={{
                        fontSize: "var(--text-sm)",
                        fontWeight: 600,
                        background: logoPosition === pos.id ? "var(--primary)" : "var(--card)",
                        color: logoPosition === pos.id ? "var(--primary-foreground)" : "var(--foreground)",
                        borderColor: logoPosition === pos.id ? "var(--primary)" : "var(--border)",
                      }}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
              <SliderControl label="Logo Size" value={logoScale} min={30} max={200} step={5} unit="%" onChange={(v) => { setLogoScale(v); updateSettings({ logoScale: v }); }} />
              <SliderControl label="Edge Padding" value={padding} min={20} max={150} step={10} unit="px" onChange={(v) => { setPadding(v); updateSettings({ padding: v }); }} />
            </div>
          </CollapsibleSection>

          {/* Advanced settings are in the right panel */}

          {/* Post Size — Designer tab adds "1:1 trns" (same pixels as 1:1, custom preview bg) */}
          <SectionCard className="mb-3">
            <FieldLabel>Post Size</FieldLabel>
            <ToggleGroup
              columns={headerMode === "designer" ? 3 : 2}
              options={
                headerMode === "designer"
                  ? [
                      { id: "1080x1080", label: "1:1", sublabel: "1080×1080" },
                      {
                        id: DESIGNER_POST_SIZE_TRNS_ID,
                        label: "1:1 trns",
                        sublabel: "1080×1080",
                        iconSrc: bg1x1TrnsThumb,
                      },
                      { id: "1920x1080", label: "16:9", sublabel: "1920×1080" },
                    ]
                  : sizes.map((s) => ({
                      id: `${s.width}x${s.height}`,
                      label: s.name,
                      sublabel: `${s.width}×${s.height}`,
                    }))
              }
              value={
                headerMode === "designer" &&
                settingsFromProps?.postSizeId === DESIGNER_POST_SIZE_TRNS_ID
                  ? DESIGNER_POST_SIZE_TRNS_ID
                  : `${size.width}x${size.height}`
              }
              onChange={(id) => {
                if (headerMode === "designer" && id === DESIGNER_POST_SIZE_TRNS_ID) {
                  const sz = { width: 1080, height: 1080 };
                  setSize(sz);
                  updateSettings({ size: sz, postSizeId: DESIGNER_POST_SIZE_TRNS_ID });
                  return;
                }
                const [w, h] = id.split("x").map(Number);
                const sz = { width: w, height: h };
                setSize(sz);
                updateSettings({
                  size: sz,
                  ...(headerMode === "designer" ? { postSizeId: undefined } : {}),
                });
              }}
            />
            {headerMode === "designer" && (
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <FieldLabel>White bg</FieldLabel>
                  <p className="text-muted-foreground mt-0.5" style={{ fontSize: "var(--text-2xs)" }}>
                    Tell the image model to use a solid white (#FFFFFF) background for the visual.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateSettings({ designerWhiteBg: !settingsFromProps?.designerWhiteBg })
                  }
                  className="flex-shrink-0 h-8 px-3 rounded-[var(--radius)] border-2 cursor-pointer transition-all font-semibold"
                  style={{
                    fontSize: "var(--text-xs)",
                    background: settingsFromProps?.designerWhiteBg ? "var(--primary)" : "var(--card)",
                    color: settingsFromProps?.designerWhiteBg ? "var(--primary-foreground)" : "var(--muted-foreground)",
                    borderColor: settingsFromProps?.designerWhiteBg ? "var(--primary)" : "var(--border)",
                  }}
                >
                  {settingsFromProps?.designerWhiteBg ? "On" : "Off"}
                </button>
              </div>
            )}
          </SectionCard>

          {generated && !isProcessing && variations.length === 0 && (
            <div className="bg-accent/10 border border-accent rounded-[var(--radius-card)] p-3 mt-3 text-center">
              <span style={{ fontWeight: 700, fontSize: "var(--text-sm)", color: "var(--accent)" }}>Content structured — see preview →</span>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════ BLOG MODE ═══════════════════════ */}
      {mode === "blog" && (
        <>
          {/* Blog Content Input */}
          <CollapsibleSection title="Blog Content" icon="📝">
            {/* Input mode toggle: Text vs Image */}
            <div className="grid grid-cols-2 gap-0 mb-3 rounded-[var(--radius)] border-2 border-border overflow-hidden">
              {(["text", "image"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setBlogInputMode(m)}
                  className="py-2 px-2 flex items-center justify-center gap-1.5 cursor-pointer transition-all border-none"
                  style={{
                    fontSize: "var(--text-sm)",
                    fontWeight: blogInputMode === m ? 700 : 500,
                    background: blogInputMode === m ? "var(--primary)" : "var(--card)",
                    color: blogInputMode === m ? "var(--primary-foreground)" : "var(--muted-foreground)",
                  }}
                >
                  {m === "text" ? <Pencil className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
                  {m === "text" ? "Paste Text" : "Upload Image"}
                </button>
              ))}
            </div>

            {blogInputMode === "text" ? (
              <>
                <Hint>Paste your full blog post. AI will analyze it and split into key visual sections.</Hint>
                <textarea
                  className={inputClass}
                  style={{ minHeight: 180, resize: "vertical", fontSize: "var(--text-sm)" }}
                  placeholder={"Paste your entire blog post here...\n\nThe AI will analyze the content and identify key sections, concepts, and takeaways — then generate a visual for each one.\n\nTip: Longer blogs with distinct sections will produce better results."}
                  value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                />
                {blogContent.length > 0 && (
                  <div className="mt-2 text-right" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                    {blogContent.split(/\s+/).filter(Boolean).length} words
                  </div>
                )}
              </>
            ) : (
              <>
                <Hint>Upload a screenshot, infographic, slide, or any visual — AI will extract and convert its content into your selected template style.</Hint>
                <input
                  ref={blogImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setBlogUploadedImage(ev.target?.result as string);
                    reader.readAsDataURL(file);
                  }}
                />

                {blogUploadedImage ? (
                  <div className="relative mb-3">
                    <img
                      src={blogUploadedImage}
                      alt="Uploaded content"
                      className="w-full rounded-[var(--radius)] border-2 border-border object-contain"
                      style={{ maxHeight: 220 }}
                    />
                    <button
                      onClick={() => { setBlogUploadedImage(null); if (blogImageInputRef.current) blogImageInputRef.current.value = ""; }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div
                      className="absolute bottom-2 left-2 px-2 py-1 rounded-[var(--radius-utility)]"
                      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", fontSize: "var(--text-sm)", color: "white", fontWeight: 600 }}
                    >
                      <Check className="w-3 h-3 inline mr-1" />Image ready
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => blogImageInputRef.current?.click()}
                    className="w-full py-8 rounded-[var(--radius)] border-2 border-dashed border-border cursor-pointer transition-all hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-2 bg-card mb-3"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ background: "var(--primary)", opacity: 0.15 }}
                    >
                      <Upload className="w-5 h-5 text-primary" style={{ opacity: 1 }} />
                    </div>
                    <span className="text-foreground" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                      Click to upload image
                    </span>
                    <span className="text-muted-foreground" style={{ fontSize: "var(--text-sm)" }}>
                      Screenshot, infographic, slide, chart, etc.
                    </span>
                  </button>
                )}

                {/* Optional additional text context */}
                <div className="mb-3">
                  <FieldLabel>Additional Context <span className="text-muted-foreground" style={{ fontWeight: 400 }}>(optional)</span></FieldLabel>
                  <textarea
                    className={inputClass}
                    style={{ minHeight: 60, resize: "vertical", fontSize: "var(--text-sm)" }}
                    placeholder="Add extra context, notes, or text to combine with the image content..."
                    value={blogContent}
                    onChange={(e) => setBlogContent(e.target.value)}
                  />
                </div>

                {/* Custom instructions */}
                <div>
                  <FieldLabel>Custom Instructions <span className="text-muted-foreground" style={{ fontWeight: 400 }}>(optional)</span></FieldLabel>
                  <Hint>Guide the AI on how to interpret and transform the image content.</Hint>
                  <textarea
                    className={inputClass}
                    style={{ minHeight: 64, resize: "vertical", fontSize: "var(--text-sm)" }}
                    placeholder={"e.g.\n• Focus on the data/stats in the image\n• Ignore the header area, only use the main content\n• Rewrite in a more technical tone\n• Create sections around each bullet point"}
                    value={blogCustomInstructions}
                    onChange={(e) => setBlogCustomInstructions(e.target.value)}
                  />
                </div>
              </>
            )}
          </CollapsibleSection>

          {/* Template selection moved to per-section controls after content split */}

          {/* Output Settings for Blog */}
          <CollapsibleSection title="Output Settings" icon="⚙️" defaultOpen={false}>
            <div className="space-y-4">
              <div>
                <FieldLabel>Post Size</FieldLabel>
                <ToggleGroup
                  options={sizes.map((s) => ({ id: `${s.width}x${s.height}`, label: s.name, sublabel: `${s.width}×${s.height}` }))}
                  value={`${size.width}x${size.height}`}
                  onChange={(id) => { const [w, h] = id.split("x").map(Number); const sz = { width: w, height: h }; setSize(sz); updateSettings({ size: sz }); }}
                />
              </div>
              <div>
                <FieldLabel>Logo Position</FieldLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {positions.map((pos) => (
                    <button
                      key={pos.id}
                      onClick={() => { setLogoPosition(pos.id); updateSettings({ logoPosition: pos.id }); }}
                      className="py-1.5 rounded-[var(--radius)] border-2 cursor-pointer transition-all"
                      style={{ fontSize: "var(--text-sm)", fontWeight: 600, background: logoPosition === pos.id ? "var(--primary)" : "var(--card)", color: logoPosition === pos.id ? "var(--primary-foreground)" : "var(--foreground)", borderColor: logoPosition === pos.id ? "var(--primary)" : "var(--border)" }}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
              <SliderControl label="Logo Size" value={logoScale} min={30} max={200} step={5} unit="%" onChange={(v) => { setLogoScale(v); updateSettings({ logoScale: v }); }} />
              <SliderControl label="Edge Padding" value={padding} min={20} max={150} step={10} unit="px" onChange={(v) => { setPadding(v); updateSettings({ padding: v }); }} />
            </div>
          </CollapsibleSection>

          {/* Advanced controls are now per-section inside DraggableBlogCard */}

          {/* Split Blog Button */}
          {blogSections.length === 0 && (
            <PrimaryButton
              onClick={handleBlogSplit}
              disabled={blogLoading || (!blogContent.trim() && !blogUploadedImage)}
              loading={blogLoading}
              loadingText={blogUploadedImage ? "Analyzing image..." : "Analyzing blog..."}
              icon={<Sparkles className="w-5 h-5" />}
            >
              {blogUploadedImage ? "Extract & Split from Image" : "Analyze & Split into Sections"}
            </PrimaryButton>
          )}

          {/* Blog Sections */}
          {blogSections.length > 0 && (
            <>
              <SectionCard className="mb-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-[3px] h-[18px] bg-primary rounded-sm" />
                    <span className="text-foreground" style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>
                      Blog Sections ({blogSections.length})
                    </span>
                  </div>
                  <button
                    onClick={() => { setBlogSections([]); setActiveBlogImage(0); }}
                    className="flex items-center gap-1 py-1 px-2 rounded-[var(--radius-utility)] border border-border bg-card cursor-pointer hover:bg-muted transition-colors"
                    style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}
                  >
                    <RotateCcw className="w-3 h-3" />
                    Re-split
                  </button>
                </div>

                {/* Progress bar when generating */}
                {blogImageLoading && (
                  <div className="mb-3">
                    <div className="flex justify-between mb-1" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                      <span>Generating images...</span>
                      <span>{blogProgress.current}/{blogProgress.total}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${blogProgress.total > 0 ? (blogProgress.current / blogProgress.total) * 100 : 0}%`,
                          background: "var(--primary)",
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* AI suggestion summary */}
                <div
                  className="rounded-[var(--radius)] p-2.5 mb-3 flex items-center justify-between"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                    AI suggests {blogSections.length} visuals
                  </span>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 400, opacity: 0.85 }}>
                    {blogSections.filter(s => s.enabled).length} enabled
                  </span>
                </div>

                {/* Toggle all */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-muted-foreground" style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}>Select sections to generate</span>
                  <button
                    onClick={() => {
                      const allEnabled = blogSections.every(s => s.enabled);
                      setBlogSections(blogSections.map(s => ({ ...s, enabled: !allEnabled })));
                    }}
                    className="px-2 py-1 rounded-[var(--radius-utility)] border border-border bg-card text-foreground cursor-pointer hover:bg-muted transition-colors"
                    style={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}
                  >
                    {blogSections.every(s => s.enabled) ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {/* Section cards — drag to reorder */}
                <DndProvider backend={HTML5Backend}>
                  <div className="space-y-2">
                    {blogSections.map((sec, idx) => (
                      <DraggableBlogCard
                        key={`blog-sec-${sec.index}-${idx}`}
                        sec={sec}
                        idx={idx}
                        activeBlogImage={activeBlogImage}
                        themes={themes}
                        blogSections={blogSections}
                        setBlogSections={setBlogSections}
                        handleBlogSelectImage={handleBlogSelectImage}
                        handleBlogRegenerateOne={handleBlogRegenerateOne}
                        moveSection={moveSection}
                        advancedIdx={blogAdvancedIdx}
                        setAdvancedIdx={setBlogAdvancedIdx}
                        fontSettings={fontSettings}
                        setFontSettings={setFontSettings}
                        textColorSettings={textColorSettings}
                        setTextColorSettings={setTextColorSettings}
                        textSlots={textSlots}
                        setTextSlots={setTextSlots}
                        useHeading={useHeading}
                        useSubheading={useSubheading}
                        useFooter={useFooter}
                        setUseHeading={setUseHeading}
                        setUseSubheading={setUseSubheading}
                        setUseFooter={setUseFooter}
                        updateSettings={updateSettings}
                        selectedWord={selectedWord}
                        setSelectedWord={setSelectedWord}
                        setExpandedTheme={setExpandedTheme}
                        visualSlot={visualSlot}
                        setVisualSlot={setVisualSlot}
                      />
                    ))}
                  </div>
                </DndProvider>

                {/* Drag hint */}
                <p className="text-muted-foreground mt-1.5 flex items-center gap-1" style={{ fontSize: "var(--text-2xs)", opacity: 0.7 }}>
                  <GripVertical className="w-3 h-3 inline" /> Drag to reorder sections
                </p>
              </SectionCard>

              {/* Generate All Images Button */}
              {!blogImageLoading && (
                <PrimaryButton
                  onClick={handleBlogGenerateAll}
                  disabled={blogImageLoading || blogSections.filter(s => s.enabled).length === 0}
                  loading={blogImageLoading}
                  loadingText={`Generating ${blogSections.filter(s => s.enabled).length} images...`}
                  icon={<Sparkles className="w-5 h-5" />}
                >
                  {blogSections.filter(s => s.enabled).length === 0
                    ? "No Sections Selected"
                    : `Generate ${blogSections.filter(s => s.enabled).length} of ${blogSections.length} Blog Visuals`}
                </PrimaryButton>
              )}

              {/* Results with download ZIP + carousel */}
              {blogDoneImages.length > 0 && !blogImageLoading && (
                <SectionCard className="mt-3">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-[3px] h-[18px] bg-primary rounded-sm" />
                      <span className="text-foreground" style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>
                        Results ({blogDoneImages.length}/{blogSections.length})
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {/* Slideshow button */}
                      {blogDoneImages.length > 1 && (
                        <button
                          onClick={() => openCarousel(0)}
                          className="flex items-center gap-1 py-1 px-2 rounded-[var(--radius-utility)] border border-border bg-card cursor-pointer hover:bg-muted transition-colors"
                          style={{ fontSize: "var(--text-sm)", color: "var(--primary)" }}
                          title="Open slideshow"
                        >
                          <Play className="w-3 h-3" />
                          Slideshow
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Image grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {blogSections.map((sec, idx) => {
                      if (!sec.image) return null;
                      const doneIdx = blogDoneImages.findIndex(d => d === sec);
                      return (
                        <div
                          key={idx}
                          className="relative rounded-[var(--radius-utility)] overflow-hidden cursor-pointer transition-all hover:opacity-90"
                          style={{
                            border: activeBlogImage === idx ? "3px solid var(--primary)" : "2px solid var(--border)",
                            boxShadow: activeBlogImage === idx ? "0 0 0 2px var(--primary)" : "none",
                          }}
                          onClick={() => handleBlogSelectImage(idx)}
                        >
                          <img src={sec.image} alt={sec.heading} className="w-full object-cover" style={{ height: 90 }} />
                          <div className="absolute bottom-0 inset-x-0 p-1.5" style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}>
                            <span className="text-white truncate block" style={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}>
                              {idx + 1}. {sec.heading}
                            </span>
                          </div>
                          {/* Expand to slideshow */}
                          <button
                            onClick={(e) => { e.stopPropagation(); openCarousel(doneIdx >= 0 ? doneIdx : 0); }}
                            className="absolute top-1 right-1 w-5 h-5 rounded-[var(--radius-utility)] bg-card/80 flex items-center justify-center cursor-pointer hover:bg-card transition-colors"
                            style={{ backdropFilter: "blur(4px)" }}
                          >
                            <Maximize2 className="w-3 h-3 text-foreground" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleBlogDownloadZip}
                      className="flex-1 py-2.5 px-3 rounded-[var(--radius-button)] border-2 border-primary bg-card text-primary cursor-pointer transition-all hover:bg-primary/5 flex items-center justify-center gap-2"
                      style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}
                    >
                      <Archive className="w-4 h-4" />
                      Download All as ZIP
                    </button>
                  </div>

                  <div className="mt-2 text-center" style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
                    Click an image to show it in the preview. Use the preview column for crop, edit, arrows, and PNG download — or slideshow to browse.
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </>
      )}

      {/* ── Blog Carousel/Slideshow Modal ── */}
      {blogCarouselOpen && blogDoneImages.length > 0 && (() => {
        const currentSec = blogDoneImages[carouselIndex];
        if (!currentSec?.image) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center"
            style={{ background: "rgba(0,0,0,0.9)", backdropFilter: "blur(8px)" }}
            onClick={() => setBlogCarouselOpen(false)}
          >
            {/* Top bar */}
            <div
              className="absolute top-0 inset-x-0 flex items-center justify-between px-4 sm:px-6 py-3 z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <span style={{ fontSize: "var(--text-sm)", color: "white", fontWeight: 600 }}>
                  {carouselIndex + 1} / {blogDoneImages.length}
                </span>
                <span className="text-white/60 hidden sm:inline" style={{ fontSize: "var(--text-sm)" }}>
                  {currentSec.heading}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Autoplay toggle */}
                {blogDoneImages.length > 1 && (
                  <button
                    onClick={() => setCarouselAutoplay(a => !a)}
                    className="flex items-center gap-1 py-1.5 px-3 rounded-full cursor-pointer transition-all"
                    style={{
                      background: carouselAutoplay ? "var(--primary)" : "rgba(255,255,255,0.15)",
                      color: "white",
                      fontSize: "var(--text-sm)",
                      fontWeight: 600,
                      border: "none",
                    }}
                  >
                    {carouselAutoplay ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    {carouselAutoplay ? "Pause" : "Auto"}
                  </button>
                )}
                {/* Download current */}
                <button
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = currentSec.image!;
                    link.download = `blog-visual-${carouselIndex + 1}.png`;
                    link.click();
                  }}
                  className="flex items-center gap-1 py-1.5 px-3 rounded-full cursor-pointer transition-all"
                  style={{ background: "rgba(255,255,255,0.15)", color: "white", fontSize: "var(--text-sm)", fontWeight: 600, border: "none" }}
                >
                  <Download className="w-3 h-3" />
                  Save
                </button>
                {/* Download all ZIP */}
                <button
                  onClick={handleBlogDownloadZip}
                  className="flex items-center gap-1 py-1.5 px-3 rounded-full cursor-pointer transition-all"
                  style={{ background: "rgba(255,255,255,0.15)", color: "white", fontSize: "var(--text-sm)", fontWeight: 600, border: "none" }}
                >
                  <Archive className="w-3 h-3" />
                  ZIP
                </button>
                {/* Close */}
                <button
                  onClick={() => setBlogCarouselOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                  style={{ background: "rgba(255,255,255,0.15)", border: "none" }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center w-full px-16 sm:px-24" onClick={(e) => e.stopPropagation()}>
              <img
                src={currentSec.image}
                alt={currentSec.heading}
                className="max-w-full max-h-[75vh] object-contain rounded-[var(--radius-card)]"
                style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
              />
            </div>

            {/* Navigation arrows */}
            {blogDoneImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); carouselPrev(); }}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-white/20"
                  style={{ background: "rgba(255,255,255,0.1)", border: "none", backdropFilter: "blur(4px)" }}
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); carouselNext(); }}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-white/20"
                  style={{ background: "rgba(255,255,255,0.1)", border: "none", backdropFilter: "blur(4px)" }}
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              </>
            )}

            {/* Bottom info + thumbnails */}
            <div
              className="absolute bottom-0 inset-x-0 py-3 px-4 sm:px-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Caption */}
              <div className="text-center mb-3">
                <span className="text-white block" style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>
                  {currentSec.heading}
                </span>
                <span className="text-white/70" style={{ fontSize: "var(--text-sm)" }}>
                  {currentSec.subheading}
                </span>
              </div>

              {/* Thumbnail strip */}
              {blogDoneImages.length > 1 && (
                <div className="flex gap-1.5 justify-center overflow-x-auto pb-1">
                  {blogDoneImages.map((sec, i) => (
                    <button
                      key={i}
                      onClick={() => setCarouselIndex(i)}
                      className="flex-shrink-0 rounded-[var(--radius-utility)] overflow-hidden cursor-pointer transition-all"
                      style={{
                        width: 44,
                        height: 44,
                        border: carouselIndex === i ? "2px solid white" : "2px solid rgba(255,255,255,0.2)",
                        opacity: carouselIndex === i ? 1 : 0.6,
                        padding: 0,
                      }}
                    >
                      <img src={sec.image!} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Expanded Theme Modal (shared) ── */}
      {expandedTheme && (() => {
        const t = themes.find((th) => th.id === expandedTheme);
        if (!t) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={() => setExpandedTheme(null)}>
            <div className="relative bg-card rounded-[var(--radius-card)] overflow-hidden w-full"
              style={{ maxWidth: 700, maxHeight: "90vh", boxShadow: "0 25px 60px rgba(0,0,0,0.3)" }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="text-foreground" style={{ fontWeight: 700, fontSize: "var(--text-base)" }}>{t.label}</span>
                <button onClick={() => setExpandedTheme(null)}
                  className="w-7 h-7 rounded-[var(--radius-utility)] bg-muted flex items-center justify-center cursor-pointer hover:bg-border transition-colors">
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
              <div className="flex h-2">
                {t.palette.map((c, i) => (
                  <div key={i} className="flex-1" style={{ background: c }} />
                ))}
              </div>
              <div className="overflow-auto" style={{ maxHeight: "calc(90vh - 80px)" }}>
                {t.isNone ? (
                  <div className="w-full flex items-center justify-center py-16" style={{ background: `linear-gradient(135deg, ${BRAND_COLORS.gradientStart}15, ${BRAND_COLORS.gradientEnd}15)` }}>
                    <div className="flex flex-col items-center gap-3">
                      <ImageIcon className="w-12 h-12" style={{ color: "var(--muted-foreground)" }} />
                      <span style={{ fontSize: "var(--text-base)", color: "var(--muted-foreground)" }}>No template — AI generates a clean, branded layout automatically</span>
                    </div>
                  </div>
                ) : (
                  <img src={t.image} alt={t.label} className="w-full object-contain" />
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Password Modal for Template Management ── */}
      {templatePasswordModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
          onClick={() => { setTemplatePasswordModal(null); setTemplatePasswordInput(""); setTemplatePasswordError(""); }}
        >
          <div
            className="bg-card rounded-[var(--radius-card)] border border-border w-full overflow-hidden"
            style={{ maxWidth: 400, boxShadow: "var(--elevation-sm)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted">
              <Lock className="w-4 h-4 text-primary" />
              <span className="text-foreground" style={{ fontWeight: 700, fontSize: "var(--text-base)" }}>
                {templatePasswordModal.action === "delete" ? "Confirm Delete" : "Authentication Required"}
              </span>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-muted-foreground" style={{ fontSize: "var(--text-sm)" }}>
                {templatePasswordModal.action === "delete"
                  ? "Enter password to delete this template."
                  : templatePasswordModal.action === "add"
                  ? "Enter password to save this new template."
                  : templatePasswordModal.action === "edit"
                  ? "Enter password to save template changes."
                  : "Enter password to update the template image."}
              </p>
              <input
                type="password"
                placeholder="Enter password"
                value={templatePasswordInput}
                onChange={(e) => { setTemplatePasswordInput(e.target.value); setTemplatePasswordError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleTemplatePasswordSubmit()}
                className="w-full px-3 py-2 rounded-[var(--radius)] border border-border bg-input-background text-foreground"
                style={{ fontSize: "var(--text-sm)", outline: "none" }}
                autoFocus
              />
              {templatePasswordError && (
                <p className="text-destructive" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
                  {templatePasswordError}
                </p>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setTemplatePasswordModal(null); setTemplatePasswordInput(""); setTemplatePasswordError(""); }}
                  className="flex-1 py-2 px-3 rounded-[var(--radius-button)] border border-border bg-card text-foreground cursor-pointer transition-colors hover:bg-muted"
                  style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTemplatePasswordSubmit}
                  className="flex-1 py-2 px-3 rounded-[var(--radius-button)] bg-primary text-primary-foreground cursor-pointer transition-colors hover:opacity-90 flex items-center justify-center gap-1.5"
                  style={{ fontWeight: 600, fontSize: "var(--text-sm)", border: "none" }}
                >
                  <Save className="w-3.5 h-3.5" />
                  {templatePasswordModal.action === "delete" ? "Delete" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Template Modal ── */}
      {editingTemplate && (() => {
        const t = themes.find(th => th.id === editingTemplate);
        if (!t) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setEditingTemplate(null)}
          >
            <div
              className="bg-card rounded-[var(--radius-card)] border border-border w-full overflow-hidden"
              style={{ maxWidth: 520, maxHeight: "90vh", boxShadow: "var(--elevation-sm)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted">
                <span className="text-foreground" style={{ fontWeight: 700, fontSize: "var(--text-base)" }}>
                  Edit Template: {t.label}
                </span>
                <button
                  onClick={() => setEditingTemplate(null)}
                  className="w-7 h-7 rounded-[var(--radius-utility)] bg-card flex items-center justify-center cursor-pointer hover:bg-border transition-colors"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
              </div>
              <div className="p-4 space-y-3 overflow-auto" style={{ maxHeight: "calc(90vh - 60px)" }}>
                <div>
                  <label className="text-foreground block mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Label</label>
                  <input
                    value={editTemplateForm.label}
                    onChange={(e) => setEditTemplateForm(f => ({ ...f, label: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[var(--radius)] border border-border bg-input-background text-foreground"
                    style={{ fontSize: "var(--text-sm)", outline: "none" }}
                  />
                </div>
                <div>
                  <label className="text-foreground block mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Prompt Context</label>
                  <textarea
                    value={editTemplateForm.promptContext}
                    onChange={(e) => setEditTemplateForm(f => ({ ...f, promptContext: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[var(--radius)] border border-border bg-input-background text-foreground resize-y"
                    style={{ fontSize: "var(--text-sm)", outline: "none", minHeight: 80 }}
                  />
                </div>
                <div>
                  <label className="text-foreground block mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Visual Prompt</label>
                  <textarea
                    value={editTemplateForm.visualPrompt}
                    onChange={(e) => setEditTemplateForm(f => ({ ...f, visualPrompt: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[var(--radius)] border border-border bg-input-background text-foreground resize-y"
                    style={{ fontSize: "var(--text-sm)", outline: "none", minHeight: 80 }}
                  />
                </div>
                <div>
                  <label className="text-foreground block mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Palette (comma-separated hex)</label>
                  <input
                    value={editTemplateForm.palette}
                    onChange={(e) => setEditTemplateForm(f => ({ ...f, palette: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[var(--radius)] border border-border bg-input-background text-foreground"
                    style={{ fontSize: "var(--text-sm)", outline: "none" }}
                    placeholder="#7F56D9, #FF7404, #FF3BA2"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {editTemplateForm.palette.split(",").map(c => c.trim()).filter(Boolean).map((c, i) => (
                      <div key={i} className="w-5 h-5 rounded-[var(--radius-utility)] border border-border" style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditingTemplate(null)}
                    className="flex-1 py-2 px-3 rounded-[var(--radius-button)] border border-border bg-card text-foreground cursor-pointer transition-colors hover:bg-muted"
                    style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const paletteArr = editTemplateForm.palette.split(",").map(c => c.trim()).filter(Boolean);
                      setTemplatePasswordModal({
                        action: "edit",
                        themeId: editingTemplate,
                        pendingData: {
                          label: editTemplateForm.label,
                          promptContext: editTemplateForm.promptContext,
                          visualPrompt: editTemplateForm.visualPrompt,
                          palette: paletteArr.length > 0 ? paletteArr : t.palette,
                        },
                      });
                      setEditingTemplate(null);
                    }}
                    className="flex-1 py-2 px-3 rounded-[var(--radius-button)] bg-primary text-primary-foreground cursor-pointer transition-colors hover:opacity-90 flex items-center justify-center gap-1.5"
                    style={{ fontWeight: 600, fontSize: "var(--text-sm)", border: "none" }}
                  >
                    <Save className="w-3.5 h-3.5" />
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
