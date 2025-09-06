import React, { useRef, useCallback, useState } from 'react';
import { Stage, Layer, Image, Rect, Line } from 'react-konva';
import Konva from 'konva';
import { ImageLayer } from '../../types';

interface ShowcaseCanvasProps {
  width?: number;
  height?: number;
  layers: ImageLayer[];
  selectedLayerId: string | null;
  backgroundColor: string;
  showGrid: boolean;
  gridSize: number;
  onLayerSelect: (id: string) => void;
  onLayerUpdate: (id: string, updates: Partial<ImageLayer>) => void;
}

export const ShowcaseCanvas: React.FC<ShowcaseCanvasProps> = ({
  width = 2000,
  height = 2000,
  layers,
  selectedLayerId,
  backgroundColor,
  showGrid,
  gridSize = 100,
  onLayerSelect,
  onLayerUpdate,
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4); // Start at 40% zoom to fit 2000x2000

  // Load images for layers
  React.useEffect(() => {
    layers.forEach(layer => {
      if (!images[layer.id] && layer.src) {
        const img = new window.Image();
        img.src = layer.src;
        img.onload = () => {
          setImages(prev => ({ ...prev, [layer.id]: img }));
        };
      }
    });
  }, [layers]);

  // Generate grid lines
  const gridLines = React.useMemo(() => {
    if (!showGrid) return null;
    
    const lines = [];
    
    // Vertical lines
    for (let i = 0; i <= width; i += gridSize) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i, 0, i, height]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
        />
      );
    }
    
    // Horizontal lines
    for (let i = 0; i <= height; i += gridSize) {
      lines.push(
        <Line
          key={`h-${i}`}
          points={[0, i, width, i]}
          stroke="#e5e7eb"
          strokeWidth={1}
          listening={false}
        />
      );
    }
    
    return lines;
  }, [showGrid, gridSize, width, height]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>, layerId: string) => {
    const node = e.target;
    onLayerUpdate(layerId, {
      x: node.x(),
      y: node.y(),
    });
  }, [onLayerUpdate]);

  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>, layerId: string) => {
    const node = e.target;
    onLayerUpdate(layerId, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
    });
  }, [onLayerUpdate]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = Math.max(0.1, Math.min(2, oldScale + direction * 0.05));
    
    setScale(newScale);
    
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    
    stage.position(newPos);
  }, [scale]);

  return (
    <div 
      ref={containerRef}
      className="canvas-container w-full h-full flex items-center justify-center"
      style={{ backgroundColor: '#f3f4f6' }}
    >
      <div className="relative">
        <Stage
          ref={stageRef}
          width={window.innerWidth * 0.8}
          height={window.innerHeight * 0.8}
          scaleX={scale}
          scaleY={scale}
          draggable
          onWheel={handleWheel}
        >
          <Layer>
            {/* Background */}
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill={backgroundColor}
              listening={false}
            />
            
            {/* Grid */}
            {gridLines}
            
            {/* Image layers */}
            {layers.map(layer => {
              if (!layer.visible || !images[layer.id]) return null;
              
              return (
                <Image
                  key={layer.id}
                  id={layer.id}
                  image={images[layer.id]}
                  x={layer.x}
                  y={layer.y}
                  width={layer.width}
                  height={layer.height}
                  rotation={layer.rotation}
                  opacity={layer.opacity}
                  scaleX={layer.scaleX}
                  scaleY={layer.scaleY}
                  draggable={!layer.locked}
                  onClick={() => onLayerSelect(layer.id)}
                  onTap={() => onLayerSelect(layer.id)}
                  onDragEnd={(e) => handleDragEnd(e, layer.id)}
                  onTransformEnd={(e) => handleTransformEnd(e, layer.id)}
                />
              );
            })}
          </Layer>
        </Stage>
        
        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-2 flex gap-2">
          <button
            className="btn-secondary text-sm px-2 py-1"
            onClick={() => setScale(Math.max(0.1, scale - 0.1))}
          >
            -
          </button>
          <span className="text-sm self-center px-2">{Math.round(scale * 100)}%</span>
          <button
            className="btn-secondary text-sm px-2 py-1"
            onClick={() => setScale(Math.min(2, scale + 0.1))}
          >
            +
          </button>
          <button
            className="btn-secondary text-sm px-2 py-1"
            onClick={() => setScale(0.4)}
          >
            Fit
          </button>
        </div>
      </div>
    </div>
  );
};