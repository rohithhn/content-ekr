import { useState, useRef, useCallback, useEffect } from "react";
import { X, Check, RotateCcw, Crop, Undo2 } from "lucide-react";

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CropModalProps {
  imageSrc: string;
  originalSrc?: string;
  onApply: (croppedDataUrl: string) => void;
  onResetToOriginal?: () => void;
  onClose: () => void;
}

const PRESETS = [
  { label: "Free", ratio: 0 },
  { label: "1:1", ratio: 1 },
  { label: "16:9", ratio: 16 / 9 },
  { label: "9:16", ratio: 9 / 16 },
  { label: "4:5", ratio: 4 / 5 },
  { label: "4:3", ratio: 4 / 3 },
];

const HANDLE_SIZE = 10;

type DragMode =
  | "move"
  | "nw" | "ne" | "sw" | "se"
  | "n" | "s" | "e" | "w"
  | null;

export function CropModal({ imageSrc, originalSrc, onApply, onResetToOriginal, onClose }: CropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [activePreset, setActivePreset] = useState(0);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStart = useRef({ mx: 0, my: 0, crop: { x: 0, y: 0, w: 0, h: 0 } });
  const [currentSrc, setCurrentSrc] = useState(imageSrc);

  const hasOriginal = !!originalSrc && originalSrc !== imageSrc;
  const selectedRatio = PRESETS[activePreset].ratio;

  const fitImageToContainer = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return;
    const img = imgRef.current;
    const cRect = containerRef.current.getBoundingClientRect();
    const maxW = cRect.width - 32;
    const maxH = cRect.height - 32;
    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const dw = Math.round(img.naturalWidth * scale);
    const dh = Math.round(img.naturalHeight * scale);
    setDisplaySize({ w: dw, h: dh });
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
    setCrop({ x: 0, y: 0, w: dw, h: dh });
  }, []);

  const handleImgLoad = useCallback(() => {
    setImgLoaded(true);
    fitImageToContainer();
  }, [fitImageToContainer]);

  useEffect(() => {
    if (imgLoaded) fitImageToContainer();
  }, [imgLoaded, fitImageToContainer]);

  const constrainCrop = useCallback((c: CropRect, ratio: number, anchor: string): CropRect => {
    if (ratio === 0) return c;
    let { x, y, w, h } = c;
    if (anchor.includes("e") || anchor.includes("w") || anchor === "move") {
      h = w / ratio;
    } else {
      w = h * ratio;
    }
    if (x + w > displaySize.w) { w = displaySize.w - x; h = w / ratio; }
    if (y + h > displaySize.h) { h = displaySize.h - y; w = h * ratio; }
    if (x < 0) { x = 0; }
    if (y < 0) { y = 0; }
    return { x, y, w: Math.max(20, w), h: Math.max(20, h) };
  }, [displaySize]);

  const handlePreset = (idx: number) => {
    setActivePreset(idx);
    const ratio = PRESETS[idx].ratio;
    if (ratio === 0) {
      // "Free" preset — reset crop to full image
      setCrop({ x: 0, y: 0, w: displaySize.w, h: displaySize.h });
      return;
    }
    let w = displaySize.w;
    let h = w / ratio;
    if (h > displaySize.h) {
      h = displaySize.h;
      w = h * ratio;
    }
    const x = (displaySize.w - w) / 2;
    const y = (displaySize.h - h) / 2;
    setCrop({ x, y, w, h });
  };

  const resetCrop = () => {
    setCrop({ x: 0, y: 0, w: displaySize.w, h: displaySize.h });
    setActivePreset(0);
  };

  const resetToOriginal = () => {
    if (originalSrc && originalSrc !== currentSrc) {
      setCurrentSrc(originalSrc);
      setImgLoaded(false);
      setActivePreset(0);
    } else {
      resetCrop();
    }
  };

  const handleMouseDown = (mode: DragMode) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragMode(mode);
    dragStart.current = { mx: e.clientX, my: e.clientY, crop: { ...crop } };
  };

  useEffect(() => {
    if (!dragMode) return;
    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      const sc = dragStart.current.crop;
      let newCrop = { ...sc };

      if (dragMode === "move") {
        newCrop.x = Math.max(0, Math.min(sc.x + dx, displaySize.w - sc.w));
        newCrop.y = Math.max(0, Math.min(sc.y + dy, displaySize.h - sc.h));
      } else {
        if (dragMode.includes("w")) {
          const nx = Math.max(0, sc.x + dx);
          newCrop.w = sc.w - (nx - sc.x);
          newCrop.x = nx;
        }
        if (dragMode.includes("e")) {
          newCrop.w = Math.min(sc.w + dx, displaySize.w - sc.x);
        }
        if (dragMode.includes("n")) {
          const ny = Math.max(0, sc.y + dy);
          newCrop.h = sc.h - (ny - sc.y);
          newCrop.y = ny;
        }
        if (dragMode.includes("s")) {
          newCrop.h = Math.min(sc.h + dy, displaySize.h - sc.y);
        }
        newCrop.w = Math.max(30, newCrop.w);
        newCrop.h = Math.max(30, newCrop.h);
        if (selectedRatio > 0) {
          newCrop = constrainCrop(newCrop, selectedRatio, dragMode);
        }
      }
      setCrop(newCrop);
    };
    const handleUp = () => setDragMode(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragMode, displaySize, selectedRatio, constrainCrop]);

  const applyCrop = () => {
    if (!imgRef.current) return;
    const scaleX = naturalSize.w / displaySize.w;
    const scaleY = naturalSize.h / displaySize.h;
    const sx = Math.round(crop.x * scaleX);
    const sy = Math.round(crop.y * scaleY);
    const sw = Math.round(crop.w * scaleX);
    const sh = Math.round(crop.h * scaleY);

    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, sw, sh);
    onApply(canvas.toDataURL("image/png"));
  };

  const handleStyle: React.CSSProperties = {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    background: "var(--primary)",
    border: "2px solid var(--primary-foreground)",
    borderRadius: "2px",
    zIndex: 10,
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="bg-card rounded-[var(--radius-card)] border border-border flex flex-col" style={{ width: "min(90vw, 800px)", maxHeight: "90vh", boxShadow: "var(--elevation-sm)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Crop className="w-4 h-4 text-primary" />
            <span className="text-foreground" style={{ fontWeight: 700, fontSize: "var(--text-base)" }}>Crop Image</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer bg-transparent border-none p-1 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset ratio bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border overflow-x-auto">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => handlePreset(i)}
              className="px-3 py-1.5 rounded-[var(--radius-utility)] cursor-pointer border-2 transition-all whitespace-nowrap"
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: activePreset === i ? 700 : 500,
                background: activePreset === i ? "var(--primary)" : "transparent",
                color: activePreset === i ? "var(--primary-foreground)" : "var(--foreground)",
                borderColor: activePreset === i ? "var(--primary)" : "var(--border)",
              }}
            >
              {p.label}
            </button>
          ))}
          <div className="flex-1" />
          {hasOriginal && (
            <button
              onClick={resetToOriginal}
              className="px-3 py-1.5 rounded-[var(--radius-utility)] cursor-pointer border-2 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 transition-all flex items-center gap-1"
              style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}
            >
              <Undo2 className="w-3 h-3" /> Original
            </button>
          )}
          <button
            onClick={resetCrop}
            className="px-3 py-1.5 rounded-[var(--radius-utility)] cursor-pointer border-2 border-border bg-transparent text-muted-foreground hover:text-foreground transition-all flex items-center gap-1"
            style={{ fontSize: "var(--text-sm)", fontWeight: 500 }}
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        {/* Crop area */}
        <div
          ref={containerRef}
          className="flex-1 flex items-center justify-center p-4 bg-muted overflow-hidden"
          style={{ minHeight: 300 }}
        >
          <img
            ref={imgRef}
            src={currentSrc}
            alt=""
            onLoad={handleImgLoad}
            className="hidden"
          />

          {imgLoaded && displaySize.w > 0 && (
            <div
              id="crop-area"
              className="relative"
              style={{ width: displaySize.w, height: displaySize.h }}
            >
              <img
                src={currentSrc}
                alt="Crop preview"
                className="absolute inset-0 w-full h-full select-none pointer-events-none"
                draggable={false}
                style={{ objectFit: "fill" }}
              />

              {/* Dark overlay outside crop */}
              <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
                <div className="absolute" style={{ left: 0, top: 0, width: "100%", height: crop.y, background: "rgba(0,0,0,0.55)" }} />
                <div className="absolute" style={{ left: 0, top: crop.y + crop.h, width: "100%", height: displaySize.h - crop.y - crop.h, background: "rgba(0,0,0,0.55)" }} />
                <div className="absolute" style={{ left: 0, top: crop.y, width: crop.x, height: crop.h, background: "rgba(0,0,0,0.55)" }} />
                <div className="absolute" style={{ left: crop.x + crop.w, top: crop.y, width: displaySize.w - crop.x - crop.w, height: crop.h, background: "rgba(0,0,0,0.55)" }} />
              </div>

              {/* Crop selection border + grid */}
              <div
                className="absolute"
                style={{
                  left: crop.x,
                  top: crop.y,
                  width: crop.w,
                  height: crop.h,
                  border: "2px solid var(--primary)",
                  zIndex: 6,
                  cursor: "move",
                }}
                onMouseDown={handleMouseDown("move")}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ opacity: dragMode ? 0.6 : 0, transition: "opacity 150ms" }}>
                  {[1, 2].map((i) => (
                    <div key={`h${i}`} className="absolute w-full" style={{ top: `${(i / 3) * 100}%`, height: 1, background: "var(--primary-foreground)", opacity: 0.5 }} />
                  ))}
                  {[1, 2].map((i) => (
                    <div key={`v${i}`} className="absolute h-full" style={{ left: `${(i / 3) * 100}%`, width: 1, background: "var(--primary-foreground)", opacity: 0.5 }} />
                  ))}
                </div>
              </div>

              {/* Resize handles */}
              {([
                { mode: "nw" as DragMode, style: { left: crop.x - HANDLE_SIZE / 2, top: crop.y - HANDLE_SIZE / 2, cursor: "nwse-resize" } },
                { mode: "ne" as DragMode, style: { left: crop.x + crop.w - HANDLE_SIZE / 2, top: crop.y - HANDLE_SIZE / 2, cursor: "nesw-resize" } },
                { mode: "sw" as DragMode, style: { left: crop.x - HANDLE_SIZE / 2, top: crop.y + crop.h - HANDLE_SIZE / 2, cursor: "nesw-resize" } },
                { mode: "se" as DragMode, style: { left: crop.x + crop.w - HANDLE_SIZE / 2, top: crop.y + crop.h - HANDLE_SIZE / 2, cursor: "nwse-resize" } },
                { mode: "n" as DragMode, style: { left: crop.x + crop.w / 2 - HANDLE_SIZE / 2, top: crop.y - HANDLE_SIZE / 2, cursor: "ns-resize" } },
                { mode: "s" as DragMode, style: { left: crop.x + crop.w / 2 - HANDLE_SIZE / 2, top: crop.y + crop.h - HANDLE_SIZE / 2, cursor: "ns-resize" } },
                { mode: "w" as DragMode, style: { left: crop.x - HANDLE_SIZE / 2, top: crop.y + crop.h / 2 - HANDLE_SIZE / 2, cursor: "ew-resize" } },
                { mode: "e" as DragMode, style: { left: crop.x + crop.w - HANDLE_SIZE / 2, top: crop.y + crop.h / 2 - HANDLE_SIZE / 2, cursor: "ew-resize" } },
              ]).map((h) => (
                <div
                  key={h.mode}
                  style={{ ...handleStyle, ...h.style }}
                  onMouseDown={handleMouseDown(h.mode)}
                />
              ))}

              {/* Dimension label */}
              <div
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  left: crop.x,
                  top: crop.y + crop.h + 6,
                  width: crop.w,
                  zIndex: 10,
                }}
              >
                <span
                  className="px-2 py-0.5 rounded-[var(--radius-utility)]"
                  style={{
                    background: "var(--primary)",
                    color: "var(--primary-foreground)",
                    fontSize: "var(--text-2xs)",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {Math.round(crop.w * (naturalSize.w / displaySize.w))} x {Math.round(crop.h * (naturalSize.h / displaySize.h))}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div>
            {hasOriginal && (
              <button
                onClick={() => { if (onResetToOriginal) { onResetToOriginal(); onClose(); } }}
                className="px-4 py-2.5 rounded-[var(--radius-button)] border-2 border-destructive/30 bg-transparent text-destructive cursor-pointer transition-all hover:bg-destructive/5 flex items-center gap-1.5"
                style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}
              >
                <Undo2 className="w-4 h-4" /> Restore Original
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-[var(--radius-button)] border-2 border-border bg-transparent text-foreground cursor-pointer transition-all hover:bg-muted"
              style={{ fontWeight: 600, fontSize: "var(--text-sm)" }}
            >
              Cancel
            </button>
            <button
              onClick={applyCrop}
              className="px-5 py-2.5 rounded-[var(--radius-button)] border-2 border-primary bg-primary text-primary-foreground cursor-pointer transition-all hover:opacity-90 flex items-center gap-1.5"
              style={{ fontWeight: 700, fontSize: "var(--text-sm)", boxShadow: "var(--elevation-sm)" }}
            >
              <Check className="w-4 h-4" /> Apply Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}