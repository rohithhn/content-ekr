import { useState } from "react";
import { Loader2, Link2, Sparkles } from "lucide-react";
import { runEnkryptLlm } from "@/app/utils/enkryptLlmApi";
import { TONE_PRESETS, type ToneId } from "@/app/utils/contentWriterConstants";
import { RESEARCHER_SYSTEM, buildResearcherUserPrompt } from "@/app/utils/researcherPrompts";
import { fetchExtractUrl } from "@/app/utils/fetchUrlContent";

const inputClass =
  "w-full px-3 py-2.5 border-2 border-border rounded-[var(--radius)] bg-input-background text-foreground transition-all focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15";

const OUTPUT_SHAPES = [
  { id: "linkedin" as const, label: "LinkedIn opinion" },
  { id: "blog" as const, label: "Full blog response" },
  { id: "snippet" as const, label: "Short snippet" },
];

interface ResearcherPanelProps {
  provider: "openai" | "gemini";
  apiKeyRaw: string;
  setOutput: (s: string) => void;
}

export function ResearcherPanel({ provider, apiKeyRaw, setOutput }: ResearcherPanelProps) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceTitle, setSourceTitle] = useState("");
  const [toneId, setToneId] = useState<ToneId>("thought_leadership");
  const [outputShape, setOutputShape] = useState<"linkedin" | "blog" | "snippet">("linkedin");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const handleFetchUrl = async () => {
    if (!sourceUrl.trim()) return;
    setFetchError("");
    setFetchLoading(true);
    try {
      const r = await fetchExtractUrl(sourceUrl.trim());
      setSourceText(r.text);
      setSourceTitle(r.title || "");
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : "Fetch failed. Paste the article text below, or run `vercel dev` / deploy to Vercel.");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!sourceText.trim()) return;
    setLoading(true);
    setOutput("");
    const accessedDate = new Date().toISOString().slice(0, 10);
    try {
      const user = buildResearcherUserPrompt({
        sourceText,
        sourceUrl: sourceUrl.trim() || undefined,
        sourceTitle: sourceTitle.trim() || undefined,
        toneId,
        outputShape,
        accessedDate,
      });
      const text = await runEnkryptLlm(apiKeyRaw, provider, RESEARCHER_SYSTEM, user);
      setOutput(text);
    } catch (e: unknown) {
      setOutput(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-w-0 bg-muted p-4 sm:p-5">
      <div className="bg-card border border-border rounded-[var(--radius-card)] p-4 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-[3px] h-[18px] bg-primary rounded-sm" />
          <span className="text-foreground" style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>
            Researcher
          </span>
        </div>
        <p className="text-muted-foreground m-0 mb-3" style={{ fontSize: "var(--text-sm)", lineHeight: 1.45 }}>
          URL → extract → Enkrypt opinion piece with attribution. Paste text if fetch isn’t available (local dev).
        </p>

        <label className="block text-foreground mb-1 flex items-center gap-2" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
          <Link2 className="w-3.5 h-3.5" />
          Article URL
        </label>
        <div className="flex gap-2 flex-wrap">
          <input
            className={`${inputClass} flex-1 min-w-[200px]`}
            type="url"
            placeholder="https://…"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
          <button
            type="button"
            onClick={handleFetchUrl}
            disabled={!sourceUrl.trim() || fetchLoading}
            className="px-4 py-2.5 rounded-[var(--radius-button)] border-2 border-border bg-card font-semibold text-sm cursor-pointer hover:bg-muted disabled:opacity-50"
          >
            {fetchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch & extract"}
          </button>
        </div>
        {fetchError ? <p className="text-destructive mt-2 m-0" style={{ fontSize: "var(--text-sm)" }}>{fetchError}</p> : null}

        <label className="block text-foreground mt-3 mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
          Source text (required)
        </label>
        <textarea
          className={inputClass}
          style={{ minHeight: 160, resize: "vertical", fontSize: "var(--text-sm)" }}
          placeholder="Fetched text appears here — or paste the article body manually."
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <span className="block text-foreground mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Tone</span>
            <select className={inputClass} value={toneId} onChange={(e) => setToneId(e.target.value as ToneId)} style={{ cursor: "pointer" }}>
              {TONE_PRESETS.map((t) => (
                <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-foreground mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Output shape</span>
            <select
              className={inputClass}
              value={outputShape}
              onChange={(e) => setOutputShape(e.target.value as typeof outputShape)}
              style={{ cursor: "pointer" }}
            >
              {OUTPUT_SHAPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!sourceText.trim() || loading}
          className="w-full mt-4 py-3 px-4 rounded-[var(--radius-button)] border-2 border-primary bg-primary text-primary-foreground font-bold cursor-pointer flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50"
          style={{ fontSize: "var(--text-base)" }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? "Rewriting…" : "Generate opinion piece"}
        </button>
      </div>
    </div>
  );
}
