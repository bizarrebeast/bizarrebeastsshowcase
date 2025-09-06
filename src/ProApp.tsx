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

interface HistoryState {
  layers: ImageLayer[];
  selectedLayerId: string | null;
}

type DragMode = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | null;

function ProApp() {
  const [layers, setLayers] = useState<ImageLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const gridSize = 100;
  const snapThreshold = 15; // pixels
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [originalState, setOriginalState] = useState<ImageLayer | null>(null);
  const [shiftPressed, setShiftPressed] = useState(false);
  
  // Undo/Redo history
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Drag and drop reordering
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  // Save state to history
  const saveToHistory = useCallback(() => {
    const newState: HistoryState = { layers: [...layers], selectedLayerId };
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newState]);
    setHistoryIndex(prev => prev + 1);
  }, [layers, selectedLayerId, historyIndex]);

  // Undo/Redo keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey) setShiftPressed(true);
      
      // Cmd+Z for undo (Mac) or Ctrl+Z (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (historyIndex > 0) {
          const prevState = history[historyIndex - 1];
          setLayers(prevState.layers);
          setSelectedLayerId(prevState.selectedLayerId);
          setHistoryIndex(historyIndex - 1);
        }
      }
      
      // Cmd+Shift+Z for redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          const nextState = history[historyIndex + 1];
          setLayers(nextState.layers);
          setSelectedLayerId(nextState.selectedLayerId);
          setHistoryIndex(historyIndex + 1);
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.shiftKey) setShiftPressed(false);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [history, historyIndex]);

  // Initialize history
  useEffect(() => {
    if (history.length === 0) {
      saveToHistory();
    }
  }, []);

  // Snap to grid helper
  const snapToGridValue = (value: number) => {
    if (!snapToGrid) return value;
    const snapped = Math.round(value / gridSize) * gridSize;
    if (Math.abs(value - snapped) < snapThreshold) {
      return snapped;
    }
    return value;
  };

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
          x: snapToGridValue(500),
          y: snapToGridValue(500),
          width: width,
          height: height,
          visible: true,
          opacity: 1,
        };
        
        setLayers(prev => {
          const newLayers = [...prev, newLayer];
          // Save to history after state updates
          setTimeout(() => saveToHistory(), 0);
          return newLayers;
        });
        
        setImages(prev => ({ ...prev, [newLayer.id]: img }));
        setSelectedLayerId(newLayer.id);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [snapToGrid, saveToHistory]);

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
      for (let i = 0; i <= 2000; i += gridSize) {
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
        
        // Corners
        ctx.fillRect(layer.x - handleSize/2, layer.y - handleSize/2, handleSize, handleSize);
        ctx.fillRect(layer.x + layer.width - handleSize/2, layer.y - handleSize/2, handleSize, handleSize);
        ctx.fillRect(layer.x - handleSize/2, layer.y + layer.height - handleSize/2, handleSize, handleSize);
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
    
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible) continue;
      
      if (layer.id === selectedLayerId) {
        // Check resize handles
        if (Math.abs(x - layer.x) < handleSize && Math.abs(y - layer.y) < handleSize) {
          return { layer, mode: 'resize-tl' as DragMode };
        }
        if (Math.abs(x - (layer.x + layer.width)) < handleSize && Math.abs(y - layer.y) < handleSize) {
          return { layer, mode: 'resize-tr' as DragMode };
        }
        if (Math.abs(x - layer.x) < handleSize && Math.abs(y - (layer.y + layer.height)) < handleSize) {
          return { layer, mode: 'resize-bl' as DragMode };
        }
        if (Math.abs(x - (layer.x + layer.width)) < handleSize && Math.abs(y - (layer.y + layer.height)) < handleSize) {
          return { layer, mode: 'resize-br' as DragMode };
        }
      }
      
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
    
    if (dragMode && originalState && selectedLayerId) {
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;
      
      setLayers(prev => prev.map(layer => {
        if (layer.id !== selectedLayerId) return layer;
        
        if (dragMode === 'move') {
          return {
            ...layer,
            x: snapToGridValue(originalState.x + dx),
            y: snapToGridValue(originalState.y + dy)
          };
        } else if (dragMode.startsWith('resize')) {
          let newWidth = originalState.width;
          let newHeight = originalState.height;
          let newX = originalState.x;
          let newY = originalState.y;
          
          // Calculate new dimensions based on drag mode
          if (dragMode === 'resize-br') {
            newWidth = originalState.width + dx;
            newHeight = originalState.height + dy;
          } else if (dragMode === 'resize-tl') {
            newX = originalState.x + dx;
            newY = originalState.y + dy;
            newWidth = originalState.width - dx;
            newHeight = originalState.height - dy;
          } else if (dragMode === 'resize-tr') {
            newY = originalState.y + dy;
            newWidth = originalState.width + dx;
            newHeight = originalState.height - dy;
          } else if (dragMode === 'resize-bl') {
            newX = originalState.x + dx;
            newWidth = originalState.width - dx;
            newHeight = originalState.height + dy;
          }
          
          // Maintain aspect ratio if Shift is pressed
          if (shiftPressed) {
            const aspectRatio = originalState.width / originalState.height;
            
            if (dragMode === 'resize-br') {
              const avgDelta = (dx + dy) / 2;
              newWidth = originalState.width + avgDelta * aspectRatio;
              newHeight = originalState.height + avgDelta;
            } else if (dragMode === 'resize-tl') {
              const avgDelta = (dx + dy) / 2;
              newX = originalState.x + avgDelta;
              newY = originalState.y + avgDelta / aspectRatio;
              newWidth = originalState.width - avgDelta;
              newHeight = originalState.height - avgDelta / aspectRatio;
            } else if (dragMode === 'resize-tr') {
              newWidth = originalState.width + dx;
              newHeight = newWidth / aspectRatio;
              newY = originalState.y - (newHeight - originalState.height);
            } else if (dragMode === 'resize-bl') {
              newWidth = originalState.width - dx;
              newHeight = newWidth / aspectRatio;
              newX = originalState.x + dx;
            }
          }
          
          // Apply minimum size constraint
          newWidth = Math.max(50, newWidth);
          newHeight = Math.max(50, newHeight);
          
          return {
            ...layer,
            x: snapToGrid ? snapToGridValue(newX) : newX,
            y: snapToGrid ? snapToGridValue(newY) : newY,
            width: newWidth,
            height: newHeight
          };
        }
        return layer;
      }));
    }
  };

  const handleMouseUp = () => {
    if (dragMode) {
      saveToHistory();
    }
    setDragMode(null);
    setOriginalState(null);
  };

  // Layer management functions
  const toggleLayerVisibility = (id: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
    saveToHistory();
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
    saveToHistory();
  };

  const updateLayerOpacity = (id: string, opacity: number) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, opacity } : layer
    ));
  };

  // Drag and drop layer reordering
  const handleLayerDragStart = (e: React.DragEvent, layerId: string) => {
    setDraggedLayerId(layerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleLayerDragOver = (e: React.DragEvent, layerId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLayerId(layerId);
  };

  const handleLayerDrop = (e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault();
    
    if (draggedLayerId && draggedLayerId !== targetLayerId) {
      const draggedIndex = layers.findIndex(l => l.id === draggedLayerId);
      const targetIndex = layers.findIndex(l => l.id === targetLayerId);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const newLayers = [...layers];
        const [draggedLayer] = newLayers.splice(draggedIndex, 1);
        newLayers.splice(targetIndex, 0, draggedLayer);
        setLayers(newLayers);
        saveToHistory();
      }
    }
    
    setDraggedLayerId(null);
    setDragOverLayerId(null);
  };

  const handleLayerDragEnd = () => {
    setDraggedLayerId(null);
    setDragOverLayerId(null);
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
          
          {/* Layers with drag and drop */}
          <div>
            <h3 className="font-semibold mb-2">Layers (drag to reorder)</h3>
            <div className="space-y-2">
              {[...layers].reverse().map(layer => (
                <div
                  key={layer.id}
                  draggable
                  onDragStart={(e) => handleLayerDragStart(e, layer.id)}
                  onDragOver={(e) => handleLayerDragOver(e, layer.id)}
                  onDrop={(e) => handleLayerDrop(e, layer.id)}
                  onDragEnd={handleLayerDragEnd}
                  className={`p-3 rounded border cursor-move transition-all ${
                    selectedLayerId === layer.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                  } ${
                    dragOverLayerId === layer.id ? 'border-t-4 border-t-indigo-500' : ''
                  } ${
                    draggedLayerId === layer.id ? 'opacity-50' : ''
                  }`}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">☰</span>
                      <span className="text-sm truncate flex-1">{layer.name}</span>
                    </div>
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
                        onMouseUp={saveToHistory}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-4 py-2 rounded transition-colors ${
                  showGrid ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                {showGrid ? 'Hide Grid' : 'Show Grid'}
              </button>
              
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`px-4 py-2 rounded transition-colors ${
                  snapToGrid ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Snap: {snapToGrid ? 'On' : 'Off'}
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
            </div>
            
            <div className="text-sm text-gray-600">
              Hold Shift for proportional resize • Cmd+Z to undo • Drag layers to reorder
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

export default ProApp;