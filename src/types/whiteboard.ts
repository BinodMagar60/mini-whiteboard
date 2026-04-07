export type Tool = 
  | "select"
  | "hand" 
  | "pencil"
  | "line"
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "diamond"
  | "text"
  | "eraser"
  | "image";

export interface Point {
  x: number;
  y: number;
}

export interface CropRect {
  x: number; // 0-1 relative to original image
  y: number;
  w: number;
  h: number;
}

export interface WhiteboardElement {
  id: string;
  type: Exclude<Tool, "select" | "hand" | "eraser" | "image"> | "image";
  points: Point[];
  x: number;
  y: number;
  width: number;
  height: number;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textWidth?: number;
  textHeight?: number;
  opacity: number;
  roughStyle: boolean;
  // Image-specific
  imageSrc?: string; // data URL
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  crop?: CropRect;
}

export interface CanvasState {
  elements: WhiteboardElement[];
  offset: Point;
  scale: number;
}
