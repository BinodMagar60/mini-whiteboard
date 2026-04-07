import { useEffect, useCallback, useRef, useState } from "react";
import type { CropRect, Tool, WhiteboardElement } from "./types/whiteboard";
import { useWhiteboard } from "./hooks/useWhiteboard";
import { useSelection } from "./hooks/useSelection";
import { Canvas, drawElement, imageCache } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { StylePanel } from "./components/StylePanel";
import { CropOverlay } from "./components/CropOverlay";
import { Info } from "lucide-react";
import InformationCard from "./components/InformationCard";

function getElementsBounds(elements: WhiteboardElement[]) {
  if (elements.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  elements.forEach(el => {
    if (el.type === "pencil") {
      el.points.forEach(p => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      });
    } else if (el.type === "text") {
      const tw = el.textWidth || 100;
      const th = el.textHeight || (el.fontSize || 16);
      minX = Math.min(minX, el.x); minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + tw); maxY = Math.max(maxY, el.y + th);
    } else {
      const x1 = Math.min(el.x, el.x + el.width), x2 = Math.max(el.x, el.x + el.width);
      const y1 = Math.min(el.y, el.y + el.height), y2 = Math.max(el.y, el.y + el.height);
      minX = Math.min(minX, x1); minY = Math.min(minY, y1);
      maxX = Math.max(maxX, x2); maxY = Math.max(maxY, y2);
    }
  });
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}


const BASE_CURSOR_MAP: Record<Tool, string> = {
  select: "default",
  hand: "grab",
  pencil: "crosshair",
  line: "crosshair",
  arrow: "crosshair",
  rectangle: "crosshair",
  ellipse: "crosshair",
  diamond: "crosshair",
  text: "text",
  eraser: "crosshair",
  image: "default",
};

/*Measure text element dimensions using an offscreen canvas */
function measureTextElement(text: string, fontSize: number, fontWeight: string, fontStyle: string): { width: number; height: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const fStyleStr = fontStyle === "italic" ? "italic " : "";
  const fWeightStr = fontWeight === "bold" ? "bold " : "";
  ctx.font = `${fStyleStr}${fWeightStr}${fontSize}px sans-serif`;
  const lines = text.split("\n");
  const lineHeight = fontSize * 1.3;
  let maxWidth = 0;
  lines.forEach(line => {
    maxWidth = Math.max(maxWidth, ctx.measureText(line).width);
  });
  return { width: maxWidth, height: lines.length * lineHeight };
}

/** Check if a canvas point hits a text element */
function isPointInTextElement(point: { x: number; y: number }, el: WhiteboardElement): boolean {
  if (el.type !== "text" || !el.text) return false;
  const tw = el.textWidth || 100;
  const th = el.textHeight || (el.fontSize || 16);
  const pad = 8;
  return (
    point.x >= el.x - pad &&
    point.x <= el.x + tw + pad &&
    point.y >= el.y - pad &&
    point.y <= el.y + th + pad
  );
}

export default function App() {
  const wb = useWhiteboard();
  const selection = useSelection({
    elements: wb.elements,
    setElements: wb.setElements,
    pushHistory: wb.pushHistory,
    screenToCanvas: wb.screenToCanvas,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const clipboardRef = useRef<WhiteboardElement | null>(null);
  const [dynamicCursor, setDynamicCursor] = useState<string | null>(null);
  const [cropState, setCropState] = useState<{ elementId: string } | null>(null);
  const [helpOpen, setHelpOpen] = useState<boolean>(false)
  // Text editing state
  const [textEditor, setTextEditor] = useState<{
    screenX: number;
    screenY: number;
    canvasX: number;
    canvasY: number;
    editingId: string | null; // null = new text, string = editing existing
    initialText: string;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openTextEditor = useCallback((screenX: number, screenY: number, canvasX: number, canvasY: number, editingId: string | null, initialText: string) => {
    setTextEditor({ screenX, screenY, canvasX, canvasY, editingId, initialText });
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.value = initialText;
        textareaRef.current.focus();
        if (initialText) textareaRef.current.select();
      }
    }, 20);
  }, []);

  const commitText = useCallback(() => {
    if (!textareaRef.current || !textEditor) return;
    const text = textareaRef.current.value;

    if (textEditor.editingId) {
      if (text.trim()) {
        const measured = measureTextElement(text, wb.fontSize, wb.fontWeight, wb.fontStyle);
        const newElements = wb.elements.map(el =>
          el.id === textEditor.editingId
            ? { ...el, text, fontSize: wb.fontSize, fontWeight: wb.fontWeight, fontStyle: wb.fontStyle, strokeColor: wb.strokeColor, textWidth: measured.width, textHeight: measured.height }
            : el
        );
        wb.setElements(newElements);
        wb.pushHistory(newElements);
      } else {
        const newElements = wb.elements.filter(el => el.id !== textEditor.editingId);
        wb.setElements(newElements);
        wb.pushHistory(newElements);
      }
    } else if (text.trim()) {
      // Create new text element
      const measured = measureTextElement(text, wb.fontSize, wb.fontWeight, wb.fontStyle);
      const newElement: WhiteboardElement = {
        id: Math.random().toString(36).substring(2, 11),
        type: "text",
        points: [],
        x: textEditor.canvasX,
        y: textEditor.canvasY,
        width: 0,
        height: 0,
        strokeColor: wb.strokeColor,
        fillColor: "transparent",
        strokeWidth: 1,
        text,
        fontSize: wb.fontSize,
        fontWeight: wb.fontWeight,
        fontStyle: wb.fontStyle,
        textWidth: measured.width,
        textHeight: measured.height,
        opacity: wb.opacity,
        roughStyle: false,
      };
      const newElements = [...wb.elements, newElement];
      wb.setElements(newElements);
      wb.pushHistory(newElements);
    }
    setTextEditor(null);
  }, [textEditor, wb]);

  const handleMouseDown = useCallback((x: number, y: number) => {
    if (wb.tool === "text") {
      // Commit any open editor first
      if (textEditor && textareaRef.current) {
        commitText();
        // Open new editor after commit
        const canvas = wb.screenToCanvas(x, y);
        setTimeout(() => openTextEditor(x, y, canvas.x, canvas.y, null, ""), 20);
        return;
      }
      const canvas = wb.screenToCanvas(x, y);
      openTextEditor(x, y, canvas.x, canvas.y, null, "");
      return;
    }
    if (wb.tool === "select") {
      selection.handleSelectMouseDown(x, y);
      return;
    }
    selection.deselectAll();
    wb.startDrawing(x, y);
  }, [wb, selection, textEditor, commitText, openTextEditor]);

  const handleMouseMove = useCallback((x: number, y: number) => {
    if (wb.tool === "select") {
      selection.handleSelectMouseMove(x, y);
      const cursor = selection.getSelectionCursor(x, y);
      setDynamicCursor(cursor);
      return;
    }
    setDynamicCursor(null);
    wb.continueDrawing(x, y);
  }, [wb, selection]);

  const handleMouseUp = useCallback(() => {
    if (wb.tool === "select") {
      selection.handleSelectMouseUp();
      return;
    }
    wb.stopDrawing();
  }, [wb, selection]);

  const handleDoubleClick = useCallback((x: number, y: number) => {
    const canvasPoint = wb.screenToCanvas(x, y);

    // Check for image double-click → enter crop mode
    const hitImage = [...wb.elements].reverse().find(el => {
      if (el.type !== "image") return false;
      const minX = Math.min(el.x, el.x + el.width);
      const maxX = Math.max(el.x, el.x + el.width);
      const minY = Math.min(el.y, el.y + el.height);
      const maxY = Math.max(el.y, el.y + el.height);
      return canvasPoint.x >= minX && canvasPoint.x <= maxX && canvasPoint.y >= minY && canvasPoint.y <= maxY;
    });
    if (hitImage) {
      setCropState({ elementId: hitImage.id });
      selection.setSelectedId(null);
      return;
    }

    const hitElement = [...wb.elements].reverse().find(el => isPointInTextElement(canvasPoint, el));
    if (hitElement && hitElement.text) {
      if (hitElement.strokeColor) wb.setStrokeColor(hitElement.strokeColor);
      if (hitElement.fontSize) wb.setFontSize(hitElement.fontSize);
      if (hitElement.fontWeight) wb.setFontWeight(hitElement.fontWeight);
      if (hitElement.fontStyle) wb.setFontStyle(hitElement.fontStyle);
      const screenX = hitElement.x * wb.scale + wb.offset.x;
      const screenY = hitElement.y * wb.scale + wb.offset.y;
      openTextEditor(screenX, screenY, hitElement.x, hitElement.y, hitElement.id, hitElement.text);
    }
  }, [wb, openTextEditor, selection]);

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setTextEditor(null);
      return;
    }
    // Enter without shift commits
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commitText();
    }
  }, [commitText]);

  // Auto-resize textarea
  const handleTextInput = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
      textareaRef.current.style.width = "auto";
      textareaRef.current.style.width = Math.max(100, textareaRef.current.scrollWidth + 4) + "px";
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (textEditor) return;

      // Delete selected element
      if ((e.key === "Delete" || e.key === "Backspace") && selection.selectedId && wb.tool === "select") {
        e.preventDefault();
        const newElements = wb.elements.filter(el => el.id !== selection.selectedId);
        wb.setElements(newElements);
        wb.pushHistory(newElements);
        selection.deselectAll();
        return;
      }

      // Duplicate selected element
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selection.selectedId && wb.tool === "select") {
        e.preventDefault();
        const selectedEl = wb.elements.find(el => el.id === selection.selectedId);
        if (selectedEl) {
          const duplicate = {
            ...selectedEl,
            id: Math.random().toString(36).substring(2, 11),
            x: selectedEl.x + 20,
            y: selectedEl.y + 20,
            points: selectedEl.points.map(p => ({ x: p.x + 20, y: p.y + 20 })),
          };
          const newElements = [...wb.elements, duplicate];
          wb.setElements(newElements);
          wb.pushHistory(newElements);
          selection.setSelectedId(duplicate.id);
        }
        return;
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selection.selectedId && wb.tool === "select") {
        e.preventDefault();
        const selectedEl = wb.elements.find(el => el.id === selection.selectedId);
        if (selectedEl) clipboardRef.current = { ...selectedEl, points: [...selectedEl.points] };
        return;
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === "v" && clipboardRef.current) {
        e.preventDefault();
        const pasted = {
          ...clipboardRef.current,
          id: Math.random().toString(36).substring(2, 11),
          x: clipboardRef.current.x + 20,
          y: clipboardRef.current.y + 20,
          points: clipboardRef.current.points.map(p => ({ x: p.x + 20, y: p.y + 20 })),
        };
        clipboardRef.current = { ...pasted, points: [...pasted.points] };
        const newElements = [...wb.elements, pasted];
        wb.setElements(newElements);
        wb.pushHistory(newElements);
        selection.setSelectedId(pasted.id);
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) wb.redo();
        else wb.undo();
        return;
      }
      const shortcuts: Record<string, Tool> = {
        v: "select", h: "hand", p: "pencil", l: "line",
        a: "arrow", r: "rectangle", o: "ellipse", d: "diamond",
        t: "text", e: "eraser",
      };
      if (shortcuts[e.key] && !e.ctrlKey && !e.metaKey) {
        wb.setTool(shortcuts[e.key]);
        if (shortcuts[e.key] !== "select") selection.deselectAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [wb, textEditor, selection]);

  const handleExport = useCallback((format: "png-transparent" | "png-white" | "svg", filename: string) => {

    const canvas = document.createElement("canvas");
    const bounds = getElementsBounds(wb.elements);
    if (!bounds) return;
    const padding = 40;
    canvas.width = bounds.width + padding * 2;
    canvas.height = bounds.height + padding * 2;
    const ctx = canvas.getContext("2d")!;
    if (format === "png-white") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.translate(-bounds.minX + padding, -bounds.minY + padding);
    wb.elements.forEach(el => drawElement(ctx, el));
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [wb.elements]);

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        // Cache the image for canvas rendering
        const id = Math.random().toString(36).substring(2, 11);
        imageCache.set(id, img);
        // Place at center of current viewport
        const centerX = (window.innerWidth / 2 - wb.offset.x) / wb.scale;
        const centerY = (window.innerHeight / 2 - wb.offset.y) / wb.scale;
        // Scale down large images to fit reasonably
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const maxDim = 400;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w *= ratio;
          h *= ratio;
        }
        const newElement: WhiteboardElement = {
          id,
          type: "image",
          points: [],
          x: centerX - w / 2,
          y: centerY - h / 2,
          width: w,
          height: h,
          strokeColor: "#000000",
          fillColor: "transparent",
          strokeWidth: 0,
          opacity: 1,
          roughStyle: false,
          imageSrc: dataUrl,
          imageNaturalWidth: img.naturalWidth,
          imageNaturalHeight: img.naturalHeight,
        };
        const newElements = [...wb.elements, newElement];
        wb.setElements(newElements);
        wb.pushHistory(newElements);
        wb.setTool("select");
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, [wb]);

  const cursor = wb.tool === "select" && dynamicCursor ? dynamicCursor : BASE_CURSOR_MAP[wb.tool];

  // Always use current tool styles for the editor so live changes are reflected
  const editorFontSize = wb.fontSize || 16;
  const editorFontWeight = wb.fontWeight;
  const editorFontStyle = wb.fontStyle;
  const editorColor = wb.strokeColor;

  const textareaStyle: React.CSSProperties = textEditor ? {
    position: "absolute",
    left: textEditor.screenX,
    top: textEditor.screenY,
    zIndex: 100,
    background: "transparent",
    border: "2px solid hsl(var(--primary))",
    borderRadius: 4,
    outline: "none",
    padding: "2px 4px",
    margin: 0,
    resize: "none",
    overflow: "hidden",
    minWidth: 100,
    minHeight: editorFontSize * 1.4,
    color: editorColor,
    fontSize: editorFontSize * wb.scale,
    fontWeight: editorFontWeight,
    fontStyle: editorFontStyle,
    fontFamily: "sans-serif",
    lineHeight: 1.3,
    whiteSpace: "pre",
    transformOrigin: "top left",
  } : {};

  const selectedEl = selection.selectedId ? wb.elements.find(e => e.id === selection.selectedId) : null;
  const activeTool = selectedEl ? selectedEl.type : wb.tool;

  const updateSelectedStyle = <K extends keyof WhiteboardElement>(key: K, value: WhiteboardElement[K]) => {
    if (selection.selectedId && selectedEl) {
      const newElements = wb.elements.map(el => {
        if (el.id === selection.selectedId) {
          const updated = { ...el, [key]: value };
          if (el.type === "text" && (key === "fontSize" || key === "fontWeight" || key === "fontStyle" || key === "text")) {
            const fSize = (key === "fontSize" ? value : el.fontSize) as number || 16;
            const fWeight = (key === "fontWeight" ? value : el.fontWeight) as string || "normal";
            const fStyle = (key === "fontStyle" ? value : el.fontStyle) as string || "normal";
            const measured = measureTextElement(el.text || "", fSize, fWeight, fStyle);
            updated.textWidth = measured.width;
            updated.textHeight = measured.height;
          }
          return updated;
        }
        return el;
      });
      wb.setElements(newElements);
      wb.pushHistory(newElements);
    }
  };

  return (
    <div ref={containerRef} className="absolute top-0 left-0 w-screen h-screen overflow-hidden bg-canvas-bg select-none">
      <Toolbar
        tool={wb.tool}
        setTool={(tool) => {
          wb.setTool(tool);
          if (tool !== "select") selection.deselectAll();
        }}
        onUndo={wb.undo}
        onRedo={wb.redo}
        onClear={wb.clearCanvas}
        onExport={handleExport}
        onImageUpload={handleImageUpload}
        canUndo={wb.canUndo}
        canRedo={wb.canRedo}
      />
      <StylePanel
        tool={activeTool}
        strokeColor={selectedEl?.strokeColor ?? wb.strokeColor}
        setStrokeColor={c => { wb.setStrokeColor(c); updateSelectedStyle("strokeColor", c); }}
        fillColor={selectedEl?.fillColor ?? wb.fillColor}
        setFillColor={c => { wb.setFillColor(c); updateSelectedStyle("fillColor", c); }}
        strokeWidth={selectedEl?.strokeWidth ?? wb.strokeWidth}
        setStrokeWidth={w => { wb.setStrokeWidth(w); updateSelectedStyle("strokeWidth", w); }}
        opacity={selectedEl?.opacity ?? wb.opacity}
        setOpacity={o => { wb.setOpacity(o); updateSelectedStyle("opacity", o); }}
        fontSize={selectedEl?.type === "text" && selectedEl.fontSize ? selectedEl.fontSize : wb.fontSize}
        setFontSize={s => { wb.setFontSize(s); updateSelectedStyle("fontSize", s); }}
        fontWeight={selectedEl?.type === "text" && selectedEl.fontWeight ? selectedEl.fontWeight : wb.fontWeight}
        setFontWeight={w => { wb.setFontWeight(w); updateSelectedStyle("fontWeight", w); }}
        fontStyle={selectedEl?.type === "text" && selectedEl.fontStyle ? selectedEl.fontStyle : wb.fontStyle}
        setFontStyle={s => { wb.setFontStyle(s); updateSelectedStyle("fontStyle", s); }}
        fontFamily={selectedEl?.type === "text" && selectedEl.fontFamily ? selectedEl.fontFamily : wb.fontFamily}
        setFontFamily={f => { wb.setFontFamily(f); updateSelectedStyle("fontFamily", f); }}
      />
      <Canvas
        elements={textEditor?.editingId ? wb.elements.filter(el => el.id !== textEditor.editingId) : wb.elements}
        offset={wb.offset}
        scale={wb.scale}
        selectedId={selection.selectedId}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        onWheel={wb.handleWheel}
        cursor={cursor}
      />

      {/* Image actions bar */}
      {(() => {
        const selectedEl = selection.selectedId ? wb.elements.find(e => e.id === selection.selectedId) : null;
        if (!selectedEl || selectedEl.type !== "image") return null;
        const screenX = selectedEl.x * wb.scale + wb.offset.x;
        const screenY = selectedEl.y * wb.scale + wb.offset.y;
        const screenW = selectedEl.width * wb.scale;
        return (
          <div
            className="absolute z-50 flex items-center gap-1 rounded-lg bg-toolbar-bg border border-border px-2 py-1 shadow-lg text-xs"
            style={{ left: screenX + screenW / 2, top: screenY - 44, transform: "translateX(-50%)" }}
          >
            <button
              className="px-2 py-1 rounded text-muted-foreground hover:bg-toolbar-hover hover:text-foreground transition-colors"
              onClick={() => setCropState({ elementId: selectedEl.id })}
            >
              Crop
            </button>
            {selectedEl.crop && (
              <button
                className="px-2 py-1 rounded text-muted-foreground hover:bg-toolbar-hover hover:text-foreground transition-colors"
                onClick={() => {
                  const newElements = wb.elements.map(el =>
                    el.id === selectedEl.id ? { ...el, crop: undefined } : el
                  );
                  wb.setElements(newElements);
                  wb.pushHistory(newElements);
                }}
              >
                Reset
              </button>
            )}
          </div>
        );
      })()}

      {/* Interactive crop overlay */}
      {cropState && (() => {
        const el = wb.elements.find(e => e.id === cropState.elementId);
        if (!el || el.type !== "image") return null;
        const screenX = el.x * wb.scale + wb.offset.x;
        const screenY = el.y * wb.scale + wb.offset.y;
        const screenW = el.width * wb.scale;
        const screenH = el.height * wb.scale;
        const currentCrop = el.crop || { x: 0, y: 0, w: 1, h: 1 };
        return (
          <CropOverlay
            imageScreenX={screenX}
            imageScreenY={screenY}
            imageScreenW={screenW}
            imageScreenH={screenH}
            initialCrop={currentCrop}
            onApply={(crop: CropRect) => {
              const newElements = wb.elements.map(e =>
                e.id === cropState.elementId ? { ...e, crop } : e
              );
              wb.setElements(newElements);
              wb.pushHistory(newElements);
              setCropState(null);
            }}
            onCancel={() => setCropState(null)}
          />
        );
      })()}

      {/* Zoom indicator */}
      <div className="fixed flex gap-1 top-4 right-4 z-50">
        <div className="rounded-lg bg-toolbar-bg border border-border px-3 py-3 text-xs font-medium text-muted-foreground shadow-md">
          {Math.round(wb.scale * 100)}%
        </div>
        <button
          onClick={() => setHelpOpen(true)}
          className="rounded-lg bg-toolbar-bg border border-border px-3 py-2 text-xs font-medium text-muted-foreground shadow-md"
        >
          <Info size={16} />
        </button>
      </div>

      {helpOpen && <InformationCard setHelpOpen={setHelpOpen} />}


      {/* Text editor overlay */}
      {textEditor && (
        <textarea
          ref={textareaRef}
          style={textareaStyle}
          rows={1}
          onKeyDown={handleTextKeyDown}
          onInput={handleTextInput}
          onBlur={commitText}
          placeholder="Type here..."
          className="placeholder:text-muted-foreground/40"
        />
      )}
    </div>
  );
}
