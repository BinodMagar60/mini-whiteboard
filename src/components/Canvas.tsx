import { useRef, useEffect, useCallback } from "react";


import rough from "roughjs";
import { getElementBounds, getHandlePositions, HANDLE_SIZE } from "../hooks/useSelection";
import type { WhiteboardElement } from "../types/whiteboard";

// Global image cache for rendering images on canvas
export const imageCache = new Map<string, HTMLImageElement>();

// Preload image into cache if not already present
function ensureImageCached(el: WhiteboardElement): HTMLImageElement | null {
  if (el.type !== "image" || !el.imageSrc) return null;
  if (imageCache.has(el.id)) return imageCache.get(el.id)!;
  const img = new Image();
  img.src = el.imageSrc;
  img.onload = () => imageCache.set(el.id, img);
  return null;
}

interface CanvasProps {
  elements: WhiteboardElement[];
  offset: Point;
  scale: number;
  selectedId: string | null;
  onMouseDown: (x: number, y: number) => void;
  onMouseMove: (x: number, y: number) => void;
  onMouseUp: () => void;
  onDoubleClick: (x: number, y: number) => void;
  onWheel: (e: React.WheelEvent) => void;
  cursor: string;
}

export function Canvas({ elements, offset, scale, selectedId, onMouseDown, onMouseMove, onMouseUp, onDoubleClick, onWheel, cursor }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const onWheelRef = useRef(onWheel);
  onWheelRef.current = onWheel;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      onWheelRef.current(e as unknown as React.WheelEvent);
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

    // Plain background — no grid

    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const rc = rough.canvas(canvas);
    elements.forEach(el => drawElement(ctx, el, rc));

    // Draw selection
    if (selectedId) {
      const selectedEl = elements.find(e => e.id === selectedId);
      if (selectedEl) {
        drawSelection(ctx, selectedEl);
      }
    }

    ctx.restore();
  }, [elements, offset, scale, selectedId]);

  useEffect(() => {
    const render = () => {
      draw();
      animRef.current = requestAnimationFrame(render);
    };
    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  useEffect(() => {
    const handleResize = () => draw();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [draw]);

  const getCoords = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full absolute inset-0"
      style={{ cursor }}
      onMouseDown={e => { const { x, y } = getCoords(e); onMouseDown(x, y); }}
      onMouseMove={e => { const { x, y } = getCoords(e); onMouseMove(x, y); }}
      onMouseUp={onMouseUp}
      onDoubleClick={e => { const { x, y } = getCoords(e); onDoubleClick(x, y); }}
      onMouseLeave={onMouseUp}
    />
  );
}

function drawSelection(ctx: CanvasRenderingContext2D, el: WhiteboardElement) {
  const bounds = getElementBounds(el);
  const pad = 6;

  ctx.save();
  ctx.strokeStyle = "hsl(217, 91%, 60%)";
  ctx.lineWidth = 1.5;

  if (el.type === "text") {
    // Plain solid border for text, no resize handles
    ctx.strokeRect(bounds.x - pad, bounds.y - pad, bounds.w + pad * 2, bounds.h + pad * 2);
  } else {
    // Dashed bounding box
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(bounds.x - pad, bounds.y - pad, bounds.w + pad * 2, bounds.h + pad * 2);
    ctx.setLineDash([]);

    // Resize handles
    const handles = getHandlePositions({ x: bounds.x - pad, y: bounds.y - pad, w: bounds.w + pad * 2, h: bounds.h + pad * 2 });
    for (const pos of Object.values(handles)) {
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "hsl(217, 91%, 60%)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(pos.x, pos.y, HANDLE_SIZE, HANDLE_SIZE);
      ctx.strokeRect(pos.x, pos.y, HANDLE_SIZE, HANDLE_SIZE);
    }
  }
  ctx.restore();
}

export function drawElement(ctx: CanvasRenderingContext2D, el: WhiteboardElement, rc?: ReturnType<typeof rough.canvas>) {
  ctx.globalAlpha = el.opacity;

  const useRough = el.roughStyle && rc;
  const roughOpts = {
    stroke: el.strokeColor,
    strokeWidth: el.strokeWidth,
    fill: el.fillColor && el.fillColor !== "transparent" ? el.fillColor : undefined,
    fillStyle: "hachure" as const,
    roughness: 1.5,
    bowing: 1,
  };

  if (useRough) {
    // Save/restore to handle the canvas transform for rough
    ctx.save();
  }

  switch (el.type) {
    case "pencil":
      if (el.points.length < 2) break;
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(el.points[0].x, el.points[0].y);
      for (let i = 1; i < el.points.length; i++) {
        const prev = el.points[i - 1];
        const curr = el.points[i];
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      ctx.stroke();
      break;

    case "line":
      if (useRough) {
        rc.line(el.x, el.y, el.x + el.width, el.y + el.height, roughOpts);
      } else {
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(el.x + el.width, el.y + el.height);
        ctx.stroke();
      }
      break;

    case "arrow": {
      const endX = el.x + el.width;
      const endY = el.y + el.height;
      const angle = Math.atan2(el.height, el.width);
      const headLen = 15;
      const minLen = 10;
      const hasLength = Math.hypot(el.width, el.height) > minLen;
      if (useRough) {
        rc.line(el.x, el.y, endX, endY, roughOpts);
        if (hasLength) {
          rc.line(endX, endY, endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6), roughOpts);
          rc.line(endX, endY, endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6), roughOpts);
        }
      } else {
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(el.x, el.y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        if (hasLength) {
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
          ctx.stroke();
        }
      }
      break;
    }

    case "rectangle":
      if (useRough) {
        rc.rectangle(el.x, el.y, el.width, el.height, roughOpts);
      } else {
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        if (el.fillColor && el.fillColor !== "transparent") {
          ctx.fillStyle = el.fillColor;
          ctx.fillRect(el.x, el.y, el.width, el.height);
        }
        ctx.strokeRect(el.x, el.y, el.width, el.height);
      }
      break;

    case "ellipse": {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      if (useRough) {
        rc.ellipse(cx, cy, Math.abs(el.width), Math.abs(el.height), roughOpts);
      } else {
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.abs(el.width / 2), Math.abs(el.height / 2), 0, 0, Math.PI * 2);
        if (el.fillColor && el.fillColor !== "transparent") {
          ctx.fillStyle = el.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      }
      break;
    }

    case "diamond": {
      const cx2 = el.x + el.width / 2;
      const cy2 = el.y + el.height / 2;
      const pts: [number, number][] = [
        [cx2, el.y],
        [el.x + el.width, cy2],
        [cx2, el.y + el.height],
        [el.x, cy2],
      ];
      if (useRough) {
        rc.polygon(pts, roughOpts);
      } else {
        ctx.strokeStyle = el.strokeColor;
        ctx.lineWidth = el.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(cx2, el.y);
        ctx.lineTo(el.x + el.width, cy2);
        ctx.lineTo(cx2, el.y + el.height);
        ctx.lineTo(el.x, cy2);
        ctx.closePath();
        if (el.fillColor && el.fillColor !== "transparent") {
          ctx.fillStyle = el.fillColor;
          ctx.fill();
        }
        ctx.stroke();
      }
      break;
    }

    case "text":
      if (el.text) {
        const fStyle = el.fontStyle === "italic" ? "italic " : "";
        const fWeight = el.fontWeight === "bold" ? "bold " : "";
        const fSize = el.fontSize || 16;
        const fFamily = el.fontFamily || "sans-serif";
        ctx.font = `${fStyle}${fWeight}${fSize}px ${fFamily}`;
        ctx.fillStyle = el.strokeColor;
        ctx.textBaseline = "top";
        const lines = el.text.split("\n");
        lines.forEach((line, i) => {
          ctx.fillText(line, el.x, el.y + i * fSize * 1.3);
        });
        ctx.textBaseline = "alphabetic";
      }
      break;

    case "image": {
      const img = imageCache.get(el.id) || ensureImageCached(el);
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        if (el.crop) {
          // Draw cropped region
          const sx = el.crop.x * img.naturalWidth;
          const sy = el.crop.y * img.naturalHeight;
          const sw = el.crop.w * img.naturalWidth;
          const sh = el.crop.h * img.naturalHeight;
          ctx.drawImage(img, sx, sy, sw, sh, el.x, el.y, el.width, el.height);
        } else {
          ctx.drawImage(img, el.x, el.y, el.width, el.height);
        }
        ctx.restore();
      } else {
        // Placeholder while loading
        ctx.strokeStyle = "#ccc";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(el.x, el.y, el.width, el.height);
        ctx.setLineDash([]);
        ctx.fillStyle = "#999";
        ctx.font = "14px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Loading...", el.x + el.width / 2, el.y + el.height / 2);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      }
      break;
    }
  }

  if (useRough) {
    ctx.restore();
  }

  ctx.globalAlpha = 1;
}
