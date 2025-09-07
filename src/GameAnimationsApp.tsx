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
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  
  // Interaction states for positioning
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Export settings
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSize, setExportSize] = useState('2000');
  const [exportType, setExportType] = useState<'image' | 'video'>('image');
  const [recordingDuration, setRecordingDuration] = useState(5);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Character catalog
  const [savedCharacters, setSavedCharacters] = useState<CharacterLayer[]>(() => {
    const saved = localStorage.getItem('gameCharacterCatalog');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCatalog, setShowCatalog] = useState(false);
  
  // Projects
  interface Project {
    id: string;
    name: string;
    layers: CharacterLayer[];
    backgroundColor: string;
    backgroundImage: string | null;
    transparentBackground: boolean;
    createdAt: string;
  }
  
  const [savedProjects, setSavedProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('gameProjects');
    return saved ? JSON.parse(saved) : [];
  });
  const [showProjects, setShowProjects] = useState(false);

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
        if (!layer.visible) return;
        
        const state = newStates[layer.id];
        if (!state) return;
        
        const preset = layer.gameAnimation;
        
        // Handle sprite sequence based on preset or custom
        if (layer.gameAnimation) {
          // Use preset sequence
          if (preset.spriteSequence.frameOrder.length > 0) {
            const currentDuration = preset.spriteSequence.frameDurations[state.sequenceIndex] || 100;
            
            if (currentTime - state.frameStartTime >= currentDuration) {
              // Move to next in prescribed sequence
              state.sequenceIndex = (state.sequenceIndex + 1) % preset.spriteSequence.frameOrder.length;
              state.currentFrameIndex = preset.spriteSequence.frameOrder[state.sequenceIndex];
              state.frameStartTime = currentTime;
            }
          }
        } else if (layer.sequence.frames.length > 0) {
          // Use custom sequence
          const currentFrameId = layer.sequence.frames[state.currentFrameIndex % layer.sequence.frames.length];
          const currentFrame = layer.sprites.find(s => s.id === currentFrameId);
          
          if (currentFrame && currentTime - state.frameStartTime >= currentFrame.duration) {
            let nextIndex = state.currentFrameIndex + 1;
            if (nextIndex >= layer.sequence.frames.length) {
              nextIndex = layer.sequence.loop ? 0 : layer.sequence.frames.length - 1;
            }
            state.currentFrameIndex = nextIndex;
            state.frameStartTime = currentTime;
          }
        }
        
        // Handle movement based on preset or custom settings
        const patrolSpeed = 60 * deltaTime / 1000;
        
        // Horizontal patrol (works with or without preset)
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
        if (preset && preset.movement.bounceInterval > 0) {
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
        if (preset && preset.enemyType === 'beetle' && preset.movement.rotationSpeed > 0) {
          state.rotation += preset.movement.rotationSpeed * deltaTime * state.direction;
        }
        
        // Handle blinking pattern (if specified)
        if (preset && preset.movement.blinkPattern) {
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
      
      if (layer.gameAnimation && layer.sprites.length > 0) {
        // Use prescribed sequence from game preset
        const frameIndex = state.currentFrameIndex;
        if (layer.sprites[frameIndex]) {
          frameId = layer.sprites[frameIndex].id;
        }
      } else if (layer.sequence.frames.length > 0) {
        // Use custom sequence
        const frameIndex = state.currentFrameIndex % layer.sequence.frames.length;
        frameId = layer.sequence.frames[frameIndex];
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

  // Save character to catalog
  const saveCharacterToCatalog = useCallback((layer: CharacterLayer) => {
    const characterToSave = { ...layer, id: `saved-${Date.now()}` };
    const newCatalog = [...savedCharacters, characterToSave];
    setSavedCharacters(newCatalog);
    localStorage.setItem('gameCharacterCatalog', JSON.stringify(newCatalog));
    alert(`Character "${layer.name}" saved to catalog!`);
  }, [savedCharacters]);
  
  // Load character from catalog
  const loadCharacterFromCatalog = useCallback((savedChar: CharacterLayer) => {
    const newLayer = { 
      ...savedChar, 
      id: `layer-${Date.now()}`,
      x: 500,
      y: 500
    };
    
    setLayers(prev => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    
    // Load sprite images
    savedChar.sprites.forEach(sprite => {
      const img = new Image();
      img.src = sprite.src;
      img.onload = () => {
        setImages(prev => ({ ...prev, [sprite.id]: img }));
      };
    });
    
    // Initialize animation state
    setAnimationStates(prev => ({
      ...prev,
      [newLayer.id]: {
        currentFrameIndex: 0,
        frameStartTime: 0,
        currentX: newLayer.x,
        currentY: newLayer.y,
        baseY: newLayer.y,
        direction: 1,
        flipped: newLayer.spriteFacingDirection === 'left',
        rotation: 0,
        bounceTimer: 0,
        blinkTimer: 0,
        isJumping: false,
        sequenceIndex: 0
      }
    }));
    
    setShowCatalog(false);
  }, []);
  
  // Save project
  const saveProject = useCallback(() => {
    const projectName = prompt('Enter project name:');
    if (!projectName) return;
    
    const project: Project = {
      id: `project-${Date.now()}`,
      name: projectName,
      layers: JSON.parse(JSON.stringify(layers)),
      backgroundColor,
      backgroundImage,
      transparentBackground,
      createdAt: new Date().toISOString()
    };
    
    const newProjects = [...savedProjects, project];
    setSavedProjects(newProjects);
    localStorage.setItem('gameProjects', JSON.stringify(newProjects));
    alert(`Project "${projectName}" saved!`);
  }, [layers, backgroundColor, backgroundImage, transparentBackground, savedProjects]);
  
  // Load project
  const loadProject = useCallback((project: Project) => {
    // Clear current state
    setLayers([]);
    setImages({});
    setAnimationStates({});
    
    // Load project settings
    setBackgroundColor(project.backgroundColor);
    setTransparentBackground(project.transparentBackground);
    
    if (project.backgroundImage) {
      setBackgroundImage(project.backgroundImage);
      const img = new Image();
      img.src = project.backgroundImage;
      img.onload = () => {
        setBackgroundImageObj(img);
      };
    } else {
      setBackgroundImage(null);
      setBackgroundImageObj(null);
    }
    
    // Load layers
    project.layers.forEach(layer => {
      // Load sprite images
      layer.sprites.forEach(sprite => {
        const img = new Image();
        img.src = sprite.src;
        img.onload = () => {
          setImages(prev => ({ ...prev, [sprite.id]: img }));
        };
      });
      
      // Initialize animation state
      setAnimationStates(prev => ({
        ...prev,
        [layer.id]: {
          currentFrameIndex: 0,
          frameStartTime: 0,
          currentX: layer.x,
          currentY: layer.y,
          baseY: layer.y,
          direction: 1,
          flipped: layer.spriteFacingDirection === 'left',
          rotation: 0,
          bounceTimer: 0,
          blinkTimer: 0,
          isJumping: false,
          sequenceIndex: 0
        }
      }));
    });
    
    setLayers(project.layers);
    setShowProjects(false);
    alert(`Project "${project.name}" loaded!`);
  }, []);
  
  // Start video recording
  const startRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Start playing if not already
    if (!isPlaying) {
      setIsPlaying(true);
    }
    
    const stream = canvas.captureStream(30); // 30 FPS
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000 // 5 Mbps
    });
    
    recordedChunksRef.current = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `showcase-animation-${exportSize}x${exportSize}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setIsRecording(false);
      setShowExportModal(false);
    };
    
    mediaRecorder.start();
    mediaRecorderRef.current = mediaRecorder;
    setIsRecording(true);
    
    // Auto-stop after duration
    setTimeout(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    }, recordingDuration * 1000);
  }, [isPlaying, exportSize, recordingDuration]);

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
  
  const handleExport = useCallback(() => {
    if (exportType === 'image') {
      exportCanvas();
    } else {
      startRecording();
    }
  }, [exportType, exportCanvas, startRecording]);

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
          
          <div className="border-t border-gray-700 pt-4">
            <h3 className="font-bold mb-2">Projects</h3>
            <button
              onClick={saveProject}
              className="w-full bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700 mb-2"
            >
              💾 Save Current Project
            </button>
            <button
              onClick={() => setShowProjects(!showProjects)}
              className="w-full bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700"
            >
              {showProjects ? 'Hide' : 'Browse'} Projects ({savedProjects.length})
            </button>
            
            {showProjects && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {savedProjects.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-4">
                    No saved projects yet
                  </div>
                ) : (
                  savedProjects.map(project => (
                    <div 
                      key={project.id}
                      className="bg-gray-700 p-2 rounded"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium text-sm">{project.name}</div>
                          <div className="text-xs text-gray-400">
                            {project.layers.length} layers | {new Date(project.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => loadProject(project)}
                            className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => {
                              const newProjects = savedProjects.filter(p => p.id !== project.id);
                              setSavedProjects(newProjects);
                              localStorage.setItem('gameProjects', JSON.stringify(newProjects));
                            }}
                            className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <h3 className="font-bold mb-2">Character Catalog</h3>
            <button
              onClick={() => setShowCatalog(!showCatalog)}
              className="w-full bg-indigo-600 text-white px-3 py-2 rounded hover:bg-indigo-700"
            >
              {showCatalog ? 'Hide' : 'Browse'} Catalog ({savedCharacters.length})
            </button>
            
            {showCatalog && (
              <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                {savedCharacters.length === 0 ? (
                  <div className="text-gray-400 text-sm text-center py-4">
                    No saved characters yet
                  </div>
                ) : (
                  savedCharacters.map(char => (
                    <div 
                      key={char.id}
                      className="bg-gray-700 p-2 rounded flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium text-sm">{char.name}</div>
                        <div className="text-xs text-gray-400">
                          {char.sprites.length} sprites
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => loadCharacterFromCatalog(char)}
                          className="bg-green-600 text-white px-2 py-1 rounded text-xs hover:bg-green-700"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => {
                            const newCatalog = savedCharacters.filter(c => c.id !== char.id);
                            setSavedCharacters(newCatalog);
                            localStorage.setItem('gameCharacterCatalog', JSON.stringify(newCatalog));
                          }}
                          className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
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
                <div className="bg-gray-800 p-6 rounded-lg max-w-md">
                  <h3 className="text-xl font-bold mb-4">Export Settings</h3>
                  
                  <div className="mb-4">
                    <label className="block mb-2">
                      <span className="text-sm">Export Type</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setExportType('image')}
                        className={`flex-1 px-3 py-2 rounded ${
                          exportType === 'image' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        📷 Image (Current Frame)
                      </button>
                      <button
                        onClick={() => setExportType('video')}
                        className={`flex-1 px-3 py-2 rounded ${
                          exportType === 'video' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                      >
                        🎬 Video (Animation)
                      </button>
                    </div>
                  </div>
                  
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
                  
                  {exportType === 'video' && (
                    <div className="mb-4">
                      <label className="block mb-2">
                        <span className="text-sm">Recording Duration (seconds)</span>
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={recordingDuration}
                        onChange={(e) => setRecordingDuration(parseInt(e.target.value))}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-400">{recordingDuration} seconds</span>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleExport}
                      disabled={isRecording}
                      className={`flex-1 px-4 py-2 rounded ${
                        isRecording 
                          ? 'bg-red-600 cursor-not-allowed' 
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isRecording ? '⏺ Recording...' : 'Export'}
                    </button>
                    <button
                      onClick={() => {
                        if (isRecording && mediaRecorderRef.current) {
                          mediaRecorderRef.current.stop();
                        }
                        setShowExportModal(false);
                      }}
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
            
            {/* Character Actions */}
            <div className="mb-4">
              <button
                onClick={() => saveCharacterToCatalog(selectedLayer)}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                💾 Save to Catalog
              </button>
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
                    <span className="text-xs">(Max 10 at a time)</span>
                  </div>
                </label>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mb-4">
                {selectedLayer.sprites.map((sprite, index) => (
                  <div
                    key={sprite.id}
                    onClick={() => {
                      // Add to sequence on click
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId 
                          ? { 
                              ...l, 
                              sequence: { 
                                ...l.sequence, 
                                frames: [...l.sequence.frames, sprite.id] 
                              }
                            }
                          : l
                      ));
                    }}
                    className="relative group cursor-pointer"
                  >
                    <img
                      src={sprite.src}
                      alt={sprite.name}
                      className="w-full h-20 object-cover rounded border border-gray-600 hover:border-blue-500"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-xs p-1 truncate">
                      {sprite.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Animation Sequence */}
            <div className="mb-6">
              <h3 className="font-bold mb-2">Animation Sequence</h3>
              
              {/* Sequence Controls */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    setLayers(prev => prev.map(l => 
                      l.id === selectedLayerId 
                        ? { ...l, sequence: { ...l.sequence, frames: [] } }
                        : l
                    ));
                  }}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                >
                  Clear All
                </button>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedLayer.sequence.loop}
                    onChange={(e) => {
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId 
                          ? { ...l, sequence: { ...l.sequence, loop: e.target.checked } }
                          : l
                      ));
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm">Loop</span>
                </label>
              </div>
              
              <div className="space-y-2">
                {selectedLayer.sequence.frames.map((frameId, index) => {
                  const frame = selectedLayer.sprites.find(s => s.id === frameId);
                  if (!frame) return null;
                  
                  return (
                    <div
                      key={`${frameId}-${index}`}
                      draggable
                      onDragStart={() => setDraggedFrameId(frameId)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverIndex(index);
                      }}
                      onDragLeave={() => setDragOverIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedFrameId) {
                          const fromIndex = selectedLayer.sequence.frames.indexOf(draggedFrameId);
                          if (fromIndex !== -1) {
                            const newFrames = [...selectedLayer.sequence.frames];
                            const [removed] = newFrames.splice(fromIndex, 1);
                            newFrames.splice(index, 0, removed);
                            
                            setLayers(prev => prev.map(l => 
                              l.id === selectedLayerId 
                                ? { ...l, sequence: { ...l.sequence, frames: newFrames } }
                                : l
                            ));
                          }
                        }
                        setDraggedFrameId(null);
                        setDragOverIndex(null);
                      }}
                      className={`flex items-center bg-gray-700 rounded p-2 ${
                        dragOverIndex === index ? 'border-2 border-blue-500' : ''
                      }`}
                    >
                      <span className="text-gray-400 mr-3">#{index + 1}</span>
                      <img
                        src={frame.src}
                        alt={frame.name}
                        className="w-12 h-12 object-cover rounded mr-3"
                      />
                      <div className="flex-1">
                        <div className="text-sm truncate">{frame.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="number"
                            value={frame.duration}
                            onChange={(e) => {
                              const duration = parseInt(e.target.value) || 100;
                              setLayers(prev => prev.map(l => 
                                l.id === selectedLayerId 
                                  ? {
                                      ...l,
                                      sprites: l.sprites.map(s => 
                                        s.id === frameId ? { ...s, duration } : s
                                      )
                                    }
                                  : l
                              ));
                            }}
                            className="w-20 bg-gray-600 text-white px-2 py-1 rounded text-xs"
                            min="10"
                            step="10"
                          />
                          <span className="text-xs text-gray-400">ms</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const newFrames = selectedLayer.sequence.frames.filter((_, i) => i !== index);
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayerId 
                              ? { ...l, sequence: { ...l.sequence, frames: newFrames } }
                              : l
                          ));
                        }}
                        className="ml-2 text-red-500 hover:text-red-400 text-xl"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {selectedLayer.sequence.frames.length === 0 && (
                <div className="text-gray-400 text-sm text-center py-4 bg-gray-700 rounded">
                  Click sprites above to add them to the sequence
                </div>
              )}
              
              {selectedLayer.gameAnimation && (
                <div className="mt-3 p-2 bg-blue-900/50 rounded border border-blue-700">
                  <div className="text-xs text-blue-300">
                    Game Preset Active: {selectedLayer.gameAnimation.name}
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