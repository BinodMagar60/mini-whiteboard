
import {
  MousePointer2, Hand, Pencil, Minus, ArrowUpRight,
  Square, Circle, Diamond, Type, Eraser, Undo2, Redo2, Trash2, Download, ChevronDown, Info, X, Keyboard, Mouse, ImagePlus
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { Tool } from "../types/whiteboard";

interface ToolbarProps {
  tool: Tool;
  setTool: (tool: Tool) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onExport: (format: "png-transparent" | "png-white" | "svg", filename: string) => void;
  onImageUpload: (file: File) => void;
  canUndo: boolean;
  canRedo: boolean;
}

const tools: { id: Tool; icon: React.ElementType; label: string; shortcut?: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select", shortcut: "V" },
  { id: "hand", icon: Hand, label: "Pan", shortcut: "H" },
  { id: "pencil", icon: Pencil, label: "Draw", shortcut: "P" },
  { id: "line", icon: Minus, label: "Line", shortcut: "L" },
  { id: "arrow", icon: ArrowUpRight, label: "Arrow", shortcut: "A" },
  { id: "rectangle", icon: Square, label: "Rectangle", shortcut: "R" },
  { id: "ellipse", icon: Circle, label: "Ellipse", shortcut: "O" },
  { id: "diamond", icon: Diamond, label: "Diamond", shortcut: "D" },
  { id: "text", icon: Type, label: "Text", shortcut: "T" },
  { id: "eraser", icon: Eraser, label: "Eraser", shortcut: "E" },
];

export function Toolbar({ tool, setTool, onUndo, onRedo, onClear, onExport, onImageUpload, canUndo, canRedo }: ToolbarProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"png-transparent" | "png-white" | "svg" | null>(null);
  const [exportFilename, setExportFilename] = useState("whiteboard");
  const [helpOpen, setHelpOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <>
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 rounded-xl bg-toolbar-bg border border-border px-2 py-1.5 shadow-lg shadow-toolbar-shadow/20">
      {tools.map(({ id, icon: Icon, label, shortcut }) => (
        <button
          key={id}
          onClick={() => setTool(id)}
          title={`${label}${shortcut ? ` (${shortcut})` : ""}`}
          className={`relative p-2 rounded-lg transition-all duration-150 ${
            tool === id
              ? "bg-primary/10 text-primary shadow-sm"
              : "text-muted-foreground hover:bg-toolbar-hover hover:text-foreground"
          }`}
        >
          <Icon size={18} strokeWidth={tool === id ? 2.2 : 1.8} />
        </button>
      ))}

      {/* Image upload button */}
      <button
        onClick={() => imageInputRef.current?.click()}
        title="Add Image (I)"
        className={`relative p-2 rounded-lg transition-all duration-150 text-muted-foreground hover:bg-toolbar-hover hover:text-foreground`}
      >
        <ImagePlus size={18} strokeWidth={1.8} />
      </button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onImageUpload(file);
          e.target.value = "";
        }}
      />

      <div className="w-px h-6 bg-border mx-1" />

      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="p-2 rounded-lg text-muted-foreground hover:bg-toolbar-hover hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-all"
      >
        <Undo2 size={18} strokeWidth={1.8} />
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        className="p-2 rounded-lg text-muted-foreground hover:bg-toolbar-hover hover:text-foreground disabled:opacity-30 disabled:pointer-events-none transition-all"
      >
        <Redo2 size={18} strokeWidth={1.8} />
      </button>
      <button
        onClick={onClear}
        title="Clear canvas"
        className="p-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
      >
        <Trash2 size={18} strokeWidth={1.8} />
      </button>

      <div className="w-px h-6 bg-border mx-1" />

      <div ref={exportRef} className="relative">
        <button
          onClick={() => setExportOpen(!exportOpen)}
          title="Export"
          className="p-2 rounded-lg text-muted-foreground hover:bg-toolbar-hover hover:text-foreground transition-all flex items-center gap-0.5"
        >
          <Download size={18} strokeWidth={1.8} />
          <ChevronDown size={12} strokeWidth={2} />
        </button>
        {exportOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl bg-toolbar-bg border border-border shadow-lg shadow-toolbar-shadow/20 py-1 z-50">
            {[
              { id: "png-transparent" as const, label: "PNG (transparent)" },
              { id: "png-white" as const, label: "PNG (white background)" },
              { id: "svg" as const, label: "SVG" },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => { setExportFormat(opt.id); setExportOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-toolbar-hover transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => setHelpOpen(true)}
        title="Help & Shortcuts"
        className="p-2 rounded-lg text-muted-foreground hover:bg-toolbar-hover hover:text-foreground transition-all"
      >
        <Info size={18} strokeWidth={1.8} />
      </button>
    </div>

    {/* Help Modal - rendered outside toolbar for proper positioning */}
    {helpOpen && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={() => setHelpOpen(false)}>
        <div
          className="relative w-[480px] max-h-[80vh] overflow-y-auto rounded-2xl bg-toolbar-bg border border-border shadow-2xl p-6"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setHelpOpen(false)}
            className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:bg-toolbar-hover hover:text-foreground transition-all"
          >
            <X size={18} />
          </button>

          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Keyboard size={20} /> Keyboard Shortcuts
          </h2>

          <div className="space-y-1 text-sm">
            {[
              ["V", "Select tool"],
              ["H", "Hand / Pan"],
              ["P", "Pencil / Draw"],
              ["L", "Line"],
              ["A", "Arrow"],
              ["R", "Rectangle"],
              ["O", "Ellipse"],
              ["D", "Diamond"],
              ["T", "Text"],
              ["E", "Eraser"],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                <span className="text-muted-foreground">{desc}</span>
                <kbd className="px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-mono font-medium border border-border">{key}</kbd>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-1 text-sm">
            <h3 className="text-sm font-semibold text-foreground mb-2">Actions</h3>
            {[
              ["Ctrl + Z", "Undo"],
              ["Ctrl + Shift + Z", "Redo"],
              ["Ctrl + C", "Copy selected"],
              ["Ctrl + V", "Paste"],
              ["Ctrl + D", "Duplicate selected"],
              ["Delete / Backspace", "Delete selected"],
              ["Enter", "Commit text"],
              ["Shift + Enter", "New line in text"],
              ["Escape", "Cancel text editing"],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                <span className="text-muted-foreground">{desc}</span>
                <kbd className="px-2 py-0.5 rounded-md bg-muted text-foreground text-xs font-mono font-medium border border-border">{key}</kbd>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-1 text-sm">
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <Mouse size={16} /> Mouse & Interactions
            </h3>
              {[
                ["Scroll wheel", "Zoom in / out"],
                ["Click + Drag", "Draw or move elements"],
                ["Double-click text", "Edit existing text"],
                ["Select + Drag handles", "Resize elements"],
                ["Hand tool + Drag", "Pan the canvas"],
                ["Image button", "Upload & add image"],
                ["Crop In / Reset", "Crop selected image"],
              ].map(([action, desc]) => (
              <div key={action} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                <span className="text-muted-foreground">{desc}</span>
                <span className="text-xs text-foreground font-medium">{action}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* Export filename dialog */}
    {exportFormat && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40" onClick={() => setExportFormat(null)}>
        <div
          className="relative w-[360px] rounded-2xl bg-toolbar-bg border border-border shadow-2xl p-6"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setExportFormat(null)}
            className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:bg-toolbar-hover hover:text-foreground transition-all"
          >
            <X size={18} />
          </button>
          <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Download size={18} /> Export as {exportFormat === "svg" ? "SVG" : "PNG"}
          </h2>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
            File name
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={exportFilename}
              onChange={e => setExportFilename(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && exportFilename.trim()) {
                  onExport(exportFormat, exportFilename.trim());
                  setExportFormat(null);
                  setExportFilename("whiteboard");
                }
              }}
              autoFocus
              className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-sm text-foreground outline-none focus:border-primary transition-colors"
              placeholder="whiteboard"
            />
            <span className="text-xs text-muted-foreground font-mono">.{exportFormat === "svg" ? "svg" : "png"}</span>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setExportFormat(null)}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (exportFilename.trim()) {
                  onExport(exportFormat, exportFilename.trim());
                  setExportFormat(null);
                  setExportFilename("whiteboard");
                }
              }}
              className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
