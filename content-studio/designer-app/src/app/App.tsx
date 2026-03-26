import {
  useState,
  useCallback,
  useEffect,
  Component,
  type ReactNode,
} from "react";
import { Header } from "./components/Header";
import { LeftPanel } from "./components/LeftPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { RightPanel } from "./components/RightPanel";
import { ContentWriterPanel } from "./components/ContentWriterPanel";
import { ResearcherPanel } from "./components/ResearcherPanel";
import { TextToolsSplitLayout } from "./components/TextToolsSplitLayout";
import { TextOutputPanel } from "./components/TextOutputPanel";
import type { PreviewToolbarApi } from "./types/previewToolbar";
import type { AppMode } from "./types/appMode";
import { peekStudioBrandSession } from "../../../lib/brand/studioBrandBridge.js";

/** Serialized from Content Studio Brand Editor → sessionStorage → embed */
interface StudioBrandEmbedPayload {
  logoPlacement: string;
  logos: { primary: string | null; dark: string | null };
  colors: Record<string, string> | null;
  typography: { heading_font?: string; body_font?: string } | null;
  company_name: string;
  tagline: string;
  logosDescription: string;
  visual_style: { image_style?: string; icon_style?: string } | null;
}

/* ── Error Boundary ── */
interface EBState {
  hasError: boolean;
  error: Error | null;
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  EBState
> {
  state: EBState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 32,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <h2
            style={{
              color: "var(--destructive, #D92D20)",
              marginBottom: 12,
            }}
          >
            Something went wrong
          </h2>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontSize: "var(--text-xs)",
              color: "var(--foreground, #414651)",
              background: "var(--muted, #f5f5f5)",
              padding: 16,
              borderRadius: "var(--radius)",
            }}
          >
            {this.state.error?.message}
            {"\n"}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() =>
              this.setState({ hasError: false, error: null })
            }
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "var(--primary, #7F56D9)",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface GeneratedContent {
  heading: string;
  subheading: string;
  footer: string;
}

interface TextSlotPos {
  yPct: number;
}

interface Settings {
  theme: string;
  selectedThemes: string[];
  logoPosition: string;
  padding: number;
  logoScale: number;
  /** When true, preview export has no brand mark (Logo & Spacing) */
  hideLogo?: boolean;
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
  slotGap?: number;
  textColorSettings?: {
    heading: {
      baseColor: string;
      useGradient: boolean;
      wordStyles: Record<
        number,
        {
          color?: string;
          bold?: boolean;
          strikethrough?: boolean;
        }
      >;
    };
    subheading: {
      baseColor: string;
      useGradient: boolean;
      wordStyles: Record<
        number,
        {
          color?: string;
          bold?: boolean;
          strikethrough?: boolean;
        }
      >;
    };
    footer: {
      baseColor: string;
      useGradient: boolean;
      wordStyles: Record<
        number,
        {
          color?: string;
          bold?: boolean;
          strikethrough?: boolean;
        }
      >;
    };
  };
  variations: string[];
  activeVariation: number;
  /** Designer tab only: "1080x1080-trns" uses alternate 1:1 background in preview */
  postSizeId?: string;
  /** Designer tab only: when true, image prompt requires solid white #FFFFFF background */
  designerWhiteBg?: boolean;
  /** Corner radius (px at export resolution) for the generated visual in the preview slot */
  visualImageBorderRadius?: number;
  /** Injected when opened from Content Studio — drives preview logo + image prompts */
  brandFromStudio?: StudioBrandEmbedPayload | null;
}

export default function App() {
  const [hasContent, setHasContent] = useState(false);
  const [mode, setMode] = useState<AppMode>("general");
  const [writerOutput, setWriterOutput] = useState("");
  const [researcherOutput, setResearcherOutput] = useState("");
  const [settings, setSettings] = useState<Settings | null>({
    theme: "none",
    selectedThemes: ["none"],
    logoPosition: "top-left",
    padding: 20,
    logoScale: 60,
    hideLogo: false,
    visualImage: null,
    size: { width: 1080, height: 1080 },
    content: null,
    useHeading: true,
    useSubheading: true,
    useFooter: true,
    fontSettings: {
      heading: { size: 40, weight: 600 },
      subheading: { size: 27, weight: 600 },
      footer: { size: 24, weight: 500 },
    },
    visualSlot: { widthPct: 100, heightPct: 100, yPct: 14 },
    textSlots: {
      heading: { yPct: 7 },
      subheading: { yPct: 10 },
      footer: { yPct: 80 },
    },
    mode: "general",
    slotGap: 14,
    textColorSettings: {
      heading: {
        baseColor: "#FFFFFF",
        useGradient: true,
        wordStyles: {},
      },
      subheading: {
        baseColor: "#000000",
        useGradient: false,
        wordStyles: {},
      },
      footer: {
        baseColor: "#FFFFFF",
        useGradient: true,
        wordStyles: {},
      },
    },
    variations: [],
    activeVariation: 0,
    visualImageBorderRadius: 12,
  });
  const [renderCount, setRenderCount] = useState(0);
  const [previewToolbar, setPreviewToolbar] = useState<PreviewToolbarApi | null>(null);
  /** Content Studio iframe: hide General / Blog / Writer / Researcher chrome */
  const [isEmbedUi, setIsEmbedUi] = useState(false);

  /**
   * Embedded in ContentEngine: parent sets `ce_designer_embed_visual` and optional
   * `ce_designer_embed_content` (heading/subheading/footer from structure step) before
   * loading `/designer/index.html?embed=1`. Or `?image=` for short URLs.
   */
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("embed") !== "1") return;
      setIsEmbedUi(true);
      let visual: string | null = null;
      const stored = sessionStorage.getItem("ce_designer_embed_visual");
      if (stored) {
        sessionStorage.removeItem("ce_designer_embed_visual");
        visual = stored;
      } else {
        const q = params.get("image");
        if (q) visual = decodeURIComponent(q);
      }

      let embedContent: GeneratedContent | null = null;
      const contentStored = sessionStorage.getItem("ce_designer_embed_content");
      if (contentStored) {
        sessionStorage.removeItem("ce_designer_embed_content");
        try {
          const parsed = JSON.parse(contentStored) as Record<string, string>;
          embedContent = {
            heading: String(parsed.heading || ""),
            subheading: String(parsed.subheading || ""),
            footer: String(parsed.footer || ""),
          };
        } catch {
          embedContent = null;
        }
      }

      const hasText =
        embedContent &&
        (embedContent.heading || embedContent.subheading || embedContent.footer);

      const layoutPatch: Partial<Settings> = {};
      const pidStored = sessionStorage.getItem("ce_designer_embed_post_size_id");
      if (pidStored != null) {
        sessionStorage.removeItem("ce_designer_embed_post_size_id");
        if (pidStored === "1080x1080-trns") {
          layoutPatch.postSizeId = "1080x1080-trns";
          layoutPatch.size = { width: 1080, height: 1080 };
        } else if (pidStored === "1920x1080") {
          layoutPatch.postSizeId = undefined;
          layoutPatch.size = { width: 1920, height: 1080 };
        } else {
          layoutPatch.postSizeId = undefined;
          layoutPatch.size = { width: 1080, height: 1080 };
        }
      }
      const wbStored = sessionStorage.getItem("ce_designer_embed_white_bg");
      if (wbStored !== null) {
        sessionStorage.removeItem("ce_designer_embed_white_bg");
        layoutPatch.designerWhiteBg = wbStored === "1";
      }
      const themeStored = sessionStorage.getItem("ce_designer_embed_theme_id");
      if (themeStored != null) {
        sessionStorage.removeItem("ce_designer_embed_theme_id");
        layoutPatch.theme = themeStored;
        layoutPatch.selectedThemes = [themeStored];
      }
      const hideLogoStored = sessionStorage.getItem("ce_designer_embed_hide_logo");
      if (hideLogoStored !== null) {
        sessionStorage.removeItem("ce_designer_embed_hide_logo");
        layoutPatch.hideLogo = hideLogoStored === "1";
      }

      const studioBrand = peekStudioBrandSession() as StudioBrandEmbedPayload | null;
      if (studioBrand && typeof studioBrand === "object") {
        (layoutPatch as Partial<Settings>).brandFromStudio = studioBrand;
        if (studioBrand.logoPlacement) {
          (layoutPatch as { logoPosition?: string }).logoPosition =
            studioBrand.logoPlacement;
        }
        const bc = studioBrand.colors as
          | { primary?: string; secondary?: string; text_body?: string }
          | undefined;
        if (bc?.primary && bc?.secondary) {
          (layoutPatch as Partial<Settings>).textColorSettings = {
            heading: { baseColor: bc.primary, useGradient: true, wordStyles: {} },
            subheading: {
              baseColor: bc.text_body || "#374151",
              useGradient: false,
              wordStyles: {},
            },
            footer: { baseColor: bc.secondary, useGradient: true, wordStyles: {} },
          };
        }
      }

      const hasLayout = Object.keys(layoutPatch).length > 0;
      if (visual || hasText || hasLayout) {
        setSettings((prev) => {
          if (!prev) return prev;
          const next: Settings = {
            ...prev,
            ...layoutPatch,
            ...(visual ? { visualImage: visual } : {}),
            ...(hasText && embedContent ? { content: embedContent } : {}),
          };
          /* Single injected image must live in `variations[]` so LeftPanel + preview toolbar register. */
          if (visual) {
            next.variations = [visual];
            next.activeVariation = 0;
          }
          return next;
        });
        setHasContent(true);
        setRenderCount((c) => c + 1);
      }
      setMode("designer");
    } catch {
      /* ignore */
    }
  }, []);

  /* ── API state (lifted so Header settings panel & LeftPanel share it) ── */
  const [provider, setProvider] = useState<"openai" | "gemini">(
    () => {
      try {
        return (
          (localStorage.getItem("enkrypt-api-provider") as
            | "openai"
            | "gemini") || "openai"
        );
      } catch {
        return "openai";
      }
    },
  );
  const [apiKeyRaw, setApiKeyRaw] = useState(() => {
    try {
      return localStorage.getItem("enkrypt-api-key") || "";
    } catch {
      return "";
    }
  });

  const handleContentGenerated = useCallback(
    (_content?: any) => {
      setHasContent(true);
    },
    [],
  );

  const handleSettingsChange = useCallback((s: Settings) => {
    setSettings(s);
  }, []);

  const handleSettingsPatch = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const handleGenerateVisual = useCallback(() => {
    setRenderCount((c) => c + 1);
  }, []);

  /** Keep Content Studio CenterPanel in sync with designer post size / white bg / template */
  useEffect(() => {
    if (!isEmbedUi || !settings) return;
    const t = window.setTimeout(() => {
      try {
        const postSizeId =
          settings.postSizeId === "1080x1080-trns"
            ? "1080x1080-trns"
            : settings.size?.width === 1920 && settings.size?.height === 1080
              ? "1920x1080"
              : "1080x1080";
        const themeId =
          settings.theme ||
          (settings.selectedThemes && settings.selectedThemes[0]) ||
          "none";
        window.parent?.postMessage(
          {
            type: "ce-designer-embed-settings",
            payload: {
              postSizeId,
              designerWhiteBg: !!settings.designerWhiteBg,
              themeId,
              hideLogo: !!settings.hideLogo,
            },
          },
          window.location.origin,
        );
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [
    isEmbedUi,
    settings?.postSizeId,
    settings?.designerWhiteBg,
    settings?.size?.width,
    settings?.size?.height,
    settings?.theme,
    settings?.selectedThemes?.join(","),
    settings?.hideLogo,
  ]);

  /** Content Studio overlay: swap hero image without reloading the iframe */
  useEffect(() => {
    if (!isEmbedUi) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type !== "ce-designer-embed-visual") return;
      const p = e.data.payload || {};
      const imageUrl = p.imageUrl;
      if (!imageUrl || typeof imageUrl !== "string") return;
      const dc = p.designerContent;
      setSettings((prev) => {
        if (!prev) return prev;
        const next: Settings = {
          ...prev,
          visualImage: imageUrl,
          variations: [imageUrl],
          activeVariation: 0,
        };
        if (
          dc &&
          typeof dc === "object" &&
          (dc.heading || dc.subheading || dc.footer)
        ) {
          next.content = {
            heading: String(dc.heading || ""),
            subheading: String(dc.subheading || ""),
            footer: String(dc.footer || ""),
          };
        }
        return next;
      });
      setRenderCount((c) => c + 1);
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [isEmbedUi]);

  const handleSetMode = useCallback((m: AppMode) => {
    setMode(m);
    if (m === "blog") {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              mode: "blog",
              postSizeId: undefined,
              designerWhiteBg: undefined,
            }
          : prev,
      );
    } else if (m === "general") {
      setSettings((prev) =>
        prev
          ? {
              ...prev,
              mode: "general",
              postSizeId: undefined,
              designerWhiteBg: undefined,
            }
          : prev,
      );
    } else if (m === "designer") {
      setSettings((prev) => (prev ? { ...prev, mode: "general" } : prev));
    }
  }, []);

  const isCanvasMode =
    mode === "general" || mode === "blog" || mode === "designer";

  return (
    <ErrorBoundary>
      <div
        className={
          isEmbedUi
            ? "min-h-screen bg-background"
            : "min-h-screen bg-background p-2 sm:p-5"
        }
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div
          className={
            isEmbedUi
              ? "min-h-screen mx-auto bg-card overflow-x-hidden overflow-y-visible"
              : "max-w-[1800px] mx-auto bg-card rounded-[var(--radius-card)] overflow-x-hidden overflow-y-visible"
          }
          style={isEmbedUi ? undefined : { boxShadow: "var(--elevation-sm)" }}
        >
          <Header
            provider={provider}
            setProvider={setProvider}
            apiKeyRaw={apiKeyRaw}
            setApiKeyRaw={setApiKeyRaw}
            mode={mode}
            setMode={handleSetMode}
            embed={isEmbedUi}
          />
          {isCanvasMode ? (
            <div
              className="grid grid-cols-1 xl:grid-cols-[480px_1fr_400px]"
              style={{
                minHeight: isEmbedUi ? "100vh" : "calc(100vh - 120px)",
              }}
            >
              <LeftPanel
                onContentGenerated={handleContentGenerated}
                onSettingsChange={handleSettingsChange}
                onGenerateVisual={handleGenerateVisual}
                hasContent={hasContent}
                provider={provider}
                apiKeyRaw={apiKeyRaw}
                headerMode={mode}
                mode={mode === "blog" ? "blog" : "general"}
                setMode={handleSetMode}
                settings={settings}
                registerPreviewToolbar={setPreviewToolbar}
                isEmbed={isEmbedUi}
              />
              <PreviewPanel
                settings={settings}
                shouldRender={renderCount}
                toolbar={previewToolbar}
              />
              <RightPanel
                settings={settings}
                onSettingsChange={handleSettingsPatch}
                onContentGenerated={handleContentGenerated}
              />
            </div>
          ) : mode === "contentWriter" ? (
            <TextToolsSplitLayout
              sidebar={
                <ContentWriterPanel
                  provider={provider}
                  apiKeyRaw={apiKeyRaw}
                  setOutput={setWriterOutput}
                />
              }
              main={
                <TextOutputPanel
                  title="Generated content"
                  output={writerOutput}
                  emptyHint="Set a topic or paste context, then Generate. Output appears here — copy or download as .md."
                />
              }
            />
          ) : mode === "researcher" ? (
            <TextToolsSplitLayout
              sidebar={
                <ResearcherPanel
                  provider={provider}
                  apiKeyRaw={apiKeyRaw}
                  setOutput={setResearcherOutput}
                />
              }
              main={
                <TextOutputPanel
                  title="Opinion piece"
                  output={researcherOutput}
                  emptyHint="Fetch a URL (with Vercel / vercel dev + Vite proxy) or paste article text, then generate."
                />
              }
            />
          ) : null}
        </div>
      </div>
    </ErrorBoundary>
  );
}