import React, { useState, useCallback, useRef, useEffect } from 'react';
import './index.css';

interface SpriteFrame {
  id: string;
  name: string;
  src: string;
  duration: number; // milliseconds to show this frame
}

interface AnimationSequence {
  id: string;
  name: string;
  frames: string[]; // Array of frame IDs in order
  loop: boolean;
}

interface CharacterLayer {
  id: string;
  name: string;
  sprites: SpriteFrame[]; // All available sprites for this character
  sequence: AnimationSequence;
  x: number;
  y: number;
  width: number;
  height: number;
  spriteWidth: number; // Fixed width for all sprites
  spriteHeight: number; // Fixed height for all sprites
  visible: boolean;
  opacity: number;
  // Movement animation
  animated: boolean;
  patrolWidth: number;
  patrolSpeed: number;
  flipOnTurn: boolean;
}

interface AnimationState {
  currentFrameIndex: number;
  frameStartTime: number;
  currentX: number;
  direction: 1 | -1;
  flipped: boolean;
}

function SpriteSequenceApp() {
  const [layers, setLayers] = useState<CharacterLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showGrid, setShowGrid] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const gridSize = 100;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const [animationStates, setAnimationStates] = useState<{ [key: string]: AnimationState }>({});
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  // Drag and drop for sequence
  const [draggedFrameId, setDraggedFrameId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  // Drag and drop for file upload
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  // Create new character layer
  const createNewCharacter = useCallback((name: string) => {
    const newLayer: CharacterLayer = {
      id: `layer-${Date.now()}`,
      name,
      sprites: [],
      sequence: {
        id: `seq-${Date.now()}`,
        name: 'Default Sequence',
        frames: [],
        loop: true
      },
      x: 500,
      y: 500,
      width: 200,
      height: 200,
      spriteWidth: 200,
      spriteHeight: 200,
      visible: true,
      opacity: 1,
      animated: false,
      patrolWidth: 200,
      patrolSpeed: 50,
      flipOnTurn: true,
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    
    // Initialize animation state
    setAnimationStates(prev => ({
      ...prev,
      [newLayer.id]: {
        currentFrameIndex: 0,
        frameStartTime: 0,
        currentX: newLayer.x,
        direction: 1,
        flipped: false,
      }
    }));
  }, []);

  // Handle sprite upload for selected character
  const handleSpriteUpload = useCallback((files: FileList | null) => {
    if (!selectedLayerId) {
      alert('Please create a character first');
      return;
    }
    
    if (!files) return;
    
    // Limit to 10 files at a time
    const filesToProcess = Array.from(files).slice(0, 10);
    
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const spriteFrame: SpriteFrame = {
            id: `sprite-${Date.now()}-${Math.random()}`,
            name: file.name,
            src: event.target?.result as string,
            duration: 200 // Default 200ms per frame
          };
          
          // Add sprite to selected layer
          setLayers(prev => prev.map(layer => {
            if (layer.id === selectedLayerId) {
              const updatedLayer = {
                ...layer,
                sprites: [...layer.sprites, spriteFrame]
              };
              // Auto-add to sequence if it's the first sprite
              if (layer.sequence.frames.length === 0) {
                updatedLayer.sequence.frames = [spriteFrame.id];
              }
              return updatedLayer;
            }
            return layer;
          }));
          
          // Store image
          setImages(prev => ({ ...prev, [spriteFrame.id]: img }));
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, [selectedLayerId]);

  // Handle file drop
  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSpriteUpload(e.dataTransfer.files);
    }
  }, [handleSpriteUpload]);

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFiles(true);
  }, []);

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFiles(false);
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
          if (!layer.visible) return;
          
          const state = newStates[layer.id];
          if (!state) return;
          
          // Update movement animation
          if (layer.animated) {
            const speed = layer.patrolSpeed / 1000;
            const movement = speed * deltaTime * state.direction;
            state.currentX += movement;
            
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
          }
          
          // Update sprite frame animation
          if (layer.sequence.frames.length > 0) {
            const currentFrame = layer.sprites.find(s => 
              s.id === layer.sequence.frames[state.currentFrameIndex]
            );
            
            if (currentFrame && currentTime - state.frameStartTime > currentFrame.duration) {
              // Move to next frame
              state.currentFrameIndex = (state.currentFrameIndex + 1) % layer.sequence.frames.length;
              state.frameStartTime = currentTime;
              
              // Handle non-looping sequences
              if (!layer.sequence.loop && state.currentFrameIndex === 0) {
                state.currentFrameIndex = layer.sequence.frames.length - 1;
              }
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

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      if (!layer.visible) return;
      
      const state = animationStates[layer.id];
      if (!state || layer.sequence.frames.length === 0) return;
      
      const currentFrameId = layer.sequence.frames[state.currentFrameIndex];
      const currentImage = images[currentFrameId];
      if (!currentImage) return;
      
      const drawX = layer.animated ? state.currentX : layer.x;
      
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      
      // Apply flip transformation if needed
      if (state.flipped) {
        ctx.translate(drawX + layer.spriteWidth, layer.y);
        ctx.scale(-1, 1);
        ctx.drawImage(currentImage, 0, 0, layer.spriteWidth, layer.spriteHeight);
      } else {
        ctx.drawImage(currentImage, drawX, layer.y, layer.spriteWidth, layer.spriteHeight);
      }
      
      // Draw patrol bounds when selected and animated
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
      
      // Draw selection border
      if (layer.id === selectedLayerId) {
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, layer.y, layer.spriteWidth, layer.spriteHeight);
      }
      
      ctx.restore();
    });
  }, [layers, images, backgroundColor, showGrid, selectedLayerId, animationStates]);

  // Layer management
  const updateLayer = (id: string, updates: Partial<CharacterLayer>) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  };

  // Sequence management
  const handleFrameDragStart = (e: React.DragEvent, frameId: string) => {
    setDraggedFrameId(frameId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleFrameDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleFrameDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!selectedLayerId || !draggedFrameId) return;
    
    setLayers(prev => prev.map(layer => {
      if (layer.id === selectedLayerId) {
        const newFrames = [...layer.sequence.frames];
        const draggedIndex = newFrames.indexOf(draggedFrameId);
        
        if (draggedIndex !== -1) {
          // Reorder existing frame
          newFrames.splice(draggedIndex, 1);
          newFrames.splice(dropIndex, 0, draggedFrameId);
        } else {
          // Add new frame from sprite list
          newFrames.splice(dropIndex, 0, draggedFrameId);
        }
        
        return {
          ...layer,
          sequence: { ...layer.sequence, frames: newFrames }
        };
      }
      return layer;
    }));
    
    setDraggedFrameId(null);
    setDragOverIndex(null);
  };

  const removeFrameFromSequence = (frameId: string) => {
    if (!selectedLayerId) return;
    
    setLayers(prev => prev.map(layer => {
      if (layer.id === selectedLayerId) {
        return {
          ...layer,
          sequence: {
            ...layer.sequence,
            frames: layer.sequence.frames.filter(f => f !== frameId)
          }
        };
      }
      return layer;
    }));
  };

  const updateFrameDuration = (frameId: string, duration: number) => {
    if (!selectedLayerId) return;
    
    setLayers(prev => prev.map(layer => {
      if (layer.id === selectedLayerId) {
        return {
          ...layer,
          sprites: layer.sprites.map(sprite =>
            sprite.id === frameId ? { ...sprite, duration } : sprite
          )
        };
      }
      return layer;
    }));
  };

  // Add sprite to sequence by clicking
  const addSpriteToSequence = (spriteId: string) => {
    if (!selectedLayerId) return;
    
    setLayers(prev => prev.map(layer => {
      if (layer.id === selectedLayerId) {
        return {
          ...layer,
          sequence: {
            ...layer.sequence,
            frames: [...layer.sequence.frames, spriteId]
          }
        };
      }
      return layer;
    }));
  };

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-[480px] bg-white shadow-lg overflow-y-auto">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-gray-800">BUTQ Sprite Animator</h1>
          <p className="text-sm text-gray-600 mt-1">Sprite Sequence & Movement Tool</p>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Create Character */}
          <div className="bg-gray-50 rounded-lg p-4">
            <button
              onClick={() => createNewCharacter(`Character ${layers.length + 1}`)}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              + Create New Character
            </button>
          </div>
          
          {/* Character Layers */}
          <div>
            <h3 className="font-semibold mb-2">Characters</h3>
            <div className="space-y-2">
              {layers.map(layer => (
                <div
                  key={layer.id}
                  className={`p-3 rounded border cursor-pointer ${
                    selectedLayerId === layer.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">{layer.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {layer.sprites.length} sprites
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(layer.id);
                        }}
                        className="text-red-600 hover:bg-red-100 px-2 py-1 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Selected Character Controls */}
          {selectedLayer && (
            <>
              {/* Sprite Upload with Drag and Drop */}
              <div 
                className={`bg-blue-50 rounded-lg p-4 transition-all ${
                  isDraggingFiles ? 'bg-blue-100 border-2 border-blue-400' : ''
                }`}
                onDrop={handleFileDrop}
                onDragOver={handleFileDragOver}
                onDragLeave={handleFileDragLeave}
              >
                <h3 className="font-semibold mb-2">Add Sprite Frames</h3>
                <div className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                  isDraggingFiles ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
                }`}>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleSpriteUpload(e.target.files)}
                    className="hidden"
                    id="sprite-upload"
                  />
                  <label htmlFor="sprite-upload" className="cursor-pointer">
                    <svg
                      className="w-8 h-8 mx-auto mb-2 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-sm font-medium text-gray-700">
                      {isDraggingFiles ? 'Drop sprites here!' : 'Drop sprites or click to browse'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Up to 10 images at once (PNG, JPG)
                    </p>
                  </label>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Upload eye positions, blink states, expressions, etc.
                </p>
              </div>
              
              {/* Sprite Size Settings */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Sprite Dimensions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-600">Width (px)</label>
                    <input
                      type="number"
                      value={selectedLayer.spriteWidth}
                      onChange={(e) => updateLayer(selectedLayerId!, { 
                        spriteWidth: Number(e.target.value) 
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                      min="50"
                      max="800"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Height (px)</label>
                    <input
                      type="number"
                      value={selectedLayer.spriteHeight}
                      onChange={(e) => updateLayer(selectedLayerId!, { 
                        spriteHeight: Number(e.target.value) 
                      })}
                      className="w-full px-2 py-1 border rounded text-sm"
                      min="50"
                      max="800"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  All sprites will display at this size
                </p>
              </div>
              
              {/* Available Sprites */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Available Sprites (click to add to sequence)</h3>
                <div className="grid grid-cols-4 gap-2">
                  {selectedLayer.sprites.map(sprite => (
                    <div
                      key={sprite.id}
                      draggable
                      onDragStart={(e) => handleFrameDragStart(e, sprite.id)}
                      onClick={() => addSpriteToSequence(sprite.id)}
                      className="relative group cursor-pointer hover:scale-105 transition-transform"
                      title="Click to add to sequence or drag to reorder"
                    >
                      <img
                        src={sprite.src}
                        alt={sprite.name}
                        className="w-full h-16 object-cover rounded border-2 border-gray-300 hover:border-indigo-500"
                      />
                      <div className="absolute inset-0 bg-indigo-500 bg-opacity-0 hover:bg-opacity-10 rounded transition-opacity" />
                    </div>
                  ))}
                </div>
                {selectedLayer.sprites.length === 0 && (
                  <p className="text-sm text-gray-500">No sprites uploaded yet</p>
                )}
              </div>
              
              {/* Animation Sequence */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Animation Sequence</h3>
                <div className="space-y-2">
                  {selectedLayer.sequence.frames.map((frameId, index) => {
                    const sprite = selectedLayer.sprites.find(s => s.id === frameId);
                    if (!sprite) return null;
                    
                    return (
                      <div
                        key={`${frameId}-${index}`}
                        draggable
                        onDragStart={(e) => handleFrameDragStart(e, frameId)}
                        onDragOver={(e) => handleFrameDragOver(e, index)}
                        onDrop={(e) => handleFrameDrop(e, index)}
                        className={`flex items-center gap-2 p-2 bg-white rounded border ${
                          dragOverIndex === index ? 'border-indigo-500' : 'border-gray-200'
                        }`}
                      >
                        <span className="text-gray-400">☰</span>
                        <img
                          src={sprite.src}
                          alt={sprite.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="flex-1">
                          <p className="text-xs font-medium">{sprite.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="number"
                              value={sprite.duration}
                              onChange={(e) => updateFrameDuration(sprite.id, Number(e.target.value))}
                              className="w-20 text-xs px-1 py-0.5 border rounded"
                              min="50"
                              step="50"
                            />
                            <span className="text-xs text-gray-500">ms</span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFrameFromSequence(frameId)}
                          className="text-red-600 hover:bg-red-100 px-2 py-1 rounded"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                  {selectedLayer.sequence.frames.length === 0 && (
                    <div
                      onDragOver={(e) => handleFrameDragOver(e, 0)}
                      onDrop={(e) => handleFrameDrop(e, 0)}
                      className="border-2 border-dashed border-gray-300 rounded p-4 text-center"
                    >
                      <p className="text-sm text-gray-500">
                        Drag sprites here to create sequence
                      </p>
                    </div>
                  )}
                </div>
                
                <label className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    checked={selectedLayer.sequence.loop}
                    onChange={(e) => updateLayer(selectedLayerId!, {
                      sequence: { ...selectedLayer.sequence, loop: e.target.checked }
                    })}
                    className="mr-2"
                  />
                  <span className="text-sm">Loop animation</span>
                </label>
              </div>
              
              {/* Movement Settings */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold mb-3">Movement Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedLayer.animated}
                      onChange={(e) => updateLayer(selectedLayerId!, { animated: e.target.checked })}
                      className="mr-2"
                    />
                    <span className="text-sm">Enable Patrol Movement</span>
                  </label>
                  
                  {selectedLayer.animated && (
                    <>
                      <div>
                        <label className="text-xs text-gray-600">Patrol Width</label>
                        <input
                          type="range"
                          min="50"
                          max="400"
                          value={selectedLayer.patrolWidth}
                          onChange={(e) => updateLayer(selectedLayerId!, { patrolWidth: Number(e.target.value) })}
                          className="w-full"
                        />
                        <span className="text-xs">{selectedLayer.patrolWidth}px</span>
                      </div>
                      
                      <div>
                        <label className="text-xs text-gray-600">Patrol Speed</label>
                        <input
                          type="range"
                          min="10"
                          max="200"
                          value={selectedLayer.patrolSpeed}
                          onChange={(e) => updateLayer(selectedLayerId!, { patrolSpeed: Number(e.target.value) })}
                          className="w-full"
                        />
                        <span className="text-xs">{selectedLayer.patrolSpeed}px/s</span>
                      </div>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedLayer.flipOnTurn}
                          onChange={(e) => updateLayer(selectedLayerId!, { flipOnTurn: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm">Flip Sprite on Turn</span>
                      </label>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
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
              {isPlaying ? 'Animation playing...' : 'Set up sprites and sequence, then play'}
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
              backgroundColor: 'white'
            }}
            className="shadow-xl"
          />
        </div>
      </div>
    </div>
  );
}

export default SpriteSequenceApp;