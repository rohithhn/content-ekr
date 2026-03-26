/**
 * StudioPanel — Studio tab.
 *
 * Two variants:
 *  v1 — Auto:         AI extracts content + auto-generates a creative image instruction
 *                     + generates the full image via OpenAI GPT Image (model from prefs) / Gemini.
 *
 *  v2 — Guided:       Same but the user writes their own image instruction.
 *
 * Generation flow:
 *   content → image → done
 *   (v1 has an extra fast "instruction" step before image; v2 skips it)
 *
 * Everything on canvas is fully editable after generation.
 * bg-1x1.png and Enkrypt logo are fixed HTML layers beneath the canvas.
 */

import { useState, useRef, useCallback } from "react";
import {
  Layers2, Wand2, Pencil, Loader2, RotateCcw,
  ChevronRight, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { StudioCanvas, type StudioCanvasRef, type SelectedObjectProps } from "./StudioCanvas";
import { StudioToolbar } from "./StudioToolbar";
import { StudioPropertiesPanel } from "./StudioPropertiesPanel";
import {
  generateStudioContent,
  type GeneratedContent,
} from "@/app/utils/studioLayoutGenerator";
import {
  generateStudioImage,
  generateImageInstruction,
} from "@/app/utils/studioGenerator";

type Variant = "v1" | "v2" | null;
type GenStep = "idle" | "content" | "instruction" | "image" | "done";

interface StudioPanelProps {
  provider: "openai" | "gemini";
  apiKeyRaw: string;
  initialContent?: GeneratedContent | null;
}

const DISPLAY_SIZE = 580;

// ── Variant picker ────────────────────────────────────────────────────────────

function VariantCard({
  icon, title, description, badge, onClick,
}: {
  icon: React.ReactNode; title: string;
  description: string; badge: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-5 p-7 rounded-2xl border-2 border-border bg-card text-left cursor-pointer transition-all hover:border-primary/60 hover:shadow-lg hover:bg-muted/20 active:scale-[0.98]"
      style={{ width: 288 }}
    >
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 text-primary">
          {icon}
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
          {badge}
        </span>
      </div>
      <div className="space-y-1.5">
        <p className="font-bold text-foreground text-base">{title}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <span className="flex items-center gap-1 text-xs font-semibold text-primary group-hover:gap-2 transition-all">
        Open Studio <ChevronRight className="w-3.5 h-3.5" />
      </span>
    </button>
  );
}

// ── Left panel ────────────────────────────────────────────────────────────────

function LeftPanel({
  variant, genStep, content, rawContent, instruction,
  onRawChange, onContentChange, onInstructionChange,
  onGenerate, onReset,
}: {
  variant: Variant;
  genStep: GenStep;
  content: GeneratedContent | null;
  rawContent: string;
  instruction: string;
  onRawChange: (v: string) => void;
  onContentChange: (c: GeneratedContent) => void;
  onInstructionChange: (v: string) => void;
  onGenerate: () => void;
  onReset: () => void;
}) {
  const INPUT = "w-full px-3 py-2 text-sm border border-border rounded-lg bg-input-background text-foreground focus:outline-none focus-visible:border-primary transition-colors resize-none";
  const isGenerating = genStep !== "idle" && genStep !== "done";
  const hasContent = !!content;

  const stepLabel =
    genStep === "content"     ? "Extracting content…"     :
    genStep === "instruction" ? "Planning visual…"         :
    genStep === "image"       ? "Generating image…"        : "";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Layers2 className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Studio</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {variant === "v1" ? "Auto" : "Guided"}
          </span>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Switch
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Raw content */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Paste your content
          </label>
          <textarea
            value={rawContent}
            onChange={(e) => onRawChange(e.target.value)}
            placeholder="Paste your content — blog post, article, notes, bullet points…"
            rows={6}
            className={INPUT}
            style={{ lineHeight: 1.6 }}
            disabled={isGenerating}
          />
        </div>

        {/* v2: custom image instruction */}
        {variant === "v2" && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Image instruction
            </label>
            <textarea
              value={instruction}
              onChange={(e) => onInstructionChange(e.target.value)}
              placeholder={`Describe the visual:\n"Security network with attack nodes and red danger badges"\n"Bold stat dashboard showing 3 key metrics"\n"Process flow diagram with 4 connected steps"`}
              rows={4}
              className={INPUT}
              style={{ lineHeight: 1.55 }}
              disabled={isGenerating}
            />
          </div>
        )}

        {/* Generate */}
        <button
          onClick={onGenerate}
          disabled={isGenerating || !rawContent.trim() || (variant === "v2" && !instruction.trim())}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)", border: "none" }}
        >
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" />{stepLabel}</>
          ) : hasContent ? (
            <><RefreshCw className="w-4 h-4" />Regenerate</>
          ) : (
            <><Wand2 className="w-4 h-4" />Generate</>
          )}
        </button>

        {/* Editable content fields */}
        {hasContent && (
          <div className="space-y-3 pt-1 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Edit content
            </p>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Heading</label>
              <input
                type="text"
                value={content!.heading}
                onChange={(e) => onContentChange({ ...content!, heading: e.target.value })}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Subheading</label>
              <textarea
                value={content!.subheading}
                onChange={(e) => onContentChange({ ...content!, subheading: e.target.value })}
                rows={2}
                className={INPUT}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Footer</label>
              <input
                type="text"
                value={content!.footer}
                onChange={(e) => onContentChange({ ...content!, footer: e.target.value })}
                className={INPUT}
              />
            </div>
          </div>
        )}

        {/* Fixed layers note */}
        <div className="rounded-xl px-4 py-3" style={{ background: "var(--muted)" }}>
          <p className="text-xs font-semibold text-foreground mb-1.5">Fixed layers</p>
          <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
            <li>Background — 1:1 brand template</li>
            <li>Enkrypt logo — top-left</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── Canvas placeholder ────────────────────────────────────────────────────────

function CanvasPlaceholder({ genStep, variant }: { genStep: GenStep; variant: Variant }) {
  const isGenerating = genStep !== "idle" && genStep !== "done";

  if (isGenerating) {
    const msg =
      genStep === "content"     ? "Extracting heading, subheading & footer…" :
      genStep === "instruction" ? "Planning visual direction…"                :
                                  "Generating image — this takes ~15 seconds…";
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card gap-5"
        style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}
      >
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground text-center max-w-[240px]">{msg}</p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 gap-4 text-center px-8"
      style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}
    >
      {variant === "v2" ? (
        <Wand2 className="w-10 h-10 text-muted-foreground/40" />
      ) : (
        <Pencil className="w-10 h-10 text-muted-foreground/40" />
      )}
      <p className="text-sm text-muted-foreground max-w-[240px] leading-relaxed">
        {variant === "v2"
          ? "Paste content, write your image instruction, then hit Generate."
          : "Paste your content and hit Generate — AI designs the visual automatically."}
      </p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function StudioPanel({ provider, apiKeyRaw, initialContent }: StudioPanelProps) {
  const [variant, setVariant] = useState<Variant>(null);
  const [rawContent, setRawContent] = useState("");
  const [content, setContent] = useState<GeneratedContent | null>(initialContent ?? null);
  const [instruction, setInstruction] = useState("");
  const [genStep, setGenStep] = useState<GenStep>("idle");
  const [canvasReady, setCanvasReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selected, setSelected] = useState<SelectedObjectProps | null>(null);

  const canvasRef = useRef<StudioCanvasRef>(null);

  const getApiKey = () => apiKeyRaw.replace(/[^\x20-\x7E]/g, "").trim();

  const handleGenerate = useCallback(async () => {
    const apiKey = getApiKey();
    if (!apiKey) { toast.error("No API key — open Settings."); return; }
    if (!rawContent.trim()) return;
    if (variant === "v2" && !instruction.trim()) return;

    setCanvasReady(false);
    setGenStep("content");

    try {
      // Step 1: extract heading / subheading / footer
      const generatedContent = await generateStudioContent(rawContent, apiKey, provider);
      setContent(generatedContent);

      // Step 2: get the image instruction
      let imageInstruction = instruction.trim();
      if (variant === "v1") {
        // Auto-generate a concise creative instruction from content
        setGenStep("instruction");
        imageInstruction = await generateImageInstruction({
          rawContent,
          heading: generatedContent.heading,
          subheading: generatedContent.subheading,
          apiKey,
          provider,
        });
      }

      // Step 3: generate the full image (OpenAI GPT Image / Gemini)
      setGenStep("image");
      const dataURL = await generateStudioImage({
        instruction: imageInstruction,
        heading: generatedContent.heading,
        subheading: generatedContent.subheading,
        footer: generatedContent.footer,
        apiKey,
        provider,
      });

      // Step 4: place image on canvas + overlay editable text slots
      await canvasRef.current?.renderAIBase(dataURL, generatedContent);
      setCanvasReady(true);
      setGenStep("done");
    } catch (err: any) {
      toast.error(err?.message ?? "Generation failed.");
      setGenStep("idle");
    }
  }, [rawContent, instruction, variant, apiKeyRaw, provider]);

  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await canvasRef.current.exportPNG();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "studio-design.png";
      a.click();
    } catch (err: any) {
      toast.error("Export failed: " + (err?.message ?? "unknown error"));
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setVariant(null);
    setRawContent("");
    setContent(null);
    setInstruction("");
    setGenStep("idle");
    setCanvasReady(false);
    setSelected(null);
  }, []);

  // ── Variant picker ──────────────────────────────────────────────────────────
  if (!variant) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-10 px-8 py-16">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Layers2 className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Studio</h2>
          </div>
          <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
            AI generates a full branded visual. Heading, subheading, and footer are editable text overlays — move, style, resize freely. Add shapes and text via the toolbar.
          </p>
        </div>

        <div className="flex gap-6 flex-wrap justify-center">
          <VariantCard
            icon={<Pencil className="w-6 h-6" />}
            title="Auto"
            description="Paste your content — AI picks the visual direction and generates a full image automatically."
            badge="v1"
            onClick={() => setVariant("v1")}
          />
          <VariantCard
            icon={<Wand2 className="w-6 h-6" />}
            title="Guided"
            description="Write your own image instruction — 'security network with attack nodes', 'stat dashboard', etc. AI executes it."
            badge="v2"
            onClick={() => setVariant("v2")}
          />
        </div>
      </div>
    );
  }

  const isGenerating = genStep !== "idle" && genStep !== "done";
  const showCanvas = canvasReady || isGenerating;

  // ── Canvas editor ───────────────────────────────────────────────────────────
  return (
    <div className="flex h-full overflow-hidden" style={{ minHeight: "calc(100vh - 120px)" }}>

      {/* Left panel */}
      <div className="border-r border-border bg-card flex flex-col overflow-hidden" style={{ width: 290, minWidth: 290 }}>
        <LeftPanel
          variant={variant}
          genStep={genStep}
          content={content}
          rawContent={rawContent}
          instruction={instruction}
          onRawChange={setRawContent}
          onContentChange={setContent}
          onInstructionChange={setInstruction}
          onGenerate={handleGenerate}
          onReset={handleReset}
        />
      </div>

      {/* Center: toolbar + canvas */}
      <div className="flex-1 flex flex-col items-center justify-start gap-4 p-6 overflow-auto bg-muted/20">
        <StudioToolbar
          hasSelection={!!selected}
          isGroup={selected?.isGroup ?? false}
          onAddText={() => canvasRef.current?.addText()}
          onAddRect={() => canvasRef.current?.addRect()}
          onAddCircle={() => canvasRef.current?.addCircle()}
          onUndo={() => canvasRef.current?.undo()}
          onRedo={() => canvasRef.current?.redo()}
          onUngroup={() => canvasRef.current?.ungroupSelected()}
          onDelete={() => canvasRef.current?.deleteSelected()}
          onBringForward={() => canvasRef.current?.bringForward()}
          onSendBackward={() => canvasRef.current?.sendBackward()}
          onDownload={handleDownload}
          isExporting={isExporting}
        />

        {showCanvas ? (
          <StudioCanvas
            ref={canvasRef}
            onSelectObject={setSelected}
            displaySize={DISPLAY_SIZE}
          />
        ) : (
          <CanvasPlaceholder genStep={genStep} variant={variant} />
        )}

        {canvasReady && (
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            Click to select · Double-click text to edit · Drag to move · Corner handles to resize
          </p>
        )}
      </div>

      {/* Right: properties */}
      <div className="border-l border-border bg-card flex flex-col overflow-hidden" style={{ width: 264, minWidth: 264 }}>
        <div className="px-4 py-3.5 border-b border-border shrink-0">
          <p className="text-sm font-semibold text-foreground">Properties</p>
          {selected && (
            <p className="text-xs text-muted-foreground capitalize mt-0.5">{selected.type ?? "element"}</p>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <StudioPropertiesPanel
            selected={selected}
            onUpdate={(props) => canvasRef.current?.updateSelected(props)}
            onDelete={() => canvasRef.current?.deleteSelected()}
            onBringForward={() => canvasRef.current?.bringForward()}
            onSendBackward={() => canvasRef.current?.sendBackward()}
            onUngroup={() => canvasRef.current?.ungroupSelected()}
          />
        </div>
      </div>
    </div>
  );
}
