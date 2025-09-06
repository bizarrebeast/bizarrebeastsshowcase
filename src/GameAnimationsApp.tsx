import React, { useState, useCallback, useRef, useEffect } from 'react';
import './index.css';

interface SpriteFrame {
  id: string;
  name: string;
  src: string;
  duration: number;
}

interface AnimationSequence {
  id: string;
  name: string;
  frames: string[];
  loop: boolean;
}

// Exact game animation presets
interface GameAnimationPreset {
  name: string;
  enemyType: 'rex' | 'cat' | 'baseblu' | 'beetle' | 'custom';
  description: string;
  spriteSequence: {
    frameOrder: number[]; // Index order for sprites (e.g., [0,1,0,1] for alternating between first two)
    frameDurations: number[]; // Duration for each frame in sequence
  };
  movement: {
    horizontalPatrolWidth: number;
    verticalJumpHeight: number;
    bounceInterval: number; // Time between bounces in ms
    rotationDuringJump: boolean;
    rotationSpeed: number;
    blinkPattern?: {
      interval: number;
      duration: number;
      frameIndex: number; // Which sprite frame is the "blink"
    };
  };
}

const GAME_ANIMATION_PRESETS: GameAnimationPreset[] = [
  {
    name: 'Rex Bounce',
    enemyType: 'rex',
    description: 'Rex enemy with rotation flip and periodic bounce',
    spriteSequence: {
      frameOrder: [0, 1], // Alternates between eyes open and blinking
      frameDurations: [2000, 150] // Eyes open for 2s, blink for 150ms
    },
    movement: {
      horizontalPatrolWidth: 200,
      verticalJumpHeight: 100,
      bounceInterval: 2000, // Bounce every 1.5-3 seconds (avg 2s)
      rotationDuringJump: true,
      rotationSpeed: 0.008,
      blinkPattern: {
        interval: 2000,
        duration: 150,
        frameIndex: 1
      }
    }
  },
  {
    name: 'Cat Stalker',
    enemyType: 'cat',
    description: 'Cat with hidden stalker behavior and pounce',
    spriteSequence: {
      frameOrder: [0], // Single frame, behavior-based
      frameDurations: [100]
    },
    movement: {
      horizontalPatrolWidth: 300,
      verticalJumpHeight: 0,
      bounceInterval: 3000, // Time between stalker phases
      rotationDuringJump: false,
      rotationSpeed: 0
    }
  },
  {
    name: 'BaseBlu Patrol',
    enemyType: 'baseblu',
    description: 'Simple patrol with eye animations',
    spriteSequence: {
      frameOrder: [0, 1, 0, 1], // Eye animation pattern
      frameDurations: [500, 100, 500, 100]
    },
    movement: {
      horizontalPatrolWidth: 200,
      verticalJumpHeight: 0,
      bounceInterval: 0,
      rotationDuringJump: false,
      rotationSpeed: 0
    }
  },
  {
    name: 'Beetle Roll',
    enemyType: 'beetle',
    description: 'Rolling movement with continuous rotation',
    spriteSequence: {
      frameOrder: [0],
      frameDurations: [100]
    },
    movement: {
      horizontalPatrolWidth: 250,
      verticalJumpHeight: 0,
      bounceInterval: 0,
      rotationDuringJump: false,
      rotationSpeed: 0.01 // Continuous rolling
    }
  }
];

interface CharacterLayer {
  id: string;
  name: string;
  sprites: SpriteFrame[];
  sequence: AnimationSequence;
  x: number;
  y: number;
  width: number;
  height: number;
  spriteWidth: number;
  spriteHeight: number;
  visible: boolean;
  opacity: number;
  spriteFacingDirection: 'left' | 'right';
  gameAnimation: GameAnimationPreset | null;
  customPatrolWidth: number;
  customJumpHeight: number;
}

interface AnimationState {
  currentFrameIndex: number;
  frameStartTime: number;
  currentX: number;
  currentY: number;
  baseY: number;
  direction: 1 | -1;
  flipped: boolean;
  rotation: number;
  bounceTimer: number;
  blinkTimer: number;
  isJumping: boolean;
  sequenceIndex: number; // For prescribed sequences
}

function GameAnimationsApp() {
  const [layers, setLayers] = useState<CharacterLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundImageObj, setBackgroundImageObj] = useState<HTMLImageElement | null>(null);
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const gridSize = 100;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const [animationStates, setAnimationStates] = useState<{ [key: string]: AnimationState }>({});
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  const [draggedFrameId, setDraggedFrameId] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  
  // Interaction states for positioning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Export settings
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSize, setExportSize] = useState('2000');

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
      spriteFacingDirection: 'right',
      gameAnimation: null,
      customPatrolWidth: 200,
      customJumpHeight: 100
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    
    setAnimationStates(prev => ({
      ...prev,
      [newLayer.id]: {
        currentFrameIndex: 0,
        frameStartTime: 0,
        currentX: newLayer.x,
        currentY: newLayer.y,
        baseY: newLayer.y,
        direction: 1,
        flipped: newLayer.spriteFacingDirection === 'left', // Start flipped if sprite faces left but moving right
        rotation: 0,
        bounceTimer: 0,
        blinkTimer: 0,
        isJumping: false,
        sequenceIndex: 0
      }
    }));
  }, []);

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || !selectedLayerId) return;
    
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer) return;
    
    const maxFiles = Math.min(files.length, 10);
    const newSprites: SpriteFrame[] = [];
    const newImages: { [key: string]: HTMLImageElement } = {};
    
    for (let i = 0; i < maxFiles; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      
      const reader = new FileReader();
      const src = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      const img = new Image();
      img.src = src;
      await new Promise((resolve) => {
        img.onload = resolve;
      });
      
      const frameId = `frame-${Date.now()}-${i}`;
      newSprites.push({
        id: frameId,
        name: file.name,
        src,
        duration: 100
      });
      newImages[frameId] = img;
    }
    
    if (newSprites.length > 0) {
      setLayers(prev => prev.map(l => 
        l.id === selectedLayerId 
          ? { ...l, sprites: [...l.sprites, ...newSprites] }
          : l
      ));
      setImages(prev => ({ ...prev, ...newImages }));
    }
  }, [layers, selectedLayerId]);

  const applyGameAnimation = useCallback((preset: GameAnimationPreset) => {
    if (!selectedLayerId) return;
    
    const layer = layers.find(l => l.id === selectedLayerId);
    if (!layer || layer.sprites.length === 0) {
      alert('Please add sprites first!');
      return;
    }
    
    // Build the animation sequence based on the preset
    const newFrames: string[] = [];
    preset.spriteSequence.frameOrder.forEach((frameIndex) => {
      if (layer.sprites[frameIndex]) {
        newFrames.push(layer.sprites[frameIndex].id);
      }
    });
    
    // Update frame durations based on preset
    const updatedSprites = layer.sprites.map((sprite, index) => {
      const presetIndex = preset.spriteSequence.frameOrder.indexOf(index);
      if (presetIndex !== -1 && preset.spriteSequence.frameDurations[presetIndex]) {
        return { ...sprite, duration: preset.spriteSequence.frameDurations[presetIndex] };
      }
      return sprite;
    });
    
    setLayers(prev => prev.map(l => 
      l.id === selectedLayerId 
        ? { 
            ...l, 
            sprites: updatedSprites,
            sequence: { ...l.sequence, frames: newFrames },
            gameAnimation: preset,
            customPatrolWidth: preset.movement.horizontalPatrolWidth,
            customJumpHeight: preset.movement.verticalJumpHeight
          }
        : l
    ));
    
    // Reset animation state for the preset
    setAnimationStates(prev => ({
      ...prev,
      [selectedLayerId]: {
        ...prev[selectedLayerId],
        currentFrameIndex: 0,
        sequenceIndex: 0,
        bounceTimer: 0,
        blinkTimer: 0,
        rotation: 0,
        isJumping: false
      }
    }));
  }, [selectedLayerId, layers]);

  const animate = useCallback((currentTime: number) => {
    if (!isPlaying) return;
    
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;
    
    setAnimationStates(prev => {
      const newStates = { ...prev };
      
      layers.forEach(layer => {
        if (!layer.visible || !layer.gameAnimation) return;
        
        const state = newStates[layer.id];
        if (!state) return;
        
        const preset = layer.gameAnimation;
        
        // Handle prescribed sprite sequence
        if (preset.spriteSequence.frameOrder.length > 0) {
          const currentDuration = preset.spriteSequence.frameDurations[state.sequenceIndex] || 100;
          
          if (currentTime - state.frameStartTime >= currentDuration) {
            // Move to next in prescribed sequence
            state.sequenceIndex = (state.sequenceIndex + 1) % preset.spriteSequence.frameOrder.length;
            state.currentFrameIndex = preset.spriteSequence.frameOrder[state.sequenceIndex];
            state.frameStartTime = currentTime;
          }
        }
        
        // Handle movement based on preset
        const patrolSpeed = 60 * deltaTime / 1000;
        
        // Horizontal patrol
        if (layer.customPatrolWidth > 0) {
          state.currentX += patrolSpeed * state.direction;
          
          const leftBound = layer.x - layer.customPatrolWidth / 2;
          const rightBound = layer.x + layer.customPatrolWidth / 2;
          
          if (state.currentX <= leftBound || state.currentX >= rightBound) {
            state.direction *= -1;
            const movingRight = state.direction === 1;
            // If sprite faces right naturally and moving left, flip it
            // If sprite faces left naturally and moving right, flip it
            state.flipped = (layer.spriteFacingDirection === 'right' && !movingRight) ||
                           (layer.spriteFacingDirection === 'left' && movingRight);
            state.currentX = state.currentX <= leftBound ? leftBound : rightBound;
          }
        }
        
        // Handle bouncing/jumping for Rex-style animation
        if (preset.movement.bounceInterval > 0) {
          state.bounceTimer += deltaTime;
          
          if (state.bounceTimer >= preset.movement.bounceInterval && !state.isJumping) {
            state.isJumping = true;
            state.bounceTimer = 0;
          }
          
          if (state.isJumping) {
            // Simple parabolic jump
            const jumpProgress = state.bounceTimer / 1000; // Convert to seconds
            const jumpHeight = layer.customJumpHeight;
            
            // Parabolic trajectory: h = -4h_max * (t - 0.5)^2 + h_max
            const t = Math.min(jumpProgress * 2, 1); // Normalize to 0-1 over 0.5 seconds
            state.currentY = state.baseY - (jumpHeight * (1 - Math.pow(2 * t - 1, 2)));
            
            // Rotation during jump (Rex-style)
            if (preset.movement.rotationDuringJump) {
              state.rotation += preset.movement.rotationSpeed * deltaTime * state.direction;
            }
            
            // End jump after 0.5 seconds
            if (jumpProgress >= 0.5) {
              state.isJumping = false;
              state.currentY = state.baseY;
              
              // Reset rotation smoothly
              if (preset.movement.rotationDuringJump) {
                const targetRotation = Math.round(state.rotation / (Math.PI * 2)) * Math.PI * 2;
                state.rotation = targetRotation;
              }
            }
          }
        }
        
        // Continuous rotation (Beetle-style)
        if (preset.enemyType === 'beetle' && preset.movement.rotationSpeed > 0) {
          state.rotation += preset.movement.rotationSpeed * deltaTime * state.direction;
        }
        
        // Handle blinking pattern (if specified)
        if (preset.movement.blinkPattern) {
          state.blinkTimer += deltaTime;
          
          const { interval, duration, frameIndex } = preset.movement.blinkPattern;
          const cycleTime = state.blinkTimer % (interval + duration);
          
          if (cycleTime < interval) {
            // Normal frame
            if (state.currentFrameIndex === frameIndex) {
              state.currentFrameIndex = 0; // Return to default frame
            }
          } else {
            // Blink frame
            if (state.currentFrameIndex !== frameIndex) {
              state.currentFrameIndex = frameIndex;
            }
          }
        }
        
        newStates[layer.id] = state;
      });
      
      return newStates;
    });
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [layers, isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animate]);

  // Mouse position relative to canvas
  const getMousePosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = 2000 / rect.width;
    const scaleY = 2000 / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  // Handle background image upload
  const handleBackgroundImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setBackgroundImage(src);
      
      const img = new Image();
      img.src = src;
      img.onload = () => {
        setBackgroundImageObj(img);
      };
    };
    reader.readAsDataURL(file);
  }, []);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw background
    if (transparentBackground) {
      ctx.clearRect(0, 0, 2000, 2000);
      const checkerSize = 20;
      ctx.fillStyle = '#f0f0f0';
      for (let x = 0; x < 2000; x += checkerSize * 2) {
        for (let y = 0; y < 2000; y += checkerSize * 2) {
          ctx.fillRect(x, y, checkerSize, checkerSize);
          ctx.fillRect(x + checkerSize, y + checkerSize, checkerSize, checkerSize);
        }
      }
      ctx.fillStyle = '#ffffff';
      for (let x = checkerSize; x < 2000; x += checkerSize * 2) {
        for (let y = 0; y < 2000; y += checkerSize * 2) {
          ctx.fillRect(x, y, checkerSize, checkerSize);
          ctx.fillRect(x - checkerSize, y + checkerSize, checkerSize, checkerSize);
        }
      }
    } else if (backgroundImageObj) {
      ctx.drawImage(backgroundImageObj, 0, 0, 2000, 2000);
    } else {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, 2000, 2000);
    }
    
    if (showGrid) {
      ctx.strokeStyle = '#e0e0e0';
      ctx.lineWidth = 1;
      
      for (let x = 0; x <= 2000; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 2000);
        ctx.stroke();
      }
      
      for (let y = 0; y <= 2000; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(2000, y);
        ctx.stroke();
      }
    }
    
    [...layers].reverse().forEach(layer => {
      if (!layer.visible) return;
      
      const state = animationStates[layer.id];
      if (!state || layer.sprites.length === 0) return;
      
      let frameId: string | undefined;
      
      if (layer.gameAnimation && layer.sequence.frames.length > 0) {
        // Use prescribed sequence
        const frameIndex = state.currentFrameIndex;
        if (layer.sprites[frameIndex]) {
          frameId = layer.sprites[frameIndex].id;
        }
      } else if (layer.sequence.frames.length > 0) {
        // Use regular sequence
        frameId = layer.sequence.frames[state.currentFrameIndex % layer.sequence.frames.length];
      } else if (layer.sprites.length > 0) {
        // Fallback to first sprite
        frameId = layer.sprites[0].id;
      }
      
      if (!frameId) return;
      const img = images[frameId];
      if (!img) return;
      
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      
      const x = isPlaying ? state.currentX : layer.x;
      const y = isPlaying ? state.currentY : layer.y;
      
      ctx.translate(x, y);
      
      if (state.rotation !== 0) {
        ctx.rotate(state.rotation);
      }
      
      if (state.flipped) {
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(
        img,
        -layer.spriteWidth / 2,
        -layer.spriteHeight / 2,
        layer.spriteWidth,
        layer.spriteHeight
      );
      
      ctx.restore();
      
      // Draw selection outline for selected layer when not playing
      if (!isPlaying && layer.id === selectedLayerId) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          x - layer.spriteWidth / 2,
          y - layer.spriteHeight / 2,
          layer.spriteWidth,
          layer.spriteHeight
        );
      }
    });
  }, [layers, backgroundColor, backgroundImageObj, transparentBackground, showGrid, images, animationStates, isPlaying, selectedLayerId]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying) return;
    
    const pos = getMousePosition(e);
    
    // Check if clicking on selected layer
    if (selectedLayerId) {
      const selectedLayer = layers.find(l => l.id === selectedLayerId);
      if (selectedLayer) {
        const halfWidth = selectedLayer.spriteWidth / 2;
        const halfHeight = selectedLayer.spriteHeight / 2;
        
        if (pos.x >= selectedLayer.x - halfWidth &&
            pos.x <= selectedLayer.x + halfWidth &&
            pos.y >= selectedLayer.y - halfHeight &&
            pos.y <= selectedLayer.y + halfHeight) {
          setIsDragging(true);
          setDragStart({ x: pos.x - selectedLayer.x, y: pos.y - selectedLayer.y });
          return;
        }
      }
    }
    
    // Select layer on click
    for (const layer of layers) {
      const halfWidth = layer.spriteWidth / 2;
      const halfHeight = layer.spriteHeight / 2;
      
      if (pos.x >= layer.x - halfWidth &&
          pos.x <= layer.x + halfWidth &&
          pos.y >= layer.y - halfHeight &&
          pos.y <= layer.y + halfHeight) {
        setSelectedLayerId(layer.id);
        break;
      }
    }
  }, [isPlaying, getMousePosition, selectedLayerId, layers]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !selectedLayerId) return;
    
    const pos = getMousePosition(e);
    const newX = pos.x - dragStart.x;
    const newY = pos.y - dragStart.y;
    
    setLayers(prev => prev.map(l => 
      l.id === selectedLayerId ? { ...l, x: newX, y: newY } : l
    ));
    
    setAnimationStates(prev => ({
      ...prev,
      [selectedLayerId]: {
        ...prev[selectedLayerId],
        currentX: newX,
        currentY: newY,
        baseY: newY
      }
    }));
  }, [isDragging, selectedLayerId, getMousePosition, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);
  
  // Export canvas as image
  const exportCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const size = parseInt(exportSize);
    
    // Create temporary canvas at desired size
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = size;
    exportCanvas.height = size;
    const exportCtx = exportCanvas.getContext('2d');
    
    if (!exportCtx) return;
    
    // Scale and draw current canvas to export canvas
    exportCtx.save();
    exportCtx.scale(size / 2000, size / 2000);
    
    // Redraw everything at export size
    // Draw background
    if (transparentBackground) {
      // Keep transparent for export
    } else if (backgroundImageObj) {
      exportCtx.drawImage(backgroundImageObj, 0, 0, 2000, 2000);
    } else {
      exportCtx.fillStyle = backgroundColor;
      exportCtx.fillRect(0, 0, 2000, 2000);
    }
    
    // Draw layers
    [...layers].reverse().forEach(layer => {
      if (!layer.visible) return;
      
      const state = animationStates[layer.id];
      if (!state || layer.sprites.length === 0) return;
      
      let frameId: string | undefined;
      
      if (layer.gameAnimation && layer.sequence.frames.length > 0) {
        const frameIndex = state.currentFrameIndex;
        if (layer.sprites[frameIndex]) {
          frameId = layer.sprites[frameIndex].id;
        }
      } else if (layer.sequence.frames.length > 0) {
        frameId = layer.sequence.frames[state.currentFrameIndex % layer.sequence.frames.length];
      } else if (layer.sprites.length > 0) {
        frameId = layer.sprites[0].id;
      }
      
      if (!frameId) return;
      const img = images[frameId];
      if (!img) return;
      
      exportCtx.save();
      exportCtx.globalAlpha = layer.opacity;
      
      const x = isPlaying ? state.currentX : layer.x;
      const y = isPlaying ? state.currentY : layer.y;
      
      exportCtx.translate(x, y);
      
      if (state.rotation !== 0) {
        exportCtx.rotate(state.rotation);
      }
      
      if (state.flipped) {
        exportCtx.scale(-1, 1);
      }
      
      exportCtx.drawImage(
        img,
        -layer.spriteWidth / 2,
        -layer.spriteHeight / 2,
        layer.spriteWidth,
        layer.spriteHeight
      );
      
      exportCtx.restore();
    });
    
    exportCtx.restore();
    
    // Convert to blob and download
    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `showcase-${size}x${size}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
    
    setShowExportModal(false);
  }, [exportSize, layers, images, animationStates, isPlaying, transparentBackground, backgroundImageObj, backgroundColor]);

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      <div className="h-full flex">
        {/* Left Panel */}
        <div className="w-96 bg-gray-800 p-4 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Game Animation Replicas</h2>
          
          <button
            onClick={() => {
              const name = prompt('Enter character name:');
              if (name) createNewCharacter(name);
            }}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded mb-4 hover:bg-blue-700"
          >
            + Add Character
          </button>
          
          <div className="space-y-2 mb-6">
            {layers.map(layer => (
              <div
                key={layer.id}
                onClick={() => setSelectedLayerId(layer.id)}
                className={`p-3 rounded cursor-pointer ${
                  selectedLayerId === layer.id ? 'bg-gray-700' : 'bg-gray-750 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{layer.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLayers(prev => prev.map(l => 
                        l.id === layer.id ? { ...l, visible: !l.visible } : l
                      ));
                    }}
                    className="text-sm text-gray-400 hover:text-white"
                  >
                    {layer.visible ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {layer.sprites.length} sprites | {layer.gameAnimation?.name || 'No animation'}
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <h3 className="font-bold mb-2">Canvas Settings</h3>
            
            <div className="mb-3">
              <label className="flex items-center mb-2">
                <input
                  type="checkbox"
                  checked={transparentBackground}
                  onChange={(e) => {
                    setTransparentBackground(e.target.checked);
                    if (e.target.checked) {
                      setBackgroundImage(null);
                      setBackgroundImageObj(null);
                    }
                  }}
                  className="mr-2"
                />
                <span className="text-sm">Transparent Background</span>
              </label>
              
              {!transparentBackground && (
                <>
                  <label className="block mb-2">
                    <span className="text-xs text-gray-400">Color</span>
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="block w-full mt-1"
                    />
                  </label>
                  
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleBackgroundImageUpload(file);
                      }}
                      className="hidden"
                      id="bg-upload"
                    />
                    <label 
                      htmlFor="bg-upload" 
                      className="block w-full bg-gray-700 text-white px-3 py-2 rounded text-center cursor-pointer hover:bg-gray-600"
                    >
                      {backgroundImage ? 'Change Background' : 'Upload Background'}
                    </label>
                  </div>
                </>
              )}
            </div>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Show Grid</span>
            </label>
          </div>
        </div>
        
        {/* Center - Canvas */}
        <div className="flex-1 bg-gray-700 flex items-center justify-center p-8">
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={2000}
              height={2000}
              className="bg-white"
              style={{ 
                maxWidth: '100%', 
                maxHeight: 'calc(100vh - 8rem)',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain'
              }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            <div className="absolute top-4 right-4 space-y-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`w-full px-6 py-3 rounded font-bold ${
                  isPlaying 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded font-bold"
              >
                📥 Export
              </button>
            </div>
            
            {/* Export Modal */}
            {showExportModal && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                <div className="bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-bold mb-4">Export Settings</h3>
                  
                  <div className="mb-4">
                    <label className="block mb-2">
                      <span className="text-sm">Export Size</span>
                    </label>
                    <select
                      value={exportSize}
                      onChange={(e) => setExportSize(e.target.value)}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded"
                    >
                      <option value="500">500×500 (Social Media Thumbnail)</option>
                      <option value="1000">1000×1000 (Instagram Post)</option>
                      <option value="1500">1500×1500 (High Quality)</option>
                      <option value="2000">2000×2000 (Original)</option>
                      <option value="512">512×512 (Game Asset)</option>
                      <option value="256">256×256 (Icon)</option>
                      <option value="128">128×128 (Small Icon)</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={exportCanvas}
                      className="flex-1 bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => setShowExportModal(false)}
                      className="flex-1 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel */}
        {selectedLayer && (
          <div className="w-96 bg-gray-800 p-4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit: {selectedLayer.name}</h2>
            
            {/* Game Animation Presets */}
            <div className="mb-6">
              <h3 className="font-bold mb-2">Game Animation Presets</h3>
              <div className="space-y-2">
                {GAME_ANIMATION_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => applyGameAnimation(preset)}
                    className={`w-full p-3 rounded text-left ${
                      selectedLayer.gameAnimation?.name === preset.name
                        ? 'bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium">{preset.name}</div>
                    <div className="text-xs text-gray-300">{preset.description}</div>
                  </button>
                ))}
              </div>
              
              {selectedLayer.gameAnimation && (
                <div className="mt-4 p-3 bg-gray-700 rounded">
                  <div className="text-sm text-gray-300">
                    Current: {selectedLayer.gameAnimation.name}
                  </div>
                  <button
                    onClick={() => {
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId 
                          ? { ...l, gameAnimation: null }
                          : l
                      ));
                    }}
                    className="mt-2 text-xs text-red-400 hover:text-red-300"
                  >
                    Clear Animation
                  </button>
                </div>
              )}
            </div>
            
            {/* Movement Controls */}
            <div className="mb-6">
              <h3 className="font-bold mb-2">Movement Controls</h3>
              
              <label className="block mb-3">
                <span className="text-sm">Horizontal Patrol Width</span>
                <input
                  type="range"
                  min="0"
                  max="500"
                  value={selectedLayer.customPatrolWidth}
                  onChange={(e) => {
                    const width = parseInt(e.target.value);
                    setLayers(prev => prev.map(l => 
                      l.id === selectedLayerId 
                        ? { ...l, customPatrolWidth: width }
                        : l
                    ));
                  }}
                  className="w-full"
                />
                <span className="text-xs text-gray-400">{selectedLayer.customPatrolWidth}px</span>
              </label>
              
              <label className="block mb-3">
                <span className="text-sm">Vertical Jump Height</span>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={selectedLayer.customJumpHeight}
                  onChange={(e) => {
                    const height = parseInt(e.target.value);
                    setLayers(prev => prev.map(l => 
                      l.id === selectedLayerId 
                        ? { ...l, customJumpHeight: height }
                        : l
                    ));
                  }}
                  className="w-full"
                />
                <span className="text-xs text-gray-400">{selectedLayer.customJumpHeight}px</span>
              </label>
              
              <div className="block">
                <span className="text-sm">Sprite Faces</span>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId 
                          ? { ...l, spriteFacingDirection: 'left' }
                          : l
                      ));
                      // Update flip state when facing direction changes
                      const state = animationStates[selectedLayerId];
                      if (state) {
                        const movingRight = state.direction === 1;
                        setAnimationStates(prev => ({
                          ...prev,
                          [selectedLayerId]: {
                            ...prev[selectedLayerId],
                            flipped: movingRight // Flip if facing left but moving right
                          }
                        }));
                      }
                    }}
                    className={`flex-1 px-3 py-1 rounded text-sm ${
                      selectedLayer.spriteFacingDirection === 'left'
                        ? 'bg-green-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    ← Left
                  </button>
                  <button
                    onClick={() => {
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId 
                          ? { ...l, spriteFacingDirection: 'right' }
                          : l
                      ));
                      // Update flip state when facing direction changes
                      const state = animationStates[selectedLayerId];
                      if (state) {
                        const movingRight = state.direction === 1;
                        setAnimationStates(prev => ({
                          ...prev,
                          [selectedLayerId]: {
                            ...prev[selectedLayerId],
                            flipped: !movingRight // Flip if facing right but moving left
                          }
                        }));
                      }
                    }}
                    className={`flex-1 px-3 py-1 rounded text-sm ${
                      selectedLayer.spriteFacingDirection === 'right'
                        ? 'bg-green-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    Right →
                  </button>
                </div>
              </div>
            </div>
            
            {/* Sprite Management */}
            <div className="mb-6">
              <h3 className="font-bold mb-2">Sprite Frames</h3>
              <div 
                className={`border-2 border-dashed rounded p-4 mb-3 text-center ${
                  isDraggingFiles ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFiles(true);
                }}
                onDragLeave={() => setIsDraggingFiles(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFiles(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                  id="sprite-upload"
                />
                <label htmlFor="sprite-upload" className="cursor-pointer">
                  <div className="text-gray-400">
                    Drop sprites here or click to upload
                    <br />
                    <span className="text-xs">(Upload in order for game animations)</span>
                  </div>
                </label>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {selectedLayer.sprites.map((sprite, index) => (
                  <div
                    key={sprite.id}
                    className="relative group"
                  >
                    <img
                      src={sprite.src}
                      alt={sprite.name}
                      className="w-full h-20 object-cover rounded border border-gray-600"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-xs p-1">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>
              
              {selectedLayer.gameAnimation && (
                <div className="mt-3 p-2 bg-gray-700 rounded">
                  <div className="text-xs text-gray-400">
                    Sequence Order: {selectedLayer.gameAnimation.spriteSequence.frameOrder.map(i => `#${i+1}`).join(' → ')}
                  </div>
                </div>
              )}
            </div>
            
            {/* Position & Appearance */}
            <div className="mb-6">
              <h3 className="font-bold mb-2">Position</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-sm">X</span>
                  <input
                    type="number"
                    value={Math.round(selectedLayer.x)}
                    onChange={(e) => {
                      const x = parseInt(e.target.value) || 0;
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId ? { ...l, x } : l
                      ));
                      setAnimationStates(prev => ({
                        ...prev,
                        [selectedLayerId]: { 
                          ...prev[selectedLayerId], 
                          currentX: x 
                        }
                      }));
                    }}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                  />
                </label>
                <label className="block">
                  <span className="text-sm">Y</span>
                  <input
                    type="number"
                    value={Math.round(selectedLayer.y)}
                    onChange={(e) => {
                      const y = parseInt(e.target.value) || 0;
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId ? { ...l, y } : l
                      ));
                      setAnimationStates(prev => ({
                        ...prev,
                        [selectedLayerId]: { 
                          ...prev[selectedLayerId], 
                          currentY: y,
                          baseY: y
                        }
                      }));
                    }}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GameAnimationsApp;