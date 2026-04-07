import { useState, useCallback, useRef } from "react";
import type { Tool, WhiteboardElement, Point } from "../types/whiteboard";

const generateId = () => Math.random().toString(36).substring(2, 11);

export function useWhiteboard() {
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [tool, setTool] = useState<Tool>("pencil");
  const [strokeColor, setStrokeColor] = useState("#1e1e1e");
  const [fillColor, setFillColor] = useState("transparent");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(16);
  const [fontWeight, setFontWeight] = useState<"normal" | "bold">("normal");
  const [fontStyle, setFontStyle] = useState<"normal" | "italic">("normal");
  const [fontFamily, setFontFamily] = useState("'Space Grotesk', sans-serif");
  const [roughStyle] = useState(false);
  const [history, setHistory] = useState<WhiteboardElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const isDrawing = useRef(false);
  const currentElement = useRef<WhiteboardElement | null>(null);
  const lastPanPoint = useRef<Point | null>(null);

  const pushHistory = useCallback((newElements: WhiteboardElement[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newElements]);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setElements([...history[newIndex]]);
    }
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setElements([...history[newIndex]]);
    }
  }, [historyIndex, history]);

  const clearCanvas = useCallback(() => {
    setElements([]);
    pushHistory([]);
  }, [pushHistory]);

  const screenToCanvas = useCallback((screenX: number, screenY: number): Point => {
    return {
      x: (screenX - offset.x) / scale,
      y: (screenY - offset.y) / scale,
    };
  }, [offset, scale]);

  const startDrawing = useCallback((screenX: number, screenY: number) => {
    const { x, y } = screenToCanvas(screenX, screenY);

    if (tool === "hand") {
      lastPanPoint.current = { x: screenX, y: screenY };
      isDrawing.current = true;
      return;
    }

    if (tool === "select") return; // handled by useSelection

    if (tool === "eraser") {
      isDrawing.current = true;
      const hitElement = [...elements].reverse().find(el => isPointInElement({ x, y }, el));
      if (hitElement) {
        const newElements = elements.filter(e => e.id !== hitElement.id);
        setElements(newElements);
        pushHistory(newElements);
      }
      return;
    }

    isDrawing.current = true;
    const newElement: WhiteboardElement = {
      id: generateId(),
      type: tool as WhiteboardElement["type"],
      points: tool === "pencil" ? [{ x, y }] : [],
      x,
      y,
      width: 0,
      height: 0,
      strokeColor,
      fillColor,
      strokeWidth,
      opacity,
      roughStyle,
    };
    currentElement.current = newElement;
    setElements(prev => [...prev, newElement]);
  }, [tool, strokeColor, fillColor, strokeWidth, opacity, roughStyle, screenToCanvas, elements, pushHistory]);

  const continueDrawing = useCallback((screenX: number, screenY: number) => {
    if (!isDrawing.current) return;

    if (tool === "hand" && lastPanPoint.current) {
      const dx = screenX - lastPanPoint.current.x;
      const dy = screenY - lastPanPoint.current.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastPanPoint.current = { x: screenX, y: screenY };
      return;
    }

    if (tool === "eraser") {
      const { x, y } = screenToCanvas(screenX, screenY);
      const hitElement = [...elements].reverse().find(el => isPointInElement({ x, y }, el));
      if (hitElement) {
        const newElements = elements.filter(e => e.id !== hitElement.id);
        setElements(newElements);
      }
      return;
    }

    if (!currentElement.current) return;
    const { x, y } = screenToCanvas(screenX, screenY);
    const el = currentElement.current;

    if (el.type === "pencil") {
      el.points.push({ x, y });
      setElements(prev => prev.map(e => e.id === el.id ? { ...el, points: [...el.points] } : e));
    } else {
      el.width = x - el.x;
      el.height = y - el.y;
      setElements(prev => prev.map(e => e.id === el.id ? { ...el } : e));
    }
  }, [tool, screenToCanvas, elements]);

  const stopDrawing = useCallback(() => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    lastPanPoint.current = null;

    if (currentElement.current && tool !== "hand" && tool !== "eraser") {
      pushHistory([...elements]);
    }
    currentElement.current = null;
  }, [tool, elements, pushHistory]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      const newScale = Math.min(Math.max(scale + delta, 0.1), 5);
      setScale(newScale);
    } else {
      setOffset(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY,
      }));
    }
  }, [scale]);

  const addTextElement = useCallback((screenX: number, screenY: number, text: string) => {
    const { x, y } = screenToCanvas(screenX, screenY);
    const newElement: WhiteboardElement = {
      id: generateId(),
      type: "text",
      points: [],
      x,
      y,
      width: 0,
      height: 0,
      strokeColor,
      fillColor: "transparent",
      strokeWidth: 1,
      text,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      opacity,
      roughStyle: false,
    };
    const newElements = [...elements, newElement];
    setElements(newElements);
    pushHistory(newElements);
  }, [screenToCanvas, strokeColor, fontSize, fontWeight, fontStyle, opacity, elements, pushHistory]);

  return {
    elements, setElements, tool, setTool, strokeColor, setStrokeColor,
    fillColor, setFillColor, strokeWidth, setStrokeWidth, opacity, setOpacity,
    fontSize, setFontSize, fontWeight, setFontWeight, fontStyle, setFontStyle,
    fontFamily, setFontFamily,
    startDrawing, continueDrawing, stopDrawing, handleWheel,
    undo, redo, clearCanvas, offset, scale, addTextElement,
    pushHistory, screenToCanvas,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}

function isPointInElement(point: Point, el: WhiteboardElement): boolean {
  if (el.type === "pencil") {
    return el.points.some(p => Math.hypot(p.x - point.x, p.y - point.y) < 10);
  }
  if (el.type === "text") {
    const w = el.textWidth || (el.text ? el.text.length * 9.6 : 50);
    const h = el.textHeight || (el.fontSize || 16);
    return point.x >= el.x - 5 && point.x <= el.x + w + 5 &&
           point.y >= el.y - 5 && point.y <= el.y + h + 5;
  }
  const minX = Math.min(el.x, el.x + el.width);
  const maxX = Math.max(el.x, el.x + el.width);
  const minY = Math.min(el.y, el.y + el.height);
  const maxY = Math.max(el.y, el.y + el.height);
  return point.x >= minX - 5 && point.x <= maxX + 5 && point.y >= minY - 5 && point.y <= maxY + 5;
}
