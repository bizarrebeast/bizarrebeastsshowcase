import React, { useState, useCallback, useRef, useEffect } from 'react';
import './index.css';

interface ImageLayer {
  id: string;
  name: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
}

type DragMode = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | null;

function EnhancedApp() {
  const [layers, setLayers] = useState<ImageLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [originalState, setOriginalState] = useState<ImageLayer | null>(null);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        const newLayer: ImageLayer = {
          id: `layer-${Date.now()}`,
          name: file.name,
          src: event.target?.result as string,
          x: 500,
          y: 500,
          width: width,
          height: height,
          visible: true,
          opacity: 1,
        };
        setLayers(prev => [...prev, newLayer]);
        setImages(prev => ({ ...prev, [newLayer.id]: img }));
        setSelectedLayerId(newLayer.id);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and set background
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, 2000, 2000);
    
    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 2000; i += 100) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 2000);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(2000, i);
        ctx.stroke();
      }
    }
    
    // Draw layers
    layers.forEach(layer => {
      if (!layer.visible || !images[layer.id]) return;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(images[layer.id], layer.x, layer.y, layer.width, layer.height);
      
      // Draw selection border and resize handles
      if (layer.id === selectedLayerId) {
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;
        ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
        
        // Draw resize handles
        const handleSize = 10;
        ctx.fillStyle = '#4f46e5';
        
        // Top-left
        ctx.fillRect(layer.x - handleSize/2, layer.y - handleSize/2, handleSize, handleSize);
        // Top-right
        ctx.fillRect(layer.x + layer.width - handleSize/2, layer.y - handleSize/2, handleSize, handleSize);
        // Bottom-left
        ctx.fillRect(layer.x - handleSize/2, layer.y + layer.height - handleSize/2, handleSize, handleSize);
        // Bottom-right
        ctx.fillRect(layer.x + layer.width - handleSize/2, layer.y + layer.height - handleSize/2, handleSize, handleSize);
      }
      ctx.restore();
    });
  }, [layers, images, backgroundColor, showGrid, selectedLayerId]);

  const getCursorPosition = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const getHitTest = (x: number, y: number) => {
    const handleSize = 10;
    
    // Check layers from top to bottom
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible) continue;
      
      // Check resize handles if selected
      if (layer.id === selectedLayerId) {
        // Top-left handle
        if (Math.abs(x - layer.x) < handleSize && Math.abs(y - layer.y) < handleSize) {
          return { layer, mode: 'resize-tl' as DragMode };
        }
        // Top-right handle
        if (Math.abs(x - (layer.x + layer.width)) < handleSize && Math.abs(y - layer.y) < handleSize) {
          return { layer, mode: 'resize-tr' as DragMode };
        }
        // Bottom-left handle
        if (Math.abs(x - layer.x) < handleSize && Math.abs(y - (layer.y + layer.height)) < handleSize) {
          return { layer, mode: 'resize-bl' as DragMode };
        }
        // Bottom-right handle
        if (Math.abs(x - (layer.x + layer.width)) < handleSize && Math.abs(y - (layer.y + layer.height)) < handleSize) {
          return { layer, mode: 'resize-br' as DragMode };
        }
      }
      
      // Check if inside layer bounds
      if (x >= layer.x && x <= layer.x + layer.width &&
          y >= layer.y && y <= layer.y + layer.height) {
        return { layer, mode: 'move' as DragMode };
      }
    }
    
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCursorPosition(e);
    const hit = getHitTest(pos.x, pos.y);
    
    if (hit) {
      setSelectedLayerId(hit.layer.id);
      setDragMode(hit.mode);
      setDragStart(pos);
      setOriginalState({ ...hit.layer });
    } else {
      setSelectedLayerId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCursorPosition(e);
    
    // Update cursor
    if (!dragMode) {
      const hit = getHitTest(pos.x, pos.y);
      if (hit) {
        const canvas = canvasRef.current;
        if (canvas) {
          if (hit.mode === 'move') {
            canvas.style.cursor = 'move';
          } else if (hit.mode.startsWith('resize')) {
            if (hit.mode === 'resize-tl' || hit.mode === 'resize-br') {
              canvas.style.cursor = 'nwse-resize';
            } else {
              canvas.style.cursor = 'nesw-resize';
            }
          }
        }
      } else {
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = 'default';
      }
    }
    
    // Handle dragging
    if (dragMode && originalState && selectedLayerId) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      setLayers(prev => prev.map(layer => {
        if (layer.id !== selectedLayerId) return layer;
        
        if (dragMode === 'move') {
          return {
            ...layer,
            x: originalState.x + dx,
            y: originalState.y + dy
          };
        } else if (dragMode === 'resize-br') {
          return {
            ...layer,
            width: Math.max(50, originalState.width + dx),
            height: Math.max(50, originalState.height + dy)
          };
        } else if (dragMode === 'resize-tl') {
          return {
            ...layer,
            x: originalState.x + dx,
            y: originalState.y + dy,
            width: Math.max(50, originalState.width - dx),
            height: Math.max(50, originalState.height - dy)
          };
        } else if (dragMode === 'resize-tr') {
          return {
            ...layer,
            y: originalState.y + dy,
            width: Math.max(50, originalState.width + dx),
            height: Math.max(50, originalState.height - dy)
          };
        } else if (dragMode === 'resize-bl') {
          return {
            ...layer,
            x: originalState.x + dx,
            width: Math.max(50, originalState.width - dx),
            height: Math.max(50, originalState.height + dy)
          };
        }
        return layer;
      }));
    }
  };

  const handleMouseUp = () => {
    setDragMode(null);
    setOriginalState(null);
  };

  const toggleLayerVisibility = (id: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  const updateLayerOpacity = (id: string, opacity: number) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, opacity } : layer
    ));
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-80 bg-white shadow-lg overflow-y-auto">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-gray-800">BUTQ Showcase</h1>
          <p className="text-sm text-gray-600 mt-1">Character Artwork Tool</p>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-indigo-400 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-2">Upload character artwork</p>
          </div>
          
          {/* Layers - REVERSED ORDER */}
          <div>
            <h3 className="font-semibold mb-2">Layers</h3>
            <div className="space-y-2">
              {[...layers].reverse().map(layer => (
                <div
                  key={layer.id}
                  className={`p-3 rounded border cursor-pointer ${
                    selectedLayerId === layer.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm truncate flex-1">{layer.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerVisibility(layer.id);
                        }}
                        className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                      >
                        {layer.visible ? '👁' : '—'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(layer.id);
                        }}
                        className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  
                  {/* Opacity slider for selected layer */}
                  {selectedLayerId === layer.id && (
                    <div className="mt-2">
                      <label className="text-xs text-gray-600">Opacity</label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={layer.opacity}
                        onChange={(e) => updateLayerOpacity(layer.id, parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              ))}
              {layers.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-4">No layers yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 bg-white shadow-md z-10 p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`px-4 py-2 rounded transition-colors ${
                showGrid ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {showGrid ? 'Hide Grid' : 'Show Grid'}
            </button>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Background:</label>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border-2 border-gray-300"
              />
            </div>
            
            <div className="text-sm text-gray-600">
              Click and drag to move • Drag corners to resize
            </div>
          </div>
        </div>

        {/* Canvas Container */}
        <div className="pt-20 h-full flex items-center justify-center overflow-auto bg-gray-100">
          <canvas
            ref={canvasRef}
            width={2000}
            height={2000}
            style={{ 
              width: '800px', 
              height: '800px',
              border: '2px solid #e5e7eb',
              backgroundColor: 'white'
            }}
            className="shadow-xl"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>
      </div>
    </div>
  );
}

export default EnhancedApp;