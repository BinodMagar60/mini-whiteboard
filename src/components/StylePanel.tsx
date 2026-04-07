
import type { Tool } from "../types/whiteboard";

interface StylePanelProps {
  tool: Tool;
  strokeColor: string;
  setStrokeColor: (c: string) => void;
  fillColor: string;
  setFillColor: (c: string) => void;
  strokeWidth: number;
  setStrokeWidth: (w: number) => void;
  opacity: number;
  setOpacity: (o: number) => void;
  fontSize: number;
  setFontSize: (s: number) => void;
  fontWeight: "normal" | "bold";
  setFontWeight: (w: "normal" | "bold") => void;
  fontStyle: "normal" | "italic";
  setFontStyle: (s: "normal" | "italic") => void;
  fontFamily: string;
  setFontFamily: (f: string) => void;
}

const COLORS = [
  "#1e1e1e", "#e03131", "#2f9e44", "#1971c2", "#f08c00",
  "#7048e8", "#0c8599", "#e64980", "#868e96", "#ffffff",
];

const WIDTHS = [1, 2, 4, 6];

const HIDDEN_TOOLS: Tool[] = ["select", "hand", "eraser"];
const FILL_TOOLS: Tool[] = ["rectangle", "ellipse", "diamond"];
const STROKE_WIDTH_TOOLS: Tool[] = ["pencil", "line", "arrow", "rectangle", "ellipse", "diamond"];

const FONT_SIZES = [12, 16, 20, 24, 32, 48];

const FONT_FAMILIES = [
  { label: "Sans", value: "'Space Grotesk', sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "'Courier New', monospace" },
  { label: "Comic", value: "'Comic Sans MS', cursive" },
  { label: "Impact", value: "Impact, sans-serif" },
];

export function StylePanel({
  tool, strokeColor, setStrokeColor, fillColor, setFillColor, strokeWidth, setStrokeWidth,
  opacity, setOpacity, fontSize, setFontSize, fontWeight, setFontWeight, fontStyle, setFontStyle,
  fontFamily, setFontFamily,
}: StylePanelProps) {

  if (HIDDEN_TOOLS.includes(tool)) return null;

  const showStroke = tool !== "image";
  const showFillSection = FILL_TOOLS.includes(tool);
  const showWidth = STROKE_WIDTH_TOOLS.includes(tool);
  const isText = tool === "text";

  return (
    <div
      onMouseDown={e => {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT") e.preventDefault();
      }}
      className="fixed left-4 top-20 z-50 flex flex-col gap-3 rounded-xl bg-toolbar-bg border border-border p-3 shadow-lg shadow-toolbar-shadow/20 max-w-45"
    >

      {/* Color */}
      {showStroke && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {isText ? "Color" : "Stroke"}
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {COLORS.map(color => (
              <button
                key={color}
                onClick={() => setStrokeColor(color)}
                className={`w-6 h-6 rounded-md border-2 transition-all ${strokeColor === color ? "border-primary scale-110" : "border-transparent hover:scale-105"
                  }`}
                style={{ backgroundColor: color, boxShadow: color === "#ffffff" ? "inset 0 0 0 1px hsl(var(--border))" : undefined }}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1">
            <label className="text-[10px] text-muted-foreground">Custom</label>
            <input
              type="color"
              value={strokeColor}
              onChange={e => setStrokeColor(e.target.value)}
              className="w-6 h-6 cursor-pointer bg-transparent p-0"
            />
            <span className="text-[10px] text-muted-foreground font-mono">{strokeColor}</span>
          </div>
        </div>
      )}

      {/* Fill color - only for shapes */}
      {showFillSection && (
        <div>
          <div
            className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors"
          >
            Fill
          </div>
          <>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                onClick={() => setFillColor("transparent")}
                className={`w-6 h-6 rounded-md border-2 transition-all relative overflow-hidden ${fillColor === "transparent" ? "border-primary scale-110" : "border-transparent hover:scale-105"
                  }`}
                style={{ background: "repeating-conic-gradient(hsl(var(--muted)) 0% 25%, transparent 0% 50%) 50% / 8px 8px" }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-4 h-[1.5px] bg-destructive rotate-45 rounded" />
                </div>
              </button>
              {COLORS.map(color => (
                <button
                  key={`fill-${color}`}
                  onClick={() => setFillColor(color)}
                  className={`w-6 h-6 rounded-md border-2 transition-all ${fillColor === color ? "border-primary scale-110" : "border-transparent hover:scale-105"
                    }`}
                  style={{ backgroundColor: color, opacity: 0.6, boxShadow: color === "#ffffff" ? "inset 0 0 0 1px hsl(var(--border))" : undefined }}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <label className="text-[10px] text-muted-foreground">Custom</label>
              <input
                type="color"
                value={fillColor === "transparent" ? "#ffffff" : fillColor}
                onChange={e => setFillColor(e.target.value)}
                className="w-6 h-6 cursor-pointer rounded-md bg-transparent p-0 border-none overflow-hidden"
              />
            </div>
          </>
        </div>
      )}

      {/* Width - not for text */}
      {showWidth && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Width</p>
          <div className="flex gap-1.5">
            {WIDTHS.map(w => (
              <button
                key={w}
                onClick={() => setStrokeWidth(w)}
                className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${strokeWidth === w
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-toolbar-hover"
                  }`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: w + 4, height: w + 4 }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Text options */}
      {isText && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Size</p>
            <div className="flex flex-wrap gap-1.5">
              {FONT_SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${fontSize === s
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-toolbar-hover"
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Style</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setFontWeight(fontWeight === "bold" ? "normal" : "bold")}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${fontWeight === "bold"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-toolbar-hover"
                  }`}
              >
                B
              </button>
              <button
                onClick={() => setFontStyle(fontStyle === "italic" ? "normal" : "italic")}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] italic transition-all ${fontStyle === "italic"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-toolbar-hover"
                  }`}
              >
                I
              </button>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Font</p>
            <select
              value={fontFamily}
              onChange={e => setFontFamily(e.target.value)}
              className="w-full rounded-lg border border-border bg-transparent px-2 py-1.5 text-[11px] text-foreground"
            >
              {FONT_FAMILIES.map(font => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Opacity - hidden for text */}
      {!isText && (
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Opacity <span className="text-muted-foreground/60 font-mono">{Math.round(opacity * 100)}%</span>
          </p>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={opacity}
            onChange={e => setOpacity(parseFloat(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none bg-muted cursor-pointer accent-primary"
          />
        </div>
      )}
    </div>
  );
}
