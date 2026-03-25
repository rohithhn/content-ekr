/**
 * Theme metadata for image prompts — mirrors designer-app LeftPanel defaultThemes + NO_TEMPLATE.
 * Keep in sync with designer-app/src/app/components/LeftPanel.tsx (ThemeItem / defaultThemes).
 */

const BRAND_COLORS = {
  gradientStart: "#FF7404",
  gradientEnd: "#FF3BA2",
  danger: "#D92D20",
  secure: "#16B364",
  text: "#1A1A1A",
  muted: "#414651",
  cardBg: "#FFFFFF",
  cardBorder: "#D5D7DA",
};

const BRAND_PALETTE = [
  BRAND_COLORS.gradientStart,
  BRAND_COLORS.gradientEnd,
  BRAND_COLORS.danger,
  BRAND_COLORS.secure,
  BRAND_COLORS.text,
  BRAND_COLORS.cardBg,
];

export const NO_TEMPLATE_THEME = {
  id: "none",
  label: "No Template",
  promptContext:
    "Style: clean, modern, professional social media post. Use the brand gradient (orange #FF7404 to pink #FF3BA2) for icons and decorative elements. Red (#D92D20) for danger/warning elements. Green (#16B364) for success/secure elements. Near-black (#1A1A1A) for all body text. White card backgrounds with subtle borders. Tone: polished, brand-consistent.",
  visualPrompt:
    "Create a clean, modern social media visual with no specific template. Use a professional layout with rounded cards, clean icons, and clear visual hierarchy. Icons and decorative elements should use a warm gradient from orange (#FF7404) to pink (#FF3BA2). Any danger/warning elements in red (#D92D20). Any success/secure elements in green (#16B364). All text in near-black (#1A1A1A). White (#FFFFFF) card backgrounds with subtle gray (#D5D7DA) borders.",
  palette: BRAND_PALETTE,
  isNone: true,
};

export const DEFAULT_THEMES = [
  {
    id: "hooks",
    label: "Hooks & Audit",
    promptContext:
      "Style: step-by-step tutorial/how-to layout with numbered cards and bullet-point lists. Warm peach/pink gradient palette with soft card containers. Tone: developer-friendly, practical, concise.",
    visualPrompt:
      "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A vertical stack of 3-4 numbered step cards inside soft white/cream rounded rectangles with subtle shadows. Each card has a number badge on the left in warm orange (#E8875B), a content area, and a small icon. Between cards are thin connecting lines or arrows. On the right, a vertical list of 3-4 bullet points with green checkmark icons.",
    palette: ["#FDDCB5", "#F4A89A", "#FFF8F2", "#E8875B", "#2D2D2D", "#6DAA6D"],
  },
  {
    id: "scanning",
    label: "AI Scanning",
    promptContext:
      "Style: central infographic/diagram with surrounding icon bubbles. Laptop/screen centerpiece with radial layout. Warm gradient background. Tone: visual, feature-focused.",
    visualPrompt:
      "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A central laptop/monitor in the middle. Surrounding the laptop in a radial pattern are 6-8 floating icon bubbles (soft rounded circles) with relevant icons. Each bubble connected to center with thin dashed lines. Bubbles use alternating peach (#FDDCB5), coral (#F4A89A), lavender (#D6BBFB).",
    palette: ["#FDDCB5", "#F4A89A", "#7F56D9", "#FFF8F2", "#6DAA6D", "#D6BBFB"],
  },
  {
    id: "enforcement",
    label: "Pre-LLM Hook",
    promptContext:
      "Style: clean feature highlight card with a bordered content box listing items with icons. Large bold heading, subtitle, and tagline. Warm soft background. Tone: clear, focused.",
    visualPrompt:
      "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A large centered white/cream rounded card (70% width) with subtle border and shadow. Inside: a vertical list of 5-6 rows, each with a colored icon on left inside soft-colored circles (peach, lavender, coral), followed by a text/content area. Small decorative floating dots and curved line decorations in corners.",
    palette: ["#FDDCB5", "#F4A89A", "#7F56D9", "#FFF8F2", "#E9D7FE", "#333333"],
  },
  {
    id: "audit",
    label: "Observability",
    promptContext:
      "Style: quote-style heading with bordered card listing items with icon bullets. Clean layout. Warm gradient background. Tone: executive-focused, structured.",
    visualPrompt:
      "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A centered white/cream bordered card with rounded corners and thin warm-coral border. Inside: 4-5 rows, each with a colored icon on the left in warm tones (orange, coral, purple) and a content area. Above the card, large decorative open-quote marks in soft coral/peach.",
    palette: ["#FDDCB5", "#F4A89A", "#FFF8F2", "#7F56D9", "#E8875B", "#555555"],
  },
  {
    id: "guardrail-hooks",
    label: "Guardrail Hooks",
    promptContext:
      "Style: 2x2 grid layout showing four categories as soft rounded cards with icons. Center connecting icon. Warm peach/pink gradient background. Tone: structured, clean infographic.",
    visualPrompt:
      "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A 2x2 grid of four soft rounded cards arranged symmetrically. Each card has a white/cream background with colored left-border (peach, coral, lavender, mint), an icon inside a colored circle, and a content area. Center: large gear/cog icon in purple (#7F56D9) connecting all four with thin dashed lines.",
    palette: ["#FDDCB5", "#F4A89A", "#7F56D9", "#D6BBFB", "#B5E4CA", "#FFF8F2"],
  },
  {
    id: "attack-surface",
    label: "Attack Surface",
    promptContext:
      "Style: split layout with illustration on left and stacked alert cards on right. Warning/urgency theme. Warm gradient background. Tone: urgent, visual.",
    visualPrompt:
      "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): Left side: laptop illustration with screen content and warning glow overlay. Right side: 4 stacked horizontal alert cards, each with a warning triangle icon, a label area, and subtle red-tinted border. White background with red left-accent stripe per card. Below laptop: row of 4-5 small circular placeholders.",
    palette: ["#FDDCB5", "#D92D20", "#F4A89A", "#FFF8F2", "#2D2D2D", "#E8875B"],
  },
  {
    id: "suggestion-enforcement",
    label: "Suggestion to Enforcement",
    promptContext:
      "Style: horizontal numbered pipeline with bordered step cards connected by arrows. Warm soft background. Tone: clear, sequential.",
    visualPrompt:
      "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A horizontal row of 4 numbered step cards connected by arrows. Each card: tall rounded rectangle with large number at top in colored circle, an icon below. Number circles alternate: peach (#FDDCB5), coral (#F4A89A), lavender (#D6BBFB), mint (#B5E4CA). Between cards: thick horizontal arrows in matching color. White/cream card backgrounds with colored top-borders.",
    palette: ["#FDDCB5", "#F4A89A", "#7F56D9", "#D6BBFB", "#B5E4CA", "#FFF8F2"],
  },
  {
    id: "agentic-ide",
    label: "Dangers of Agentic IDEs",
    promptContext:
      "Style: split layout with stacked cards on left and diagram on right. Risk/warning theme. Warm gradient background. Tone: alarming, educational.",
    visualPrompt:
      "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): Left side: 4 stacked horizontal cards with warning icons. Each card: white rounded rectangle with red left-accent bar and an icon in light-red circle. Right side: laptop with warning badge overlay, below it a circular flow diagram with 3 nodes connected by curved arrows in red/coral. Bottom: row of 5 small circular placeholders.",
    palette: ["#D92D20", "#FEE4E2", "#FDDCB5", "#F4A89A", "#FFF8F2", "#E8875B"],
  },
  {
    id: "flowchart",
    label: "Flowchart",
    promptContext:
      "Style: detailed numbered flowchart with steps, branches, and decision points. Warm peach/pink gradient background. Tone: technical, architectural, process-oriented.",
    visualPrompt:
      "LAYOUT STRUCTURE ONLY (ignore all text/labels in the template): A detailed vertical flowchart with 10-12 numbered steps. Each step: numbered circle connected by colored directional arrows flowing downward with branches. Includes a group of 3 parallel boxes in dashed border (lavender #D6BBFB), a decision branch going left (red #D92D20) and right (green #6DAA6D). Arrows colored: orange forward, pink secondary, green approved. Top: thin banner with circular placeholders.",
    palette: ["#E8875B", "#F4A89A", "#7F56D9", "#D6BBFB", "#6DAA6D", "#D92D20"],
  },
];

export function getThemeById(id) {
  if (!id || id === "none") return NO_TEMPLATE_THEME;
  const t = DEFAULT_THEMES.find((x) => x.id === id);
  return t || DEFAULT_THEMES[0];
}

/** UI: same templates as designer-app LeftPanel */
export const DESIGNER_THEME_OPTIONS = [
  { id: "none", label: "No template" },
  ...DEFAULT_THEMES.map((t) => ({ id: t.id, label: t.label })),
];

export const DESIGNER_POST_SIZE_OPTIONS = [
  { id: "1080x1080", label: "1:1" },
  { id: "1080x1080-trns", label: "1:1 trns" },
  { id: "1920x1080", label: "16:9" },
];
