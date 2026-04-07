import { useRef, useCallback, useEffect, useState } from "react";
import type { CropRect } from "../types/whiteboard";

type CropHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "move";

interface CropOverlayProps {
  imageScreenX: number;
  imageScreenY: number;
  imageScreenW: number;
  imageScreenH: number;
  initialCrop: CropRect;
  onApply: (crop: CropRect) => void;
  onCancel: () => void;
}

const HANDLE_SIZE = 10;

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function CropOverlay({
  imageScreenX,
  imageScreenY,
  imageScreenW,
  imageScreenH,
  initialCrop,
  onApply,
  onCancel,
}: CropOverlayProps) {
  const [crop, setCrop] = useState<CropRect>(initialCrop);
  const dragging = useRef<CropHandle | null>(null);
  const dragStart = useRef<{ mx: number; my: number; crop: CropRect }>({ mx: 0, my: 0, crop: initialCrop });

  // Crop rect in screen pixels relative to image
  const cropPx = {
    x: crop.x * imageScreenW,
    y: crop.y * imageScreenH,
    w: crop.w * imageScreenW,
    h: crop.h * imageScreenH,
  };

  // Absolute screen positions
  const absX = imageScreenX + cropPx.x;
  const absY = imageScreenY + cropPx.y;
  const absW = cropPx.w;
  const absH = cropPx.h;

  const getHandle = useCallback((ex: number, ey: number): CropHandle | null => {
    const hs = HANDLE_SIZE;
    const handles: { key: CropHandle; cx: number; cy: number }[] = [
      { key: "nw", cx: absX, cy: absY },
      { key: "n", cx: absX + absW / 2, cy: absY },
      { key: "ne", cx: absX + absW, cy: absY },
      { key: "e", cx: absX + absW, cy: absY + absH / 2 },
      { key: "se", cx: absX + absW, cy: absY + absH },
      { key: "s", cx: absX + absW / 2, cy: absY + absH },
      { key: "sw", cx: absX, cy: absY + absH },
      { key: "w", cx: absX, cy: absY + absH / 2 },
    ];
    for (const h of handles) {
      if (Math.abs(ex - h.cx) < hs && Math.abs(ey - h.cy) < hs) return h.key;
    }
    if (ex >= absX && ex <= absX + absW && ey >= absY && ey <= absY + absH) return "move";
    return null;
  }, [absX, absY, absW, absH]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const handle = getHandle(e.clientX, e.clientY);
    if (!handle) return;
    dragging.current = handle;
    dragStart.current = { mx: e.clientX, my: e.clientY, crop: { ...crop } };
  }, [getHandle, crop]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStart.current.mx;
      const dy = e.clientY - dragStart.current.my;
      const oc = dragStart.current.crop;
      const relDx = dx / imageScreenW;
      const relDy = dy / imageScreenH;
      const handle = dragging.current;

      let nx = oc.x, ny = oc.y, nw = oc.w, nh = oc.h;

      if (handle === "move") {
        nx = clamp(oc.x + relDx, 0, 1 - oc.w);
        ny = clamp(oc.y + relDy, 0, 1 - oc.h);
      } else {
        if (handle.includes("w")) {
          const newX = clamp(oc.x + relDx, 0, oc.x + oc.w - 0.05);
          nw = oc.w - (newX - oc.x);
          nx = newX;
        }
        if (handle.includes("e")) {
          nw = clamp(oc.w + relDx, 0.05, 1 - oc.x);
        }
        if (handle === "n" || handle === "nw" || handle === "ne") {
          const newY = clamp(oc.y + relDy, 0, oc.y + oc.h - 0.05);
          nh = oc.h - (newY - oc.y);
          ny = newY;
        }
        if (handle === "s" || handle === "sw" || handle === "se") {
          nh = clamp(oc.h + relDy, 0.05, 1 - oc.y);
        }
      }

      setCrop({ x: nx, y: ny, w: nw, h: nh });
    };

    const handleMouseUp = () => {
      dragging.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [imageScreenW, imageScreenH]);

  const handleCursorStyle = (e: React.MouseEvent): string => {
    const h = getHandle(e.clientX, e.clientY);
    if (!h) return "default";
    if (h === "move") return "move";
    const cursors: Record<string, string> = {
      nw: "nwse-resize", ne: "nesw-resize", se: "nwse-resize", sw: "nesw-resize",
      n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
    };
    return cursors[h] || "default";
  };

  // Handle positions for rendering
  const handles: { key: string; x: number; y: number }[] = [
    { key: "nw", x: absX, y: absY },
    { key: "n", x: absX + absW / 2, y: absY },
    { key: "ne", x: absX + absW, y: absY },
    { key: "e", x: absX + absW, y: absY + absH / 2 },
    { key: "se", x: absX + absW, y: absY + absH },
    { key: "s", x: absX + absW / 2, y: absY + absH },
    { key: "sw", x: absX, y: absY + absH },
    { key: "w", x: absX, y: absY + absH / 2 },
  ];

  return (
    <div
      className="absolute inset-0 z-[60]"
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        const el = e.currentTarget;
        el.style.cursor = handleCursorStyle(e);
      }}
    >
      {/* Dimmed overlay outside crop area using 4 rects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top */}
        <div
          className="absolute bg-black/50"
          style={{ left: imageScreenX, top: imageScreenY, width: imageScreenW, height: cropPx.y }}
        />
        {/* Bottom */}
        <div
          className="absolute bg-black/50"
          style={{ left: imageScreenX, top: absY + absH, width: imageScreenW, height: imageScreenH - cropPx.y - cropPx.h }}
        />
        {/* Left */}
        <div
          className="absolute bg-black/50"
          style={{ left: imageScreenX, top: absY, width: cropPx.x, height: absH }}
        />
        {/* Right */}
        <div
          className="absolute bg-black/50"
          style={{ left: absX + absW, top: absY, width: imageScreenW - cropPx.x - cropPx.w, height: absH }}
        />
      </div>

      {/* Crop border */}
      <div
        className="absolute border-2 border-white pointer-events-none"
        style={{ left: absX, top: absY, width: absW, height: absH }}
      >
        {/* Rule of thirds grid */}
        <div className="absolute inset-0">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
        </div>
      </div>

      {/* Handles */}
      {handles.map(h => (
        <div
          key={h.key}
          className="absolute bg-white border-2 border-primary rounded-sm pointer-events-none"
          style={{
            left: h.x - HANDLE_SIZE / 2,
            top: h.y - HANDLE_SIZE / 2,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
          }}
        />
      ))}

      {/* Action buttons */}
      <div
        className="absolute z-[70] flex items-center gap-2"
        style={{ left: absX + absW / 2, top: absY + absH + 16, transform: "translateX(-50%)" }}
      >
        <button
          className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium shadow-lg hover:opacity-90 transition-opacity"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onApply(crop); }}
        >
          Apply
        </button>
        <button
          className="px-3 py-1.5 rounded-md bg-muted text-muted-foreground text-xs font-medium shadow-lg hover:opacity-90 transition-opacity"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
