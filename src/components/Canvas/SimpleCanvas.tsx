import React, { useRef, useEffect, useState } from 'react';
import { ImageLayer } from '../../types';

interface SimpleCanvasProps {
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

export const SimpleCanvas: React.FC<SimpleCanvasProps> = ({
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scale, setScale] = useState(0.4);
  const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const [draggedLayer, setDraggedLayer] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load images
  useEffect(() => {
    layers.forEach(layer => {
      if (!images[layer.id] && layer.src) {
        const img = new Image();
        img.src = layer.src;
        img.onload = () => {
          setImages(prev => ({ ...prev, [layer.id]: img }));
        };
      }
    });
  }, [layers]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      
      for (let i = 0; i <= canvas.width; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      
      for (let i = 0; i <= canvas.height; i += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }
    }
    
    // Draw layers
    layers.forEach(layer => {
      if (!layer.visible || !images[layer.id]) return;
      
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      ctx.rotate(layer.rotation * Math.PI / 180);
      ctx.scale(layer.scaleX, layer.scaleY);
      
      ctx.drawImage(
        images[layer.id],
        -layer.width / 2,
        -layer.height / 2,
        layer.width,
        layer.height
      );
      
      // Draw selection border
      if (layer.id === selectedLayerId) {
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;
        ctx.strokeRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
      }
      
      ctx.restore();
    });
  }, [layers, images, backgroundColor, showGrid, gridSize, selectedLayerId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // Find clicked layer
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible || layer.locked) continue;
      
      if (x >= layer.x && x <= layer.x + layer.width &&
          y >= layer.y && y <= layer.y + layer.height) {
        onLayerSelect(layer.id);
        setDraggedLayer(layer.id);
        setDragOffset({ x: x - layer.x, y: y - layer.y });
        break;
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedLayer) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    onLayerUpdate(draggedLayer, {
      x: x - dragOffset.x,
      y: y - dragOffset.y,
    });
  };

  const handleMouseUp = () => {
    setDraggedLayer(null);
  };

  const displayWidth = width * scale;
  const displayHeight = height * scale;

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{ 
            width: displayWidth, 
            height: displayHeight,
            border: '2px solid #e5e7eb',
            cursor: draggedLayer ? 'grabbing' : 'grab'
          }}
          className="bg-white rounded-lg shadow-xl"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
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