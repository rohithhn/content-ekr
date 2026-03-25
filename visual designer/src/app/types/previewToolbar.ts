/** Live API registered from LeftPanel so PreviewPanel can render crop/edit/nav above Download. */
export interface PreviewToolbarApi {
  mode: "general" | "blog";
  /** Show toolbar (generated image(s) ready, not mid-generate) */
  show: boolean;
  /**
   * General: show Versions strip only when user picked 2+ “Variations per Template” in Output.
   * Blog: always true when toolbar is shown (section carousel).
   */
  showVersionNav: boolean;
  /** Multi-image batch in progress: done = images ready, total = expected count */
  visualBatch: { done: number; total: number } | null;
  canVersionPrev: boolean;
  canVersionNext: boolean;
  /** When false, preview column won’t bind ←/→ (e.g. blog slideshow modal uses them) */
  arrowHotkeysActive: boolean;
  navCount: number;
  /** 1-based index for “2 / 5” label */
  navLabelIndex: number;
  goPrev: () => void;
  goNext: () => void;
  goToIndex: (i: number) => void;
  thumbnailSrcs: string[];
  crop: {
    isOpen: boolean;
    open: () => void;
    close: () => void;
    imageSrc: string | null;
    originalSrc?: string;
    onApply: (dataUrl: string) => void;
    onResetOriginal: () => void;
  };
  edit: {
    prompt: string;
    setPrompt: (s: string) => void;
    apply: () => void;
    loading: boolean;
    sectionHint?: string;
  };
}
