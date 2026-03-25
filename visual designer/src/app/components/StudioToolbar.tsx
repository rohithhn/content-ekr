import {
  MousePointer2, Type, Square, Circle,
  Undo2, Redo2, Download, Trash2,
  BringToFront, SendToBack, Ungroup,
} from "lucide-react";

interface StudioToolbarProps {
  hasSelection: boolean;
  isGroup: boolean;
  onAddText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onUngroup: () => void;
  onDelete: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onDownload: () => void;
  isExporting: boolean;
}

const BTN = (active = false, danger = false) =>
  `flex items-center justify-center w-9 h-9 rounded-lg border cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none ${
    active
      ? "border-primary bg-primary/10 text-primary"
      : danger
      ? "border-border bg-card text-foreground hover:text-destructive hover:border-destructive/40 hover:bg-destructive/5"
      : "border-border bg-card text-foreground hover:bg-muted hover:border-border/80"
  }`;

const DIVIDER = <div className="w-px h-6 bg-border mx-0.5 shrink-0" />;

export function StudioToolbar({
  hasSelection, isGroup,
  onAddText, onAddRect, onAddCircle,
  onUndo, onRedo, onUngroup,
  onDelete, onBringForward, onSendBackward,
  onDownload, isExporting,
}: StudioToolbarProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 bg-card border border-border rounded-xl shadow-sm flex-wrap">

      {/* Default mode indicator */}
      <button className={BTN(true)} title="Select mode (default)" onClick={() => {}}>
        <MousePointer2 className="w-4 h-4" />
      </button>

      {DIVIDER}

      {/* Add elements */}
      <button className={BTN()} title="Add text" onClick={onAddText}>
        <Type className="w-4 h-4" />
      </button>
      <button className={BTN()} title="Add rectangle / container" onClick={onAddRect}>
        <Square className="w-4 h-4" />
      </button>
      <button className={BTN()} title="Add circle" onClick={onAddCircle}>
        <Circle className="w-4 h-4" />
      </button>

      {DIVIDER}

      {/* History */}
      <button className={BTN()} title="Undo (⌘Z)" onClick={onUndo}>
        <Undo2 className="w-4 h-4" />
      </button>
      <button className={BTN()} title="Redo (⌘⇧Z)" onClick={onRedo}>
        <Redo2 className="w-4 h-4" />
      </button>

      {DIVIDER}

      {/* Selection-dependent */}
      <button
        className={BTN()}
        title="Bring forward"
        onClick={onBringForward}
        disabled={!hasSelection}
      >
        <BringToFront className="w-4 h-4" />
      </button>
      <button
        className={BTN()}
        title="Send backward"
        onClick={onSendBackward}
        disabled={!hasSelection}
      >
        <SendToBack className="w-4 h-4" />
      </button>
      <button
        className={BTN()}
        title="Ungroup selected group"
        onClick={onUngroup}
        disabled={!isGroup}
      >
        <Ungroup className="w-4 h-4" />
      </button>
      <button
        className={BTN(false, true)}
        title="Delete selected"
        onClick={onDelete}
        disabled={!hasSelection}
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {DIVIDER}

      {/* Export */}
      <button
        className={`${BTN()} hover:text-primary hover:border-primary/40`}
        title="Download PNG (composited)"
        onClick={onDownload}
        disabled={isExporting}
      >
        {isExporting ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
