export interface ImageLayer {
  id: string;
  name: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  scaleX: number;
  scaleY: number;
}

export interface CanvasState {
  layers: ImageLayer[];
  selectedLayerId: string | null;
  backgroundColor: string;
  showGrid: boolean;
  gridSize: number;
  canvasWidth: number;
  canvasHeight: number;
}

export interface ExportSettings {
  format: 'png' | 'gif' | 'mp4' | 'webm';
  quality: number;
  scale: number;
  fps?: number;
  duration?: number;
}