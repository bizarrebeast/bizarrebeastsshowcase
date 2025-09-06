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
  // Animation properties
  animated: boolean;
  patrolWidth: number; // How far to patrol left/right from center
  patrolSpeed: number; // Speed of patrol movement
  enableBlink: boolean;
  blinkInterval: number; // Time between blinks in ms
  enableEyeMovement: boolean;
  flipOnTurn: boolean; // Whether to flip sprite when changing direction
}

interface AnimationState {
  currentX: number;
  direction: 1 | -1; // 1 = right, -1 = left
  isBlinking: boolean;
  blinkStartTime: number;
  lastBlinkTime: number;
  eyeOffset: { x: number; y: number };
  flipped: boolean;
}

type DragMode = 'move' | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br' | null;

function AnimatedApp() {
  const [layers, setLayers] = useState<ImageLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const gridSize = 100;
  const snapThreshold = 15;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [originalState, setOriginalState] = useState<ImageLayer | null>(null);
  const [shiftPressed, setShiftPressed] = useState(false);
  
  // Animation states for each layer
  const [animationStates, setAnimationStates] = useState<{ [key: string]: AnimationState }>({});
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

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
          // Animation defaults
          animated: false,
          patrolWidth: 100,
          patrolSpeed: 50,
          enableBlink: true,
          blinkInterval: 3000,
          enableEyeMovement: true,
          flipOnTurn: true,
        };
        
        setLayers(prev => [...prev, newLayer]);
        setImages(prev => ({ ...prev, [newLayer.id]: img }));
        setSelectedLayerId(newLayer.id);
        
        // Initialize animation state
        setAnimationStates(prev => ({
          ...prev,
          [newLayer.id]: {
            currentX: newLayer.x,
            direction: 1,
            isBlinking: false,
            blinkStartTime: 0,
            lastBlinkTime: Date.now(),
            eyeOffset: { x: 0, y: 0 },
            flipped: false,
          }
        }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTimeRef.current;
      lastTimeRef.current = currentTime;

      setAnimationStates(prevStates => {
        const newStates = { ...prevStates };
        
        layers.forEach(layer => {
          if (!layer.animated || !layer.visible) return;
          
          const state = newStates[layer.id];
          if (!state) return;
          
          // Update patrol position
          const speed = layer.patrolSpeed / 1000; // Convert to pixels per ms
          const movement = speed * deltaTime * state.direction;
          state.currentX += movement;
          
          // Check bounds and flip direction
          const centerX = layer.x;
          const leftBound = centerX - layer.patrolWidth / 2;
          const rightBound = centerX + layer.patrolWidth / 2;
          
          if (state.currentX <= leftBound) {
            state.currentX = leftBound;
            state.direction = 1;
            state.flipped = false;
          } else if (state.currentX >= rightBound) {
            state.currentX = rightBound;
            state.direction = -1;
            state.flipped = layer.flipOnTurn;
          }
          
          // Handle blinking
          if (layer.enableBlink) {
            const timeSinceLastBlink = currentTime - state.lastBlinkTime;
            
            if (state.isBlinking) {
              // Blink duration is 150ms
              if (currentTime - state.blinkStartTime > 150) {
                state.isBlinking = false;
              }
            } else if (timeSinceLastBlink > layer.blinkInterval) {
              state.isBlinking = true;
              state.blinkStartTime = currentTime;
              state.lastBlinkTime = currentTime;
            }
          }
          
          // Handle eye movement (subtle random movements)
          if (layer.enableEyeMovement && !state.isBlinking) {
            // Update eye position every 500-1000ms
            if (Math.random() < 0.002) {
              state.eyeOffset = {
                x: (Math.random() - 0.5) * 4,
                y: (Math.random() - 0.5) * 4
              };
            }
          }
        });
        
        return newStates;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, layers]);

  // Snap to grid helper
  const snapToGridValue = (value: number) => {
    if (!snapToGrid) return value;
    const snapped = Math.round(value / gridSize) * gridSize;
    if (Math.abs(value - snapped) < snapThreshold) {
      return snapped;
    }
    return value;
  };

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
      
      const state = animationStates[layer.id];
      const drawX = layer.animated && state ? state.currentX : layer.x;
      
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      
      // Apply flip transformation if needed
      if (state?.flipped) {
        ctx.translate(drawX + layer.width, layer.y);
        ctx.scale(-1, 1);
        ctx.drawImage(images[layer.id], 0, 0, layer.width, layer.height);
      } else {
        ctx.drawImage(images[layer.id], drawX, layer.y, layer.width, layer.height);
      }
      
      // Draw eye overlay effects (simplified representation)
      if (layer.animated && state) {
        if (state.isBlinking) {
          // Draw closed eyes (black rectangles over eye area)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
          const eyeY = layer.y + layer.height * 0.3;
          const eyeHeight = layer.height * 0.1;
          
          if (state.flipped) {
            ctx.fillRect(layer.width * 0.3, eyeY - layer.y, layer.width * 0.15, eyeHeight);
            ctx.fillRect(layer.width * 0.55, eyeY - layer.y, layer.width * 0.15, eyeHeight);
          } else {
            ctx.fillRect(drawX + layer.width * 0.3, eyeY, layer.width * 0.15, eyeHeight);
            ctx.fillRect(drawX + layer.width * 0.55, eyeY, layer.width * 0.15, eyeHeight);
          }
        }
        
        // Draw patrol bounds indicator when selected
        if (layer.id === selectedLayerId && layer.animated) {
          ctx.strokeStyle = 'rgba(79, 70, 229, 0.3)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          const leftBound = layer.x - layer.patrolWidth / 2;
          const rightBound = layer.x + layer.patrolWidth / 2;
          ctx.beginPath();
          ctx.moveTo(leftBound, layer.y - 10);
          ctx.lineTo(leftBound, layer.y + layer.height + 10);
          ctx.moveTo(rightBound, layer.y - 10);
          ctx.lineTo(rightBound, layer.y + layer.height + 10);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      
      // Draw selection border
      if (layer.id === selectedLayerId) {
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;
        const selX = layer.animated && state ? state.currentX : layer.x;
        ctx.strokeRect(selX, layer.y, layer.width, layer.height);
        
        // Draw resize handles only when not playing
        if (!isPlaying) {
          const handleSize = 10;
          ctx.fillStyle = '#4f46e5';
          ctx.fillRect(layer.x - handleSize/2, layer.y - handleSize/2, handleSize, handleSize);
          ctx.fillRect(layer.x + layer.width - handleSize/2, layer.y - handleSize/2, handleSize, handleSize);
          ctx.fillRect(layer.x - handleSize/2, layer.y + layer.height - handleSize/2, handleSize, handleSize);
          ctx.fillRect(layer.x + layer.width - handleSize/2, layer.y + layer.height - handleSize/2, handleSize, handleSize);
        }
      }
      
      ctx.restore();
    });
  }, [layers, images, backgroundColor, showGrid, selectedLayerId, animationStates, isPlaying]);

  // Layer management functions
  const updateLayer = (id: string, updates: Partial<ImageLayer>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // Mouse handling functions (simplified for brevity)
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

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying) return; // Disable interaction during animation
    const pos = getCursorPosition(e);
    
    // Find clicked layer
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      if (!layer.visible) continue;
      if (pos.x >= layer.x && pos.x <= layer.x + layer.width &&
          pos.y >= layer.y && pos.y <= layer.y + layer.height) {
        setSelectedLayerId(layer.id);
        return;
      }
    }
    setSelectedLayerId(null);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-96 bg-white shadow-lg overflow-y-auto">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-gray-800">BUTQ Showcase</h1>
          <p className="text-sm text-gray-600 mt-1">Character Animation Tool</p>
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
          
          {/* Animation Controls for Selected Layer */}
          {selectedLayerId && layers.find(l => l.id === selectedLayerId) && (
            <div className="bg-indigo-50 rounded-lg p-4">
              <h3 className="font-semibold mb-3">Animation Settings</h3>
              {(() => {
                const layer = layers.find(l => l.id === selectedLayerId)!;
                return (
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={layer.animated}
                        onChange={(e) => updateLayer(selectedLayerId, { animated: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm">Enable Animation</span>
                    </label>
                    
                    {layer.animated && (
                      <>
                        <div>
                          <label className="text-xs text-gray-600">Patrol Width</label>
                          <input
                            type="range"
                            min="50"
                            max="400"
                            value={layer.patrolWidth}
                            onChange={(e) => updateLayer(selectedLayerId, { patrolWidth: Number(e.target.value) })}
                            className="w-full"
                          />
                          <span className="text-xs">{layer.patrolWidth}px</span>
                        </div>
                        
                        <div>
                          <label className="text-xs text-gray-600">Patrol Speed</label>
                          <input
                            type="range"
                            min="10"
                            max="200"
                            value={layer.patrolSpeed}
                            onChange={(e) => updateLayer(selectedLayerId, { patrolSpeed: Number(e.target.value) })}
                            className="w-full"
                          />
                          <span className="text-xs">{layer.patrolSpeed}px/s</span>
                        </div>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={layer.flipOnTurn}
                            onChange={(e) => updateLayer(selectedLayerId, { flipOnTurn: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm">Flip Sprite on Turn</span>
                        </label>
                        
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={layer.enableBlink}
                            onChange={(e) => updateLayer(selectedLayerId, { enableBlink: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm">Enable Blinking</span>
                        </label>
                        
                        {layer.enableBlink && (
                          <div>
                            <label className="text-xs text-gray-600">Blink Interval</label>
                            <input
                              type="range"
                              min="1000"
                              max="5000"
                              step="100"
                              value={layer.blinkInterval}
                              onChange={(e) => updateLayer(selectedLayerId, { blinkInterval: Number(e.target.value) })}
                              className="w-full"
                            />
                            <span className="text-xs">{layer.blinkInterval}ms</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
          
          {/* Layers */}
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
                    <div className="flex items-center gap-2">
                      <span className="text-sm truncate">{layer.name}</span>
                      {layer.animated && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          Animated
                        </span>
                      )}
                    </div>
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
              ))}
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
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-6 py-2 rounded font-medium transition-colors ${
                  isPlaying 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play Animation'}
              </button>
              
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`px-4 py-2 rounded transition-colors ${
                  showGrid ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Grid: {showGrid ? 'On' : 'Off'}
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
              {isPlaying ? 'Animation playing...' : 'Click Play to preview animations'}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="pt-20 h-full flex items-center justify-center overflow-auto bg-gray-100">
          <canvas
            ref={canvasRef}
            width={2000}
            height={2000}
            style={{ 
              width: '800px', 
              height: '800px',
              border: '2px solid #e5e7eb',
              backgroundColor: 'white',
              cursor: isPlaying ? 'default' : 'pointer'
            }}
            className="shadow-xl"
            onClick={handleCanvasClick}
          />
        </div>
      </div>
    </div>
  );
}

export default AnimatedApp;