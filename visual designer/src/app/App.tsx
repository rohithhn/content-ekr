import {
  useState,
  useCallback,
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
}

export default function App() {
  const [hasContent, setHasContent] = useState(false);
  const [mode, setMode] = useState<AppMode>("general");
  const [writerOutput, setWriterOutput] = useState("");
  const [researcherOutput, setResearcherOutput] = useState("");
  const [settings, setSettings] = useState<Settings | null>({
    theme: "hooks",
    selectedThemes: ["hooks"],
    logoPosition: "top-left",
    padding: 20,
    logoScale: 60,
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
        className="min-h-screen bg-background p-2 sm:p-5"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div
          className="max-w-[1800px] mx-auto bg-card rounded-[var(--radius-card)] overflow-x-hidden overflow-y-visible"
          style={{ boxShadow: "var(--elevation-sm)" }}
        >
          <Header
            provider={provider}
            setProvider={setProvider}
            apiKeyRaw={apiKeyRaw}
            setApiKeyRaw={setApiKeyRaw}
            mode={mode}
            setMode={handleSetMode}
          />
          {isCanvasMode ? (
            <div
              className="grid grid-cols-1 xl:grid-cols-[480px_1fr_400px]"
              style={{ minHeight: "calc(100vh - 120px)" }}
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