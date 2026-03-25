import { useState } from "react";
import { Loader2, Sparkles, Link as LinkIcon } from "lucide-react";
import { runEnkryptLlm } from "@/app/utils/enkryptLlmApi";
import {
  ENKRYPT_BRAND_VOICE_SYSTEM,
  TONE_PRESETS,
  CONTENT_TYPES,
  LENGTH_OPTIONS,
  CTA_OPTIONS,
  EMOJI_DENSITY,
  HASHTAG_MODES,
  type ToneId,
  type ContentTypeId,
} from "@/app/utils/contentWriterConstants";
import { buildContentWriterUserPrompt } from "@/app/utils/contentWriterPrompts";
import { fetchExtractUrl } from "@/app/utils/fetchUrlContent";

const inputClass =
  "w-full px-3 py-2.5 border-2 border-border rounded-[var(--radius)] bg-input-background text-foreground transition-all focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15";

interface ContentWriterPanelProps {
  provider: "openai" | "gemini";
  apiKeyRaw: string;
  setOutput: (s: string) => void;
}

export function ContentWriterPanel({ provider, apiKeyRaw, setOutput }: ContentWriterPanelProps) {
  const [topic, setTopic] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [toneId, setToneId] = useState<ToneId>("thought_leadership");
  const [contentType, setContentType] = useState<ContentTypeId>("linkedin");
  const [lengthId, setLengthId] = useState<"short" | "medium" | "long">("medium");
  const [hashtagMode, setHashtagMode] = useState<"off" | "suggest">("suggest");
  const [ctaId, setCtaId] = useState<"none" | "website" | "demo" | "blog">("website");
  const [emojiId, setEmojiId] = useState<"none" | "low" | "medium">("low");
  const [seoKeywords, setSeoKeywords] = useState("");
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
      if (r.title && !topic.trim()) setTopic(r.title);
    } catch (e: unknown) {
      setFetchError(e instanceof Error ? e.message : "Could not fetch URL. Paste the article text below, or deploy to Vercel and try again.");
    } finally {
      setFetchLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!topic.trim() && !sourceText.trim()) return;
    setLoading(true);
    setOutput("");
    try {
      const emojiRule = EMOJI_DENSITY.find((e) => e.id === emojiId)?.rule ?? EMOJI_DENSITY[1].rule;
      const user = buildContentWriterUserPrompt({
        topic,
        sourceUrl: sourceUrl.trim() || undefined,
        sourceText: sourceText.trim() || undefined,
        toneId,
        contentType,
        lengthId,
        hashtagMode,
        ctaId,
        emojiRule,
        seoKeywords: contentType === "blog" ? seoKeywords : undefined,
      });
      const text = await runEnkryptLlm(apiKeyRaw, provider, ENKRYPT_BRAND_VOICE_SYSTEM, user);
      setOutput(text);
    } catch (e: unknown) {
      setOutput(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  };

  const canGenerate = topic.trim().length > 0 || sourceText.trim().length > 0;

  return (
    <div className="w-full min-w-0 bg-muted p-4 sm:p-5">
      <div className="bg-card border border-border rounded-[var(--radius-card)] p-4 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-[3px] h-[18px] bg-primary rounded-sm" />
          <span className="text-foreground" style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>
            Content writer
          </span>
        </div>
        <p className="text-muted-foreground m-0 mb-3" style={{ fontSize: "var(--text-sm)", lineHeight: 1.45 }}>
          Topic-driven drafts for LinkedIn, blog, or threads. Optional URL fetch adds context (works on Vercel or paste text locally).
        </p>

        <label className="block text-foreground mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
          Topic / keywords
        </label>
        <textarea
          className={inputClass}
          style={{ minHeight: 72, resize: "vertical", fontSize: "var(--text-sm)" }}
          placeholder="e.g. Zero-trust for internal AI assistants, or paste a working title…"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />

        <div className="mt-3 pt-3 border-t border-border">
          <label className="block text-foreground mb-1 flex items-center gap-2" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>
            <LinkIcon className="w-3.5 h-3.5" />
            Source URL (optional)
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
              {fetchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Fetch"}
            </button>
          </div>
          {fetchError ? <p className="text-destructive mt-2 m-0" style={{ fontSize: "var(--text-sm)" }}>{fetchError}</p> : null}
          <label className="block text-muted-foreground mt-2 mb-1" style={{ fontSize: "var(--text-2xs)" }}>
            Or paste source text
          </label>
          <textarea
            className={inputClass}
            style={{ minHeight: 80, resize: "vertical", fontSize: "var(--text-sm)" }}
            placeholder="Paste article or notes if URL fetch isn’t available…"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
          />
        </div>

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
            <span className="block text-foreground mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Content type</span>
            <select className={inputClass} value={contentType} onChange={(e) => setContentType(e.target.value as ContentTypeId)} style={{ cursor: "pointer" }}>
              {CONTENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-foreground mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Length</span>
            <select className={inputClass} value={lengthId} onChange={(e) => setLengthId(e.target.value as typeof lengthId)} style={{ cursor: "pointer" }}>
              {LENGTH_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-foreground mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>CTA</span>
            <select className={inputClass} value={ctaId} onChange={(e) => setCtaId(e.target.value as typeof ctaId)} style={{ cursor: "pointer" }}>
              {CTA_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-foreground mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Hashtags</span>
            <select className={inputClass} value={hashtagMode} onChange={(e) => setHashtagMode(e.target.value as typeof hashtagMode)} style={{ cursor: "pointer" }}>
              {HASHTAG_MODES.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span className="block text-foreground mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Emoji density</span>
            <select className={inputClass} value={emojiId} onChange={(e) => setEmojiId(e.target.value as typeof emojiId)} style={{ cursor: "pointer" }}>
              {EMOJI_DENSITY.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {contentType === "blog" && (
          <div className="mt-3">
            <span className="block text-foreground mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>SEO keywords</span>
            <input
              className={inputClass}
              placeholder="comma separated, e.g. AI governance, LLM security"
              value={seoKeywords}
              onChange={(e) => setSeoKeywords(e.target.value)}
            />
          </div>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
          className="w-full mt-4 py-3 px-4 rounded-[var(--radius-button)] border-2 border-primary bg-primary text-primary-foreground font-bold cursor-pointer flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50"
          style={{ fontSize: "var(--text-base)" }}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? "Generating…" : "Generate content"}
        </button>
      </div>
    </div>
  );
}
