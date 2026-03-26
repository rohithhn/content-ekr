import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, Check, Sun, Moon, Sparkles, BookOpen, PenLine, Newspaper, LayoutTemplate } from "lucide-react";
import type { AppMode } from "@/app/types/appMode";
import {
  ENKRYPT_ANTHROPIC_CHAT_MODEL,
  ENKRYPT_GEMINI_CHAT_MODEL,
  ENKRYPT_OPENAI_CHAT_MODEL,
  ENKRYPT_OPENAI_FAST_MODEL,
} from "@/app/utils/llmText";
import svgPaths from "../../imports/svg-sxifsdxhhb";
import imgAvatar from "@/assets/placeholder-theme.svg";
import enkryptLogo from "@/assets/enkrypt-logo.png";

interface HeaderProps {
  provider: "openai" | "gemini";
  setProvider: (p: "openai" | "gemini") => void;
  apiKeyRaw: string;
  setApiKeyRaw: (k: string) => void;
  /** Optional: Claude writes the structured visual brief; OpenAI/Gemini still render the image */
  anthropicKeyRaw?: string;
  setAnthropicKeyRaw?: (k: string) => void;
  mode: AppMode;
  setMode: (m: AppMode) => void;
  /** Content Studio iframe — only designer tools, no General/Blog/Writer/Researcher */
  embed?: boolean;
}

const ALL_MODE_TABS = [
  { id: "general" as const, label: "General", Icon: Sparkles },
  { id: "blog" as const, label: "Blog", Icon: BookOpen },
  { id: "contentWriter" as const, label: "Content writer", Icon: PenLine },
  { id: "researcher" as const, label: "Researcher", Icon: Newspaper },
  { id: "designer" as const, label: "Designer", Icon: LayoutTemplate },
] as const;

export function Header({
  provider,
  setProvider,
  apiKeyRaw,
  setApiKeyRaw,
  anthropicKeyRaw = "",
  setAnthropicKeyRaw,
  mode,
  setMode,
  embed = false,
}: HeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  /* ── Dark mode ── */
  const [dark, setDark] = useState(() => {
    try {
      const stored = localStorage.getItem("enkrypt-theme");
      if (stored === "dark") return true;
      if (stored === "light") return false;
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    try { localStorage.setItem("enkrypt-theme", dark ? "dark" : "light"); } catch {}
  }, [dark]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  const handleSave = () => {
    try {
      localStorage.setItem("enkrypt-api-provider", provider);
      localStorage.setItem("enkrypt-api-key", apiKeyRaw);
      if (setAnthropicKeyRaw) {
        localStorage.setItem("enkrypt-anthropic-key", anthropicKeyRaw);
      }
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const apiConfigured = apiKeyRaw.replace(/[^\x20-\x7E]/g, "").trim().length > 0;

  /* Content Studio overlay: parent supplies chrome + close; no in-app marketing header */
  if (embed) return null;

  return (
    <header className="bg-card border-b border-border">
      {/* Main header row */}
      <div className="flex items-center justify-between px-[32px] h-[64px]">
        {/* ── Left: Logo ── */}
        <div className="flex items-center shrink-0">
          <img
            src={enkryptLogo}
            alt="Enkrypt AI"
            className="h-[32px] object-contain"
          />
        </div>

        {/* ── Center: mode tabs ── */}
        <nav className="flex flex-wrap items-center justify-center gap-[4px] bg-muted rounded-[var(--radius)] p-[4px] max-w-[min(100%,720px)]">
          {(embed ? ALL_MODE_TABS.filter((t) => t.id === "designer") : [...ALL_MODE_TABS]).map(({ id, label, Icon }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className="flex items-center gap-[6px] px-[12px] sm:px-[14px] py-[6px] rounded-[var(--radius-utility)] cursor-pointer transition-all"
                style={{
                  border: "none",
                  fontSize: "var(--text-sm)",
                  fontWeight: active ? 600 : ("var(--font-weight-normal)" as any),
                  background: active ? "var(--card)" : "transparent",
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  boxShadow: active ? "var(--elevation-sm)" : "none",
                }}
              >
                <Icon className="w-[14px] h-[14px] shrink-0" />
                <span className="whitespace-nowrap">{label}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Right: Actions ── */}
        <div className="flex gap-[2px] items-center">
          {/* API status pill */}
          <div
            className="flex items-center gap-[6px] px-[10px] py-[4px] mr-[4px] rounded-[9999px] bg-muted max-w-[min(100vw-24rem,280px)]"
            title={
              apiConfigured
                ? provider === "openai"
                  ? `OpenAI chat: ${ENKRYPT_OPENAI_CHAT_MODEL}`
                  : `Gemini: ${ENKRYPT_GEMINI_CHAT_MODEL}`
                : "Add an API key in Settings"
            }
          >
            <div
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{
                background: apiConfigured ? "var(--chart-1)" : "var(--destructive)",
              }}
            />
            <span
              className="text-muted-foreground whitespace-nowrap flex items-center gap-[6px] min-w-0"
              style={{ fontSize: "var(--text-xs)", fontWeight: "var(--font-weight-medium)" as any }}
            >
              {apiConfigured ? (
                <>
                  <span className="shrink-0">{provider === "openai" ? "OpenAI" : "Gemini"}</span>
                  <span
                    className="text-foreground/80 font-mono truncate"
                    style={{ fontSize: "var(--text-2xs)", fontWeight: 600 }}
                  >
                    {provider === "openai" ? ENKRYPT_OPENAI_CHAT_MODEL : ENKRYPT_GEMINI_CHAT_MODEL}
                  </span>
                </>
              ) : (
                "No API Key"
              )}
            </span>
          </div>

          {/* Dark/Light toggle */}
          <button
            onClick={() => setDark(!dark)}
            className="flex items-center justify-center p-[8px] rounded-[var(--radius-utility)] w-[40px] h-[40px] cursor-pointer hover:bg-muted transition-colors"
            style={{ border: "none", background: "transparent" }}
            title={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? (
              <Sun className="w-[20px] h-[20px] text-muted-foreground" />
            ) : (
              <Moon className="w-[20px] h-[20px] text-muted-foreground" />
            )}
          </button>

          {/* Settings gear (from Figma SVG) */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setSettingsOpen(!settingsOpen)}
              className="flex items-center justify-center p-[8px] rounded-[var(--radius-utility)] w-[40px] h-[40px] cursor-pointer hover:bg-muted transition-colors"
              style={{
                border: "none",
                background: settingsOpen ? "var(--muted)" : "transparent",
              }}
              title="API Settings"
            >
              <div className="overflow-clip relative shrink-0 size-[20px]">
                <div className="absolute inset-[8.33%]">
                  <div className="absolute inset-[-5%]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.3333 18.3333">
                      <g>
                        <path d={svgPaths.p32a34900} stroke="var(--muted-foreground)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.p1d320d00} stroke="var(--muted-foreground)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </g>
                    </svg>
                  </div>
                </div>
              </div>
            </button>

            {/* Settings dropdown */}
            {settingsOpen && (
              <div
                className="absolute right-0 top-full mt-2 bg-card border border-border rounded-[var(--radius-card)] overflow-hidden z-50"
                style={{
                  width: 320,
                  boxShadow: "var(--elevation-sm)",
                }}
              >
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted">
                  <div className="overflow-clip relative shrink-0 size-[16px]">
                    <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 18.3333 18.3333">
                      <g>
                        <path d={svgPaths.p32a34900} stroke="var(--primary)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                        <path d={svgPaths.p1d320d00} stroke="var(--primary)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                      </g>
                    </svg>
                  </div>
                  <span
                    className="text-card-foreground"
                    style={{ fontWeight: 700, fontSize: "var(--text-base)" }}
                  >
                    API Configuration
                  </span>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <label
                      className="text-card-foreground block mb-1.5"
                      style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)" as any }}
                    >
                      Provider
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(["openai", "gemini"] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setProvider(p)}
                          className="py-2 px-3 rounded-[var(--radius)] border-2 cursor-pointer transition-all"
                          style={{
                            fontSize: "var(--text-sm)",
                            fontWeight: provider === p ? 600 : "var(--font-weight-normal)" as any,
                            background: provider === p ? "var(--primary)" : "var(--card)",
                            color: provider === p ? "var(--primary-foreground)" : "var(--card-foreground)",
                            borderColor: provider === p ? "var(--primary)" : "var(--border)",
                          }}
                        >
                          {p === "openai" ? "OpenAI" : "Gemini"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-muted-foreground"
                    style={{ fontSize: "var(--text-xs)", lineHeight: 1.5 }}
                  >
                    <span className="text-foreground font-semibold block mb-1">Latest models</span>
                    OpenAI main chat uses the{" "}
                    <span className="text-foreground font-mono">{ENKRYPT_OPENAI_CHAT_MODEL}</span>{" "}
                    alias (OpenAI retargets it to their current ChatGPT-class snapshot). Lighter
                    OpenAI calls use{" "}
                    <span className="text-foreground font-mono">{ENKRYPT_OPENAI_FAST_MODEL}</span>.
                    Gemini uses{" "}
                    <span className="text-foreground font-mono">{ENKRYPT_GEMINI_CHAT_MODEL}</span>.
                    The header pill shows the chat model for your selected provider. Optional Claude (
                    <span className="text-foreground font-mono">{ENKRYPT_ANTHROPIC_CHAT_MODEL}</span>
                    ) below runs the <strong className="text-foreground">visual brief</strong> step
                    (visual-designer-content-flow); the image API still uses OpenAI or Gemini.
                  </div>

                  <div>
                    <label
                      className="text-card-foreground block mb-1.5"
                      style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)" as any }}
                    >
                      API Key
                    </label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        placeholder={provider === "openai" ? "sk-..." : "AIza..."}
                        value={apiKeyRaw}
                        onChange={(e) => setApiKeyRaw(e.target.value)}
                        className="w-full px-3 py-2 pr-10 rounded-[var(--radius)] border border-border bg-input-background text-foreground"
                        style={{ fontSize: "var(--text-sm)", outline: "none" }}
                      />
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-pointer rounded-[var(--radius-utility)] hover:bg-muted transition-colors"
                        style={{ border: "none", background: "transparent" }}
                        title={showKey ? "Hide" : "Show"}
                      >
                        {showKey
                          ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                          : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  {setAnthropicKeyRaw ? (
                    <div>
                      <label
                        className="text-card-foreground block mb-1.5"
                        style={{ fontSize: "var(--text-sm)", fontWeight: "var(--font-weight-medium)" as any }}
                      >
                        Anthropic API key (optional — visual brief only)
                      </label>
                      <p
                        className="text-muted-foreground mb-2"
                        style={{ fontSize: "var(--text-2xs)", lineHeight: 1.45 }}
                      >
                        When set, Claude builds the 7-field VISUAL BRIEF merged into the image prompt.
                        Image pixels still use your OpenAI or Gemini key above.
                      </p>
                      <div className="relative">
                        <input
                          type={showAnthropicKey ? "text" : "password"}
                          placeholder="sk-ant-..."
                          value={anthropicKeyRaw}
                          onChange={(e) => setAnthropicKeyRaw(e.target.value)}
                          className="w-full px-3 py-2 pr-10 rounded-[var(--radius)] border border-border bg-input-background text-foreground"
                          style={{ fontSize: "var(--text-sm)", outline: "none" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center cursor-pointer rounded-[var(--radius-utility)] hover:bg-muted transition-colors"
                          style={{ border: "none", background: "transparent" }}
                          title={showAnthropicKey ? "Hide" : "Show"}
                        >
                          {showAnthropicKey ? (
                            <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                          ) : (
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <button
                    onClick={handleSave}
                    className="w-full py-2 px-3 rounded-[var(--radius-button)] bg-primary text-primary-foreground cursor-pointer transition-all hover:opacity-90 flex items-center justify-center gap-1.5"
                    style={{ fontWeight: 600, fontSize: "var(--text-sm)", border: "none" }}
                  >
                    {saved ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Saved!
                      </>
                    ) : (
                      "Save keys"
                    )}
                  </button>

                  <div
                    className="bg-warning border border-warning rounded-[var(--radius)] p-2"
                    style={{ fontSize: "var(--text-sm)" }}
                  >
                    <span className="text-warning-foreground">
                      Key is stored locally in your browser only.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notification bell (from Figma) */}
          <button
            className="flex items-center justify-center p-[8px] rounded-[var(--radius-utility)] w-[40px] h-[40px] cursor-pointer hover:bg-muted transition-colors"
            style={{ border: "none", background: "transparent" }}
            title="Notifications"
          >
            <div className="overflow-clip relative shrink-0 size-[20px]">
              <div className="absolute inset-[8.33%_13.59%]">
                <div className="absolute inset-[-5%_-5.72%]">
                  <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.2317 18.3333">
                    <path d={svgPaths.p232d0100} stroke="var(--muted-foreground)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.66667" />
                  </svg>
                </div>
              </div>
            </div>
          </button>

          {/* Avatar (from Figma) */}
          <button
            className="flex flex-col items-start shrink-0 cursor-pointer"
            style={{ border: "none", background: "transparent" }}
          >
            <div className="pointer-events-none relative rounded-[9999px] shrink-0 size-[40px]">
              <img
                alt="User avatar"
                className="absolute inset-0 max-w-none object-cover rounded-[9999px] size-full"
                src={imgAvatar}
              />
              <div
                aria-hidden="true"
                className="absolute border border-[rgba(0,0,0,0.08)] border-solid inset-0 rounded-[9999px]"
              />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}