/**
 * Channel definitions with visual slot mappings.
 * Each channel defines its format constraints and the visual slots
 * that should be generated for a complete content bundle.
 */
export const CHANNELS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    icon: "in",
    maxLength: 3000,
    slots: ["hero", "carousel-1", "carousel-2", "carousel-3"],
    description: "Professional posts with hooks, structure, and hashtags",
  },
  {
    id: "twitter",
    label: "Twitter / X",
    color: "#1D9BF0",
    icon: "𝕏",
    maxLength: 280,
    threadMax: 25,
    slots: ["image"],
    description: "Punchy tweets and threads with high shareability",
  },
  {
    id: "blog",
    label: "Blog Post",
    color: "#10B981",
    icon: "B",
    wordRange: [800, 2500],
    slots: ["hero", "section-1", "section-2", "og-image"],
    description: "SEO-optimized long-form posts with markdown formatting",
  },
  {
    id: "article",
    label: "Article",
    color: "#F59E0B",
    icon: "A",
    wordRange: [1500, 4000],
    slots: ["hero", "pull-quote", "data-viz", "og-image"],
    description: "Thought leadership for C-suite readers and publications",
  },
  {
    id: "landing",
    label: "Landing Page",
    color: "#EC4899",
    icon: "L",
    slots: ["hero-visual", "feature-icons", "testimonial-bg", "og-image"],
    description: "Conversion-optimized page copy with full section structure",
  },
  {
    id: "html-video",
    label: "HTML Video",
    color: "#A855F7",
    icon: "▶",
    slots: [],
    description: "1280×720 auto-play HTML scenes for screen recording — single file, no frameworks",
  },
];

/** LinkedIn multi-slide visuals (carousel-1 … carousel-3). */
export function isCarouselVisualSlot(slotName) {
  return typeof slotName === "string" && slotName.startsWith("carousel-");
}

/**
 * Slot names used for the visual / image pipeline for a channel.
 * @param {string} channelId
 * @param {{ includeLinkedinCarousel?: boolean }} [options] — omit or false: LinkedIn = hero only; true adds carousel-1,2,3
 */
export function getChannelVisualSlotNames(channelId, options = {}) {
  const includeLinkedinCarousel = !!options.includeLinkedinCarousel;
  const ch = CHANNELS.find((c) => c.id === channelId);
  const slots = [...(ch?.slots || [])];
  if (channelId === "linkedin" && !includeLinkedinCarousel) {
    return slots.filter((s) => !isCarouselVisualSlot(s));
  }
  return slots;
}

/**
 * Template definitions with metadata for the gallery UI.
 * Each template maps to a system prompt in TEMPLATE_PROMPTS.
 */
export const TEMPLATES = [
  {
    id: "hot-take",
    name: "Hot Take on Industry News",
    category: "Thought Leadership",
    channels: ["linkedin", "twitter"],
    lucide: "Flame",
    description: "Turn a news article into a bold, opinionated post that positions you as a pattern-recognizer.",
    defaultTone: "Bold",
    defaultMode: "url",
    placeholder: "Paste a news article URL or describe the industry development you want to comment on...",
  },
  {
    id: "product-launch",
    name: "Product Launch Announcement",
    category: "Product & Company",
    channels: ["linkedin", "twitter", "blog"],
    lucide: "Rocket",
    description: "Multi-channel launch bundle that leads with customer value, not feature names.",
    defaultTone: "Professional",
    defaultMode: "text",
    placeholder: "Describe the product/feature you're launching, the problem it solves, and key capabilities...",
  },
  {
    id: "lessons-learned",
    name: "Lessons Learned Narrative",
    category: "Personal Brand",
    channels: ["linkedin", "blog"],
    lucide: "NotebookPen",
    description: "Share hard-won insights from a specific experience with vulnerability-driven authority.",
    defaultTone: "Conversational",
    defaultMode: "text",
    placeholder: "Describe the experience, project, or decision you want to reflect on. What happened? What did you learn?",
  },
  {
    id: "step-by-step",
    name: "Step-by-Step Guide",
    category: "Educational",
    channels: ["blog", "linkedin"],
    lucide: "ListOrdered",
    description: "Actionable how-to guide that transforms the reader from confused to capable.",
    defaultTone: "Educational",
    defaultMode: "topic",
    placeholder: "What process or technique do you want to explain? Who is the target reader?",
  },
  {
    id: "research-commentary",
    name: "Research Commentary",
    category: "Thought Leadership",
    channels: ["article", "linkedin"],
    lucide: "Microscope",
    description: "Expert interpretation of a research paper or report — translate findings into actionable insight.",
    defaultTone: "Technical",
    defaultMode: "url",
    placeholder: "Paste the research paper/report URL or describe the key findings you want to comment on...",
  },
  {
    id: "case-study",
    name: "Case Study Summary",
    category: "Product & Company",
    channels: ["blog", "linkedin", "twitter"],
    lucide: "BarChart3",
    description: "Compelling customer success story that helps prospects see themselves in the narrative.",
    defaultTone: "Professional",
    defaultMode: "text",
    placeholder: "Describe the customer, their challenge, your solution, and the results (with numbers if possible)...",
  },
  {
    id: "contrarian-take",
    name: "Contrarian Perspective",
    category: "Thought Leadership",
    channels: ["linkedin"],
    lucide: "Zap",
    description: "Challenge widely-held industry beliefs with substantive, evidence-based arguments.",
    defaultTone: "Provocative",
    defaultMode: "topic",
    placeholder: "What industry belief do you want to challenge? What evidence do you have that it's wrong?",
  },
  {
    id: "landing-page",
    name: "Product Landing Page",
    category: "Landing Pages",
    channels: ["landing"],
    lucide: "Target",
    description: "Full conversion-optimized landing page copy: hero, features, social proof, CTA.",
    defaultTone: "Professional",
    defaultMode: "text",
    placeholder: "Describe the product/service, target audience, primary benefit, and desired conversion action...",
  },
  {
    id: "html-video-builder",
    name: "HTML Video (screen record)",
    category: "Video",
    channels: ["html-video"],
    lucide: "Theater",
    description: "Single-file 1280×720 auto-playing HTML scenes — product demos, explainers, recordable as video.",
    defaultTone: "Bold",
    defaultMode: "text",
    placeholder: "What story should the video tell? Product name, audience, key proof points, desired CTA, and any must-show scenes...",
  },
  {
    id: "event-takeaways",
    name: "Event Takeaways",
    category: "Personal Brand",
    channels: ["linkedin", "twitter", "blog"],
    lucide: "Mic",
    description: "Distill key insights from a conference or event into shareable, bookmarkable content.",
    defaultTone: "Conversational",
    defaultMode: "text",
    placeholder: "What event did you attend? What were the 3-5 most important things you heard or learned?",
  },
  {
    id: "myth-vs-reality",
    name: "Myth vs. Reality",
    category: "Educational",
    channels: ["linkedin", "blog"],
    lucide: "Lightbulb",
    description: "Debunk common misconceptions with evidence, establishing you as a truth-teller in your industry.",
    defaultTone: "Educational",
    defaultMode: "topic",
    placeholder: "What topic has widespread myths? List 3-5 myths you want to debunk...",
  },
];

export const TONES = [
  "Professional",
  "Casual",
  "Bold",
  "Educational",
  "Conversational",
  "Provocative",
  "Inspirational",
  "Technical",
  "Witty",
  "Empathetic",
];

export const INPUT_MODES = [
  { id: "text", label: "Free Text", description: "Write a thought or paragraph", lucide: "PenLine" },
  { id: "url", label: "URL", description: "Paste an article or page URL", lucide: "Link2" },
  { id: "topic", label: "Topic", description: "Provide a topic to explore", lucide: "Lightbulb" },
  {
    id: "upload",
    label: "Upload",
    description: "PDF, Word (.docx), or image — Claude analyzes then generates",
    lucide: "Paperclip",
  },
];

export const AI_MODELS = [
  { id: "anthropic", name: "Claude Opus 4.6", provider: "Anthropic", type: "text", color: "#D4A574", envKey: "ANTHROPIC_API_KEY", keyField: "anthropic_key", headerName: "x-anthropic-key" },
  { id: "openai", name: "GPT-5.4", provider: "OpenAI", type: "image", color: "#74AA9C", envKey: "OPENAI_API_KEY", keyField: "openai_key", headerName: "x-openai-key" },
  { id: "nanobanana", name: "Nano Banana", provider: "Nano Banana", type: "image", color: "#FFD93D", envKey: "NANOBANANA_API_KEY", keyField: "nanobanana_key", headerName: "x-nanobanana-key" },
  { id: "kling", name: "Kling 2.0", provider: "Kuaishou", type: "video", color: "#FF6B6B", envKey: "KLING_API_KEY", keyField: "kling_key", headerName: "x-kling-key" },
];

/** Header “Models” menu — actual API model ids passed to `/api/generate/text`. */
export const STUDIO_TEXT_MODEL_OPTIONS = [
  { id: "claude-opus-4-6", label: "Claude Opus 4.6", short: "Opus" },
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4", short: "Sonnet 4" },
  { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku", short: "Haiku" },
];

export const DEFAULT_STUDIO_TEXT_MODEL = "claude-opus-4-6";

/** OpenAI image generation (`images.generate` model param) for designer + legacy pipelines. */
export const STUDIO_IMAGE_MODEL_OPTIONS = [
  { id: "gpt-image-1", label: "GPT Image 1", short: "Img 1" },
  { id: "gpt-image-1.5", label: "GPT Image 1.5", short: "Img 1.5" },
];

export const DEFAULT_STUDIO_IMAGE_MODEL = "gpt-image-1";

/** Forwarded to `/api/generate/video` (Kling or future providers). */
export const STUDIO_VIDEO_MODEL_OPTIONS = [
  { id: "kling-v2", label: "Kling 2.0", short: "Kling 2" },
  { id: "kling-v1-6", label: "Kling 1.6", short: "Kling 1.6" },
];

export const DEFAULT_STUDIO_VIDEO_MODEL = "kling-v2";

export function isStudioTextModelId(id) {
  if (!id || typeof id !== "string") return false;
  return STUDIO_TEXT_MODEL_OPTIONS.some((o) => o.id === id);
}

export function isStudioImageModelId(id) {
  if (!id || typeof id !== "string") return false;
  return STUDIO_IMAGE_MODEL_OPTIONS.some((o) => o.id === id);
}

export function isStudioVideoModelId(id) {
  if (!id || typeof id !== "string") return false;
  return STUDIO_VIDEO_MODEL_OPTIONS.some((o) => o.id === id);
}

const CE_STUDIO_MODELS_KEY = "ce_studio_models_v1";

/** @returns {{ textModel: string, imageModel: string, videoModel: string }} */
export function loadStudioModelPrefs() {
  try {
    const s = typeof localStorage !== "undefined" ? localStorage.getItem(CE_STUDIO_MODELS_KEY) : null;
    if (!s) return null;
    const o = JSON.parse(s);
    return {
      textModel: typeof o.textModel === "string" ? o.textModel : null,
      imageModel: typeof o.imageModel === "string" ? o.imageModel : null,
      videoModel: typeof o.videoModel === "string" ? o.videoModel : null,
    };
  } catch {
    return null;
  }
}

export function saveStudioModelPrefs(prefs) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(CE_STUDIO_MODELS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

export function normalizeStudioTextModel(id) {
  return isStudioTextModelId(id) ? id : DEFAULT_STUDIO_TEXT_MODEL;
}

export function normalizeStudioImageModel(id) {
  return isStudioImageModelId(id) ? id : DEFAULT_STUDIO_IMAGE_MODEL;
}

export function normalizeStudioVideoModel(id) {
  return isStudioVideoModelId(id) ? id : DEFAULT_STUDIO_VIDEO_MODEL;
}
