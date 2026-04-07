import { useState, useCallback, useRef } from "react";
import { WhiteboardElement, Point } from "@/types/whiteboard";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLE_SIZE = 8;

export interface SelectionState {
  selectedId: string | null;
  activeHandle: ResizeHandle | null;
}

function getElementBounds(el: WhiteboardElement): { x: number; y: number; w: number; h: number } {
  if (el.type === "pencil" && el.points.length > 0) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    el.points.forEach(p => {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    });
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  if (el.type === "text") {
    const w = el.textWidth || (el.text ? el.text.length * 9.6 : 50);
    const h = el.textHeight || (el.fontSize || 16);
    return { x: el.x, y: el.y, w, h };
  }
  const x = Math.min(el.x, el.x + el.width);
  const y = Math.min(el.y, el.y + el.height);
  return { x, y, w: Math.abs(el.width), h: Math.abs(el.height) };
}

export { getElementBounds };

function getHandlePositions(bounds: { x: number; y: number; w: number; h: number }) {
  const { x, y, w, h } = bounds;
  const hs = HANDLE_SIZE / 2;
  return {
    nw: { x: x - hs, y: y - hs },
    n:  { x: x + w / 2 - hs, y: y - hs },
    ne: { x: x + w - hs, y: y - hs },
    e:  { x: x + w - hs, y: y + h / 2 - hs },
    se: { x: x + w - hs, y: y + h - hs },
    s:  { x: x + w / 2 - hs, y: y + h - hs },
    sw: { x: x - hs, y: y + h - hs },
    w:  { x: x - hs, y: y + h / 2 - hs },
  };
}

export { getHandlePositions, HANDLE_SIZE };

function hitTestHandle(
  canvasPoint: Point,
  bounds: { x: number; y: number; w: number; h: number }
): ResizeHandle | null {
  const handles = getHandlePositions(bounds);
  const threshold = HANDLE_SIZE + 4;
  for (const [key, pos] of Object.entries(handles)) {
    const cx = pos.x + HANDLE_SIZE / 2;
    const cy = pos.y + HANDLE_SIZE / 2;
    if (Math.abs(canvasPoint.x - cx) < threshold / 2 && Math.abs(canvasPoint.y - cy) < threshold / 2) {
      return key as ResizeHandle;
    }
  }
  return null;
}

function isPointInElement(point: Point, el: WhiteboardElement): boolean {
  if (el.type === "pencil") {
    return el.points.some(p => Math.hypot(p.x - point.x, p.y - point.y) < 10);
  }
  if (el.type === "text") {
    const bounds = getElementBounds(el);
    return point.x >= bounds.x - 5 && point.x <= bounds.x + bounds.w + 5 &&
           point.y >= bounds.y - 5 && point.y <= bounds.y + bounds.h + 5;
  }
  const minX = Math.min(el.x, el.x + el.width);
  const maxX = Math.max(el.x, el.x + el.width);
  const minY = Math.min(el.y, el.y + el.height);
  const maxY = Math.max(el.y, el.y + el.height);
  return point.x >= minX - 5 && point.x <= maxX + 5 && point.y >= minY - 5 && point.y <= maxY + 5;
}

export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
  nw: "nwse-resize", n: "ns-resize", ne: "nesw-resize", e: "ew-resize",
  se: "nwse-resize", s: "ns-resize", sw: "nesw-resize", w: "ew-resize",
};

interface UseSelectionProps {
  elements: WhiteboardElement[];
  setElements: React.Dispatch<React.SetStateAction<WhiteboardElement[]>>;
  pushHistory: (elements: WhiteboardElement[]) => void;
  screenToCanvas: (sx: number, sy: number) => Point;
}

export function useSelection({ elements, setElements, pushHistory, screenToCanvas }: UseSelectionProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const activeHandle = useRef<ResizeHandle | null>(null);
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const originalElement = useRef<WhiteboardElement | null>(null);
  const originalBounds = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const deselectAll = useCallback(() => {
    setSelectedId(null);
  }, []);

  const handleSelectMouseDown = useCallback((screenX: number, screenY: number) => {
    const canvasPoint = screenToCanvas(screenX, screenY);

    // Check if clicking a resize handle of selected element (not for text)
    if (selectedId) {
      const selectedEl = elements.find(e => e.id === selectedId);
      if (selectedEl && selectedEl.type !== "text") {
        const bounds = getElementBounds(selectedEl);
        const handle = hitTestHandle(canvasPoint, bounds);
        if (handle) {
          isResizing.current = true;
          activeHandle.current = handle;
          dragStart.current = canvasPoint;
          originalElement.current = { ...selectedEl, points: [...selectedEl.points] };
          originalBounds.current = bounds;
          return;
        }
      }
    }

    // Check if clicking on an element
    const hitElement = [...elements].reverse().find(el => isPointInElement(canvasPoint, el));
    if (hitElement) {
      setSelectedId(hitElement.id);
      isDragging.current = true;
      dragStart.current = canvasPoint;
      originalElement.current = { ...hitElement, points: [...hitElement.points] };
      originalBounds.current = getElementBounds(hitElement);
    } else {
      setSelectedId(null);
    }
  }, [screenToCanvas, elements, selectedId]);

  const handleSelectMouseMove = useCallback((screenX: number, screenY: number) => {
    const canvasPoint = screenToCanvas(screenX, screenY);

    if (isDragging.current && originalElement.current) {
      const dx = canvasPoint.x - dragStart.current.x;
      const dy = canvasPoint.y - dragStart.current.y;
      const orig = originalElement.current;

      setElements(prev => prev.map(el => {
        if (el.id !== orig.id) return el;
        if (orig.type === "pencil") {
          return {
            ...el,
            points: orig.points.map(p => ({ x: p.x + dx, y: p.y + dy })),
            x: orig.x + dx,
            y: orig.y + dy,
          };
        }
        return { ...el, x: orig.x + dx, y: orig.y + dy };
      }));
      return;
    }

    if (isResizing.current && originalElement.current && originalBounds.current && activeHandle.current) {
      const dx = canvasPoint.x - dragStart.current.x;
      const dy = canvasPoint.y - dragStart.current.y;
      const orig = originalElement.current;
      const ob = originalBounds.current;
      const handle = activeHandle.current;

      let newX = ob.x, newY = ob.y, newW = ob.w, newH = ob.h;

      if (handle.includes("w")) { newX = ob.x + dx; newW = ob.w - dx; }
      if (handle.includes("e")) { newW = ob.w + dx; }
      if (handle.includes("n") && handle !== "ne" && handle !== "nw" || handle === "n") { newY = ob.y + dy; newH = ob.h - dy; }
      if (handle === "nw" || handle === "ne") { newY = ob.y + dy; newH = ob.h - dy; }
      if (handle.includes("s")) { newH = ob.h + dy; }

      // Ensure minimum size
      if (Math.abs(newW) < 5) newW = 5 * Math.sign(newW || 1);
      if (Math.abs(newH) < 5) newH = 5 * Math.sign(newH || 1);

      setElements(prev => prev.map(el => {
        if (el.id !== orig.id) return el;
        if (orig.type === "pencil") {
          // Scale pencil points relative to original bounds
          const scaleX = ob.w > 0 ? newW / ob.w : 1;
          const scaleY = ob.h > 0 ? newH / ob.h : 1;
          return {
            ...el,
            points: orig.points.map(p => ({
              x: newX + (p.x - ob.x) * scaleX,
              y: newY + (p.y - ob.y) * scaleY,
            })),
            x: newX,
            y: newY,
          };
        }
        if (orig.type === "text") {
          return { ...el, x: newX, y: newY + 14 };
        }
        // For shapes: need to handle the original sign of width/height
        const origSignW = orig.width >= 0 ? 1 : -1;
        const origSignH = orig.height >= 0 ? 1 : -1;
        return {
          ...el,
          x: newX,
          y: newY,
          width: newW * origSignW,
          height: newH * origSignH,
        };
      }));
      return;
    }
  }, [screenToCanvas, setElements]);

  const handleSelectMouseUp = useCallback(() => {
    if (isDragging.current || isResizing.current) {
      pushHistory([...elements]);
    }
    isDragging.current = false;
    isResizing.current = false;
    activeHandle.current = null;
    originalElement.current = null;
    originalBounds.current = null;
  }, [pushHistory, elements]);

  const getSelectionCursor = useCallback((screenX: number, screenY: number): string | null => {
    const canvasPoint = screenToCanvas(screenX, screenY);
    
    if (selectedId) {
      const selectedEl = elements.find(e => e.id === selectedId);
      if (selectedEl) {
        if (selectedEl.type !== "text") {
          const bounds = getElementBounds(selectedEl);
          const handle = hitTestHandle(canvasPoint, bounds);
          if (handle) return HANDLE_CURSORS[handle];
        }
        if (isPointInElement(canvasPoint, selectedEl)) return "move";
      }
    }

    const hitElement = [...elements].reverse().find(el => isPointInElement(canvasPoint, el));
    if (hitElement) return "move";
    return null;
  }, [screenToCanvas, elements, selectedId]);

  return {
    selectedId,
    setSelectedId,
    deselectAll,
    handleSelectMouseDown,
    handleSelectMouseMove,
    handleSelectMouseUp,
    getSelectionCursor,
  };
}
