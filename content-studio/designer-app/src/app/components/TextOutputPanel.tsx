import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";

interface TextOutputPanelProps {
  title: string;
  output: string;
  emptyHint: string;
  /** Extra classes on root (e.g. height in grid layouts). */
  className?: string;
}

export function TextOutputPanel({ title, output, emptyHint, className = "" }: TextOutputPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!output.trim()) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleDownload = () => {
    if (!output.trim()) return;
    const blob = new Blob([output], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `enkrypt-${title.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div
      className={`flex h-full min-h-0 w-full min-w-0 flex-col gap-4 border-0 bg-card p-5 sm:p-6 ${className}`.trim()}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-1 h-7 bg-primary rounded-full shrink-0" />
          <h2 className="text-foreground m-0 truncate" style={{ fontSize: "var(--text-base)", fontWeight: 700 }}>
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!output.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-button)] border-2 border-border bg-card text-foreground text-sm font-semibold cursor-pointer transition-all hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy all"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!output.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-button)] border-2 border-primary bg-primary text-primary-foreground text-sm font-semibold cursor-pointer transition-all hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Download className="w-4 h-4" />
            .md
          </button>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto rounded-[var(--radius-card)] border border-border bg-muted/30 p-4"
        role="region"
        aria-label="Generated text output"
      >
        {output.trim() ? (
          <pre className="m-0 whitespace-pre-wrap break-words text-foreground font-sans" style={{ fontSize: "var(--text-sm)", lineHeight: 1.55 }}>
            {output}
          </pre>
        ) : (
          <p className="text-muted-foreground m-0" style={{ fontSize: "var(--text-sm)", lineHeight: 1.5 }}>
            {emptyHint}
          </p>
        )}
      </div>
    </div>
  );
}
