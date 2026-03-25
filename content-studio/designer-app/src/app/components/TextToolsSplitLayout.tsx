import type { ReactNode } from "react";

/** Reliable two-pane layout for Content writer / Researcher (no CSS grid + fragment quirks). */
export function TextToolsSplitLayout({
  sidebar,
  main,
}: {
  sidebar: ReactNode;
  main: ReactNode;
}) {
  const h = "calc(100dvh - 120px)";
  return (
    <div
      className="flex w-full flex-col lg:flex-row lg:items-stretch"
      style={{ minHeight: h }}
    >
      <aside
        className="flex w-full shrink-0 flex-col border-b border-border lg:w-[min(440px,42vw)] lg:max-w-[440px] lg:border-b-0 lg:border-r"
        style={{ maxHeight: h }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">{sidebar}</div>
      </aside>
      <section
        className="flex min-h-[300px] w-full min-w-0 flex-1 flex-col overflow-hidden border-border bg-card lg:border-l"
        style={{ maxHeight: h }}
      >
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">{main}</div>
      </section>
    </div>
  );
}
