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

type MovementType = 
  | 'none'
  | 'patrol'
  | 'bounce'
  | 'float'
  | 'jump'
  | 'flip'
  | 'stalker'
  | 'roll'
  | 'prowl';

interface MovementConfig {
  type: MovementType;
  speed: number;
  amplitude: number;
  frequency: number;
  patrolWidth: number;
  patrolStartDirection: 'left' | 'right';
  flipOnTurn: boolean;
  bounceHeight: number;
  floatAmount: number;
  jumpInterval: number;
  stalkerHideTime: number;
  stalkerChaseSpeed: number;
}

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
  spriteFacingDirection: 'left' | 'right';  // Which direction the sprite image faces by default
  movement: MovementConfig;
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
  bouncePhase: number;
  jumpTimer: number;
  stalkerState: 'hidden' | 'chasing' | 'retreating';
  stalkerTimer: number;
  floatPhase: number;
}

function MovementApp() {
  const [layers, setLayers] = useState<CharacterLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [backgroundImageObj, setBackgroundImageObj] = useState<HTMLImageElement | null>(null);
  const [transparentBackground, setTransparentBackground] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const gridSize = 100;
  const snapThreshold = 15;
  
  // Character catalog
  const [savedCharacters, setSavedCharacters] = useState<CharacterLayer[]>(() => {
    const saved = localStorage.getItem('characterCatalog');
    return saved ? JSON.parse(saved) : [];
  });
  const [showCatalog, setShowCatalog] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({});
  const [animationStates, setAnimationStates] = useState<{ [key: string]: AnimationState }>({});
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  
  const [draggedFrameId, setDraggedFrameId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  
  // Interaction states
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ width: 0, height: 0, x: 0, y: 0, mouseX: 0, mouseY: 0 });
  
  // History for undo/redo
  const [history, setHistory] = useState<CharacterLayer[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Helper function to snap to grid
  const snapToGridValue = useCallback((value: number) => {
    if (!snapToGrid) return value;
    const snapped = Math.round(value / gridSize) * gridSize;
    if (Math.abs(value - snapped) < snapThreshold) {
      return snapped;
    }
    return value;
  }, [snapToGrid, gridSize, snapThreshold]);
  
  // Save state to history
  const saveToHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(layers)));
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [layers, historyIndex]);
  
  // Undo/Redo functions
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setLayers(JSON.parse(JSON.stringify(history[newIndex])));
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);
  
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setLayers(JSON.parse(JSON.stringify(history[newIndex])));
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
  
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
      movement: {
        type: 'none',
        speed: 50,
        amplitude: 30,
        frequency: 2,
        patrolWidth: 200,
        patrolStartDirection: 'right',
        flipOnTurn: true,
        bounceHeight: 100,
        floatAmount: 20,
        jumpInterval: 2000,
        stalkerHideTime: 3000,
        stalkerChaseSpeed: 100,
      }
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
        direction: newLayer.movement.patrolStartDirection === 'left' ? -1 : 1,
        flipped: (newLayer.spriteFacingDirection === 'right' && newLayer.movement.patrolStartDirection === 'left') ||
                 (newLayer.spriteFacingDirection === 'left' && newLayer.movement.patrolStartDirection === 'right'),
        rotation: 0,
        bouncePhase: 0,
        jumpTimer: 0,
        stalkerState: 'hidden',
        stalkerTimer: 0,
        floatPhase: 0,
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

  const animate = useCallback((currentTime: number) => {
    if (!isPlaying) return;
    
    const deltaTime = currentTime - lastTimeRef.current;
    lastTimeRef.current = currentTime;
    
    setAnimationStates(prev => {
      const newStates = { ...prev };
      
      layers.forEach(layer => {
        if (!layer.visible || layer.movement.type === 'none') return;
        
        const state = newStates[layer.id];
        if (!state) return;
        
        const sequence = layer.sequence;
        if (sequence.frames.length === 0) return;
        
        // Update sprite frame
        const currentFrameId = sequence.frames[state.currentFrameIndex];
        const currentFrame = layer.sprites.find(s => s.id === currentFrameId);
        
        if (currentFrame && currentTime - state.frameStartTime >= currentFrame.duration) {
          let nextIndex = state.currentFrameIndex + 1;
          if (nextIndex >= sequence.frames.length) {
            nextIndex = sequence.loop ? 0 : sequence.frames.length - 1;
          }
          state.currentFrameIndex = nextIndex;
          state.frameStartTime = currentTime;
        }
        
        // Update movement based on type
        switch (layer.movement.type) {
          case 'patrol':
            // Horizontal patrol movement
            const patrolSpeed = layer.movement.speed * deltaTime / 1000;
            state.currentX += patrolSpeed * state.direction;
            
            const leftBound = layer.x - layer.movement.patrolWidth / 2;
            const rightBound = layer.x + layer.movement.patrolWidth / 2;
            
            if (state.currentX <= leftBound || state.currentX >= rightBound) {
              state.direction *= -1;
              if (layer.movement.flipOnTurn) {
                // Flip based on sprite's default facing direction
                const movingLeft = state.direction === -1;
                state.flipped = (layer.spriteFacingDirection === 'right' && movingLeft) ||
                               (layer.spriteFacingDirection === 'left' && !movingLeft);
              }
              state.currentX = state.currentX <= leftBound ? leftBound : rightBound;
            }
            break;
            
          case 'bounce':
            // Rex-style bouncing movement with patrol
            state.bouncePhase += deltaTime / 1000;
            const bounceY = Math.abs(Math.sin(state.bouncePhase * layer.movement.frequency)) * layer.movement.bounceHeight;
            state.currentY = state.baseY - bounceY;
            
            // Also patrol horizontally
            const bounceSpeed = layer.movement.speed * deltaTime / 1000;
            state.currentX += bounceSpeed * state.direction;
            
            const bounceBoundLeft = layer.x - layer.movement.patrolWidth / 2;
            const bounceBoundRight = layer.x + layer.movement.patrolWidth / 2;
            
            if (state.currentX <= bounceBoundLeft || state.currentX >= bounceBoundRight) {
              state.direction *= -1;
              if (layer.movement.flipOnTurn) {
                const movingLeft = state.direction === -1;
                state.flipped = (layer.spriteFacingDirection === 'right' && movingLeft) ||
                               (layer.spriteFacingDirection === 'left' && !movingLeft);
              }
              state.currentX = state.currentX <= bounceBoundLeft ? bounceBoundLeft : bounceBoundRight;
            }
            
            // Add rotation during bounce
            if (bounceY > 10) {
              state.rotation += deltaTime * 0.003 * state.direction;
            } else {
              state.rotation *= 0.9;
            }
            break;
            
          case 'float':
            // Power-up style floating
            state.floatPhase += deltaTime / 1000;
            const floatY = Math.sin(state.floatPhase * 2) * layer.movement.floatAmount;
            state.currentY = state.baseY + floatY;
            break;
            
          case 'jump':
            // Periodic jumping
            state.jumpTimer += deltaTime;
            if (state.jumpTimer >= layer.movement.jumpInterval) {
              state.jumpTimer = 0;
            }
            
            const jumpProgress = state.jumpTimer / layer.movement.jumpInterval;
            if (jumpProgress < 0.5) {
              const jumpPhase = jumpProgress * 2;
              const jumpHeight = Math.sin(jumpPhase * Math.PI) * layer.movement.bounceHeight;
              state.currentY = state.baseY - jumpHeight;
            } else {
              state.currentY = state.baseY;
            }
            break;
            
          case 'flip':
            // Continuous flipping with movement
            state.rotation += deltaTime * 0.005;
            
            // Move in figure-8 pattern
            const flipTime = currentTime / 1000;
            state.currentX = layer.x + Math.sin(flipTime * layer.movement.speed / 50) * layer.movement.patrolWidth / 2;
            state.currentY = state.baseY + Math.sin(flipTime * layer.movement.speed / 25 * 2) * layer.movement.amplitude;
            break;
            
          case 'stalker':
            // Cat-style stalker behavior
            state.stalkerTimer += deltaTime;
            
            if (state.stalkerState === 'hidden') {
              // Hidden, waiting to pounce
              if (state.stalkerTimer >= layer.movement.stalkerHideTime) {
                state.stalkerState = 'chasing';
                state.stalkerTimer = 0;
              }
            } else if (state.stalkerState === 'chasing') {
              // Chase rapidly
              const chaseSpeed = layer.movement.stalkerChaseSpeed * deltaTime / 1000;
              state.currentX += chaseSpeed * state.direction;
              
              // Return after short chase
              if (state.stalkerTimer >= 1000) {
                state.stalkerState = 'retreating';
                state.stalkerTimer = 0;
                state.direction *= -1;
              }
            } else if (state.stalkerState === 'retreating') {
              // Return to start
              const retreatSpeed = layer.movement.speed * deltaTime / 1000;
              const targetX = layer.x;
              
              if (Math.abs(state.currentX - targetX) > 5) {
                const dir = targetX > state.currentX ? 1 : -1;
                state.currentX += retreatSpeed * dir;
              } else {
                state.stalkerState = 'hidden';
                state.stalkerTimer = 0;
                state.currentX = targetX;
              }
            }
            break;
            
          case 'roll':
            // Beetle-style rolling movement
            const rollSpeed = layer.movement.speed * deltaTime / 1000;
            state.currentX += rollSpeed * state.direction;
            state.rotation += deltaTime * 0.008 * state.direction;
            
            const rollBoundLeft = layer.x - layer.movement.patrolWidth / 2;
            const rollBoundRight = layer.x + layer.movement.patrolWidth / 2;
            
            if (state.currentX <= rollBoundLeft || state.currentX >= rollBoundRight) {
              state.direction *= -1;
              state.currentX = state.currentX <= rollBoundLeft ? rollBoundLeft : rollBoundRight;
            }
            break;
            
          case 'prowl':
            // Smooth prowling movement
            const prowlTime = currentTime / 1000;
            const prowlX = Math.sin(prowlTime * layer.movement.speed / 100) * layer.movement.patrolWidth / 2;
            state.currentX = layer.x + prowlX;
            
            // Subtle body movement
            state.currentY = state.baseY + Math.sin(prowlTime * 4) * 5;
            
            // Face direction of movement based on sprite's default facing
            const prevX = layer.x + Math.sin((prowlTime - 0.1) * layer.movement.speed / 100) * layer.movement.patrolWidth / 2;
            const movingLeft = prowlX < prevX;
            state.flipped = (layer.spriteFacingDirection === 'right' && movingLeft) ||
                           (layer.spriteFacingDirection === 'left' && !movingLeft);
            break;
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
  
  // Check if mouse is over a resize handle
  const getResizeHandle = useCallback((mouseX: number, mouseY: number, layer: CharacterLayer) => {
    const handleSize = 10;
    const halfWidth = layer.spriteWidth / 2;
    const halfHeight = layer.spriteHeight / 2;
    
    const handles = [
      { name: 'nw', x: layer.x - halfWidth, y: layer.y - halfHeight },
      { name: 'ne', x: layer.x + halfWidth, y: layer.y - halfHeight },
      { name: 'sw', x: layer.x - halfWidth, y: layer.y + halfHeight },
      { name: 'se', x: layer.x + halfWidth, y: layer.y + halfHeight },
      { name: 'n', x: layer.x, y: layer.y - halfHeight },
      { name: 's', x: layer.x, y: layer.y + halfHeight },
      { name: 'w', x: layer.x - halfWidth, y: layer.y },
      { name: 'e', x: layer.x + halfWidth, y: layer.y },
    ];
    
    for (const handle of handles) {
      if (Math.abs(mouseX - handle.x) <= handleSize && 
          Math.abs(mouseY - handle.y) <= handleSize) {
        return handle.name;
      }
    }
    
    return null;
  }, []);
  
  // Check if mouse is over layer
  const isMouseOverLayer = useCallback((mouseX: number, mouseY: number, layer: CharacterLayer) => {
    const halfWidth = layer.spriteWidth / 2;
    const halfHeight = layer.spriteHeight / 2;
    
    return mouseX >= layer.x - halfWidth &&
           mouseX <= layer.x + halfWidth &&
           mouseY >= layer.y - halfHeight &&
           mouseY <= layer.y + halfHeight;
  }, []);
  
  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying) return;
    
    const pos = getMousePosition(e);
    
    // Check for resize handles on selected layer
    if (selectedLayerId) {
      const selectedLayer = layers.find(l => l.id === selectedLayerId);
      if (selectedLayer) {
        const handle = getResizeHandle(pos.x, pos.y, selectedLayer);
        if (handle) {
          setIsResizing(true);
          setResizeHandle(handle);
          setResizeStart({
            width: selectedLayer.spriteWidth,
            height: selectedLayer.spriteHeight,
            x: selectedLayer.x,
            y: selectedLayer.y,
            mouseX: pos.x,
            mouseY: pos.y
          });
          saveToHistory();
          return;
        }
        
        // Check for drag on selected layer
        if (isMouseOverLayer(pos.x, pos.y, selectedLayer)) {
          setIsDragging(true);
          setDragStart({ x: pos.x - selectedLayer.x, y: pos.y - selectedLayer.y });
          saveToHistory();
          return;
        }
      }
    }
    
    // Select layer on click
    for (const layer of layers) {
      if (isMouseOverLayer(pos.x, pos.y, layer)) {
        setSelectedLayerId(layer.id);
        break;
      }
    }
  }, [isPlaying, getMousePosition, selectedLayerId, layers, getResizeHandle, isMouseOverLayer, saveToHistory]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying) return;
    
    const pos = getMousePosition(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Update cursor based on hover state
    if (!isDragging && !isResizing && selectedLayerId) {
      const selectedLayer = layers.find(l => l.id === selectedLayerId);
      if (selectedLayer) {
        const handle = getResizeHandle(pos.x, pos.y, selectedLayer);
        if (handle) {
          const cursors: { [key: string]: string } = {
            'nw': 'nw-resize', 'ne': 'ne-resize',
            'sw': 'sw-resize', 'se': 'se-resize',
            'n': 'n-resize', 's': 's-resize',
            'w': 'w-resize', 'e': 'e-resize'
          };
          canvas.style.cursor = cursors[handle] || 'default';
        } else if (isMouseOverLayer(pos.x, pos.y, selectedLayer)) {
          canvas.style.cursor = 'move';
        } else {
          canvas.style.cursor = 'default';
        }
      }
    }
    
    // Handle dragging
    if (isDragging && selectedLayerId) {
      const newX = snapToGridValue(pos.x - dragStart.x);
      const newY = snapToGridValue(pos.y - dragStart.y);
      
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
    }
    
    // Handle resizing
    if (isResizing && selectedLayerId) {
      const selectedLayer = layers.find(l => l.id === selectedLayerId);
      if (!selectedLayer) return;
      
      const deltaX = pos.x - resizeStart.mouseX;
      const deltaY = pos.y - resizeStart.mouseY;
      const isShiftPressed = e.shiftKey;
      
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.x;
      let newY = resizeStart.y;
      
      // Calculate new dimensions based on handle
      switch (resizeHandle) {
        case 'se':
          newWidth = Math.max(20, resizeStart.width + deltaX);
          newHeight = Math.max(20, resizeStart.height + deltaY);
          break;
        case 'sw':
          newWidth = Math.max(20, resizeStart.width - deltaX);
          newHeight = Math.max(20, resizeStart.height + deltaY);
          newX = resizeStart.x + deltaX / 2;
          break;
        case 'ne':
          newWidth = Math.max(20, resizeStart.width + deltaX);
          newHeight = Math.max(20, resizeStart.height - deltaY);
          newY = resizeStart.y + deltaY / 2;
          break;
        case 'nw':
          newWidth = Math.max(20, resizeStart.width - deltaX);
          newHeight = Math.max(20, resizeStart.height - deltaY);
          newX = resizeStart.x + deltaX / 2;
          newY = resizeStart.y + deltaY / 2;
          break;
        case 'n':
          newHeight = Math.max(20, resizeStart.height - deltaY);
          newY = resizeStart.y + deltaY / 2;
          break;
        case 's':
          newHeight = Math.max(20, resizeStart.height + deltaY);
          break;
        case 'w':
          newWidth = Math.max(20, resizeStart.width - deltaX);
          newX = resizeStart.x + deltaX / 2;
          break;
        case 'e':
          newWidth = Math.max(20, resizeStart.width + deltaX);
          break;
      }
      
      // Maintain aspect ratio if Shift is pressed
      if (isShiftPressed) {
        const aspectRatio = resizeStart.width / resizeStart.height;
        if (resizeHandle.includes('n') || resizeHandle.includes('s')) {
          newWidth = newHeight * aspectRatio;
        } else {
          newHeight = newWidth / aspectRatio;
        }
      }
      
      // Apply snapping
      newWidth = snapToGridValue(newWidth);
      newHeight = snapToGridValue(newHeight);
      newX = snapToGridValue(newX);
      newY = snapToGridValue(newY);
      
      setLayers(prev => prev.map(l => 
        l.id === selectedLayerId 
          ? { ...l, spriteWidth: newWidth, spriteHeight: newHeight, width: newWidth, height: newHeight, x: newX, y: newY }
          : l
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
    }
  }, [isPlaying, getMousePosition, isDragging, isResizing, selectedLayerId, layers, dragStart, resizeStart, resizeHandle, getResizeHandle, isMouseOverLayer, snapToGridValue]);
  
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle('');
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.style.cursor = 'default';
    }
  }, []);
  
  // Save character to catalog
  const saveCharacterToCatalog = useCallback((layer: CharacterLayer) => {
    const characterToSave = { ...layer, id: `saved-${Date.now()}` };
    const newCatalog = [...savedCharacters, characterToSave];
    setSavedCharacters(newCatalog);
    localStorage.setItem('characterCatalog', JSON.stringify(newCatalog));
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
        direction: newLayer.movement.patrolStartDirection === 'left' ? -1 : 1,
        flipped: (newLayer.spriteFacingDirection === 'right' && newLayer.movement.patrolStartDirection === 'left') ||
                 (newLayer.spriteFacingDirection === 'left' && newLayer.movement.patrolStartDirection === 'right'),
        rotation: 0,
        bouncePhase: 0,
        jumpTimer: 0,
        stalkerState: 'hidden',
        stalkerTimer: 0,
        floatPhase: 0,
      }
    }));
    
    setShowCatalog(false);
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
      // Clear canvas for transparency (shows as checkered pattern in browsers)
      ctx.clearRect(0, 0, 2000, 2000);
      
      // Optional: Draw checkered pattern to indicate transparency
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
      ctx.strokeStyle = snapToGrid ? '#d0d0d0' : '#e0e0e0';
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
      if (!state || layer.sequence.frames.length === 0) return;
      
      const currentFrameId = layer.sequence.frames[state.currentFrameIndex];
      const img = images[currentFrameId];
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
      
      // Draw selection outline and resize handles for selected layer when not playing
      if (!isPlaying && layer.id === selectedLayerId) {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          x - layer.spriteWidth / 2,
          y - layer.spriteHeight / 2,
          layer.spriteWidth,
          layer.spriteHeight
        );
        
        // Draw resize handles
        const handleSize = 8;
        ctx.fillStyle = '#00ff00';
        
        const handles = [
          { x: x - layer.spriteWidth / 2, y: y - layer.spriteHeight / 2 }, // nw
          { x: x + layer.spriteWidth / 2, y: y - layer.spriteHeight / 2 }, // ne
          { x: x - layer.spriteWidth / 2, y: y + layer.spriteHeight / 2 }, // sw
          { x: x + layer.spriteWidth / 2, y: y + layer.spriteHeight / 2 }, // se
          { x: x, y: y - layer.spriteHeight / 2 }, // n
          { x: x, y: y + layer.spriteHeight / 2 }, // s
          { x: x - layer.spriteWidth / 2, y: y }, // w
          { x: x + layer.spriteWidth / 2, y: y }, // e
        ];
        
        handles.forEach(handle => {
          ctx.fillRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
          );
        });
      }
    });
  }, [layers, backgroundColor, backgroundImageObj, transparentBackground, showGrid, snapToGrid, images, animationStates, isPlaying, selectedLayerId]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  const handleSequenceReorder = (fromIndex: number, toIndex: number) => {
    if (!selectedLayer) return;
    
    const newFrames = [...selectedLayer.sequence.frames];
    const [removed] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, removed);
    
    setLayers(prev => prev.map(l => 
      l.id === selectedLayerId 
        ? { 
            ...l, 
            sequence: { ...l.sequence, frames: newFrames }
          }
        : l
    ));
  };

  const handleFrameClick = (frameId: string) => {
    if (!selectedLayer) return;
    
    setLayers(prev => prev.map(l => 
      l.id === selectedLayerId 
        ? { 
            ...l, 
            sequence: { 
              ...l.sequence, 
              frames: [...l.sequence.frames, frameId] 
            }
          }
        : l
    ));
  };

  const handleRemoveFromSequence = (index: number) => {
    if (!selectedLayer) return;
    
    const newFrames = selectedLayer.sequence.frames.filter((_, i) => i !== index);
    
    setLayers(prev => prev.map(l => 
      l.id === selectedLayerId 
        ? { 
            ...l, 
            sequence: { ...l.sequence, frames: newFrames }
          }
        : l
    ));
  };

  const movementDescriptions: Record<MovementType, string> = {
    none: 'No movement',
    patrol: 'Side-to-side patrol movement',
    bounce: 'Bouncing with rotation (Rex-style)',
    float: 'Gentle floating up and down',
    jump: 'Periodic jumping motion',
    flip: 'Continuous flipping in figure-8',
    stalker: 'Hide, then chase rapidly',
    roll: 'Rolling movement (Beetle-style)',
    prowl: 'Smooth prowling motion'
  };

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      <div className="h-full flex">
        {/* Left Panel */}
        <div className="w-96 bg-gray-800 p-4 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Character Layers</h2>
          
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
                  {layer.sprites.length} sprites | {layer.sequence.frames.length} in sequence
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <h3 className="font-bold mb-2">Canvas Settings</h3>
            
            <div className="mb-3">
              <span className="text-sm block mb-2">Background</span>
              <div className="space-y-2">
                <label className="flex items-center">
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
                    <label className="block">
                      <span className="text-xs text-gray-400">Color</span>
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="block w-full mt-1"
                      />
                    </label>
                    
                    <div>
                      <span className="text-xs text-gray-400">Or upload image</span>
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
                        className="block w-full bg-gray-700 text-white px-3 py-2 rounded text-center cursor-pointer hover:bg-gray-600 mt-1"
                      >
                        {backgroundImage ? 'Change Background' : 'Upload Background'}
                      </label>
                      {backgroundImage && (
                        <button
                          onClick={() => {
                            setBackgroundImage(null);
                            setBackgroundImageObj(null);
                          }}
                          className="w-full bg-red-600 text-white px-3 py-1 rounded text-xs mt-1 hover:bg-red-700"
                        >
                          Remove Background
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
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
            <label className="flex items-center mt-2">
              <input
                type="checkbox"
                checked={snapToGrid}
                onChange={(e) => setSnapToGrid(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Snap to Grid</span>
            </label>
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <h3 className="font-bold mb-2">History</h3>
            <div className="flex gap-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded disabled:opacity-50"
              >
                ↶ Undo
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded disabled:opacity-50"
              >
                ↷ Redo
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              Tip: Use Cmd/Ctrl+Z to undo
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-4">
            <h3 className="font-bold mb-2">Character Catalog</h3>
            <button
              onClick={() => setShowCatalog(!showCatalog)}
              className="w-full bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700"
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
                          {char.sprites.length} sprites | {char.movement.type}
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
                            localStorage.setItem('characterCatalog', JSON.stringify(newCatalog));
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
            <div className="absolute top-4 right-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-6 py-3 rounded font-bold ${
                  isPlaying 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
            </div>
          </div>
        </div>
        
        {/* Right Panel */}
        {selectedLayer && (
          <div className="w-96 bg-gray-800 p-4 overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit: {selectedLayer.name}</h2>
            
            {/* Movement Settings */}
            <div className="mb-6">
              <h3 className="font-bold mb-2">Movement Type</h3>
              <select
                value={selectedLayer.movement.type}
                onChange={(e) => {
                  const movementType = e.target.value as MovementType;
                  setLayers(prev => prev.map(l => 
                    l.id === selectedLayerId 
                      ? { ...l, movement: { ...l.movement, type: movementType } }
                      : l
                  ));
                }}
                className="w-full bg-gray-700 text-white px-3 py-2 rounded"
              >
                {Object.entries(movementDescriptions).map(([type, desc]) => (
                  <option key={type} value={type}>{desc}</option>
                ))}
              </select>
              
              {selectedLayer.movement.type !== 'none' && (
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="text-sm">Speed</span>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      value={selectedLayer.movement.speed}
                      onChange={(e) => {
                        const speed = parseInt(e.target.value);
                        setLayers(prev => prev.map(l => 
                          l.id === selectedLayerId 
                            ? { ...l, movement: { ...l.movement, speed } }
                            : l
                        ));
                      }}
                      className="w-full"
                    />
                    <span className="text-xs text-gray-400">{selectedLayer.movement.speed}</span>
                  </label>
                  
                  {['patrol', 'bounce', 'roll', 'prowl'].includes(selectedLayer.movement.type) && (
                    <>
                      <label className="block">
                        <span className="text-sm">Patrol Width</span>
                        <input
                          type="range"
                          min="50"
                          max="500"
                          value={selectedLayer.movement.patrolWidth}
                          onChange={(e) => {
                            const patrolWidth = parseInt(e.target.value);
                            setLayers(prev => prev.map(l => 
                              l.id === selectedLayerId 
                                ? { ...l, movement: { ...l.movement, patrolWidth } }
                                : l
                            ));
                          }}
                          className="w-full"
                        />
                        <span className="text-xs text-gray-400">{selectedLayer.movement.patrolWidth}px</span>
                      </label>
                      
                      <div className="block">
                        <span className="text-sm">Start Direction</span>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => {
                              setLayers(prev => prev.map(l => 
                                l.id === selectedLayerId 
                                  ? { ...l, movement: { ...l.movement, patrolStartDirection: 'left' } }
                                  : l
                              ));
                              setAnimationStates(prev => ({
                                ...prev,
                                [selectedLayerId]: {
                                  ...prev[selectedLayerId],
                                  direction: -1,
                                  flipped: selectedLayer.spriteFacingDirection === 'right'
                                }
                              }));
                            }}
                            className={`flex-1 px-3 py-1 rounded text-sm ${
                              selectedLayer.movement.patrolStartDirection === 'left'
                                ? 'bg-blue-600'
                                : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            ← Left
                          </button>
                          <button
                            onClick={() => {
                              setLayers(prev => prev.map(l => 
                                l.id === selectedLayerId 
                                  ? { ...l, movement: { ...l.movement, patrolStartDirection: 'right' } }
                                  : l
                              ));
                              setAnimationStates(prev => ({
                                ...prev,
                                [selectedLayerId]: {
                                  ...prev[selectedLayerId],
                                  direction: 1,
                                  flipped: selectedLayer.spriteFacingDirection === 'left'
                                }
                              }));
                            }}
                            className={`flex-1 px-3 py-1 rounded text-sm ${
                              selectedLayer.movement.patrolStartDirection === 'right'
                                ? 'bg-blue-600'
                                : 'bg-gray-700 hover:bg-gray-600'
                            }`}
                          >
                            Right →
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {['bounce', 'jump'].includes(selectedLayer.movement.type) && (
                    <label className="block">
                      <span className="text-sm">Bounce Height</span>
                      <input
                        type="range"
                        min="20"
                        max="200"
                        value={selectedLayer.movement.bounceHeight}
                        onChange={(e) => {
                          const bounceHeight = parseInt(e.target.value);
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayerId 
                              ? { ...l, movement: { ...l.movement, bounceHeight } }
                              : l
                          ));
                        }}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-400">{selectedLayer.movement.bounceHeight}px</span>
                    </label>
                  )}
                  
                  {selectedLayer.movement.type === 'float' && (
                    <label className="block">
                      <span className="text-sm">Float Amount</span>
                      <input
                        type="range"
                        min="5"
                        max="50"
                        value={selectedLayer.movement.floatAmount}
                        onChange={(e) => {
                          const floatAmount = parseInt(e.target.value);
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayerId 
                              ? { ...l, movement: { ...l.movement, floatAmount } }
                              : l
                          ));
                        }}
                        className="w-full"
                      />
                      <span className="text-xs text-gray-400">{selectedLayer.movement.floatAmount}px</span>
                    </label>
                  )}
                  
                  {['patrol', 'bounce'].includes(selectedLayer.movement.type) && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedLayer.movement.flipOnTurn}
                        onChange={(e) => {
                          setLayers(prev => prev.map(l => 
                            l.id === selectedLayerId 
                              ? { ...l, movement: { ...l.movement, flipOnTurn: e.target.checked } }
                              : l
                          ));
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm">Flip on Turn</span>
                    </label>
                  )}
                </div>
              )}
            </div>
            
            {/* Sprite Settings */}
            <div className="mb-6">
              <h3 className="font-bold mb-2">Sprite Settings</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <label className="block">
                  <span className="text-sm">Width</span>
                  <input
                    type="number"
                    value={selectedLayer.spriteWidth}
                    onChange={(e) => {
                      const width = parseInt(e.target.value) || 100;
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId 
                          ? { ...l, spriteWidth: width, width }
                          : l
                      ));
                    }}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                  />
                </label>
                <label className="block">
                  <span className="text-sm">Height</span>
                  <input
                    type="number"
                    value={selectedLayer.spriteHeight}
                    onChange={(e) => {
                      const height = parseInt(e.target.value) || 100;
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId 
                          ? { ...l, spriteHeight: height, height }
                          : l
                      ));
                    }}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                  />
                </label>
              </div>
              
              <div className="block">
                <span className="text-sm">Sprite Faces Direction</span>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => {
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId 
                          ? { ...l, spriteFacingDirection: 'left' }
                          : l
                      ));
                      // Update flip state based on new facing direction
                      const layer = layers.find(l => l.id === selectedLayerId);
                      if (layer) {
                        const movingLeft = layer.movement.patrolStartDirection === 'left';
                        setAnimationStates(prev => ({
                          ...prev,
                          [selectedLayerId]: {
                            ...prev[selectedLayerId],
                            flipped: movingLeft ? false : true
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
                    ← Faces Left
                  </button>
                  <button
                    onClick={() => {
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId 
                          ? { ...l, spriteFacingDirection: 'right' }
                          : l
                      ));
                      // Update flip state based on new facing direction
                      const layer = layers.find(l => l.id === selectedLayerId);
                      if (layer) {
                        const movingLeft = layer.movement.patrolStartDirection === 'left';
                        setAnimationStates(prev => ({
                          ...prev,
                          [selectedLayerId]: {
                            ...prev[selectedLayerId],
                            flipped: movingLeft ? true : false
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
                    Faces Right →
                  </button>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Which way does your sprite image face?
                </div>
              </div>
            </div>
            
            {/* Position & Appearance */}
            <div className="mb-6">
              <h3 className="font-bold mb-2">Position</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <label className="block">
                  <span className="text-sm">X</span>
                  <input
                    type="number"
                    value={selectedLayer.x}
                    onChange={(e) => {
                      const x = parseInt(e.target.value) || 0;
                      saveToHistory();
                      setLayers(prev => prev.map(l => 
                        l.id === selectedLayerId ? { ...l, x } : l
                      ));
                      setAnimationStates(prev => ({
                        ...prev,
                        [selectedLayerId]: { ...prev[selectedLayerId], currentX: x }
                      }));
                    }}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded"
                  />
                </label>
                <label className="block">
                  <span className="text-sm">Y</span>
                  <input
                    type="number"
                    value={selectedLayer.y}
                    onChange={(e) => {
                      const y = parseInt(e.target.value) || 0;
                      saveToHistory();
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
              
              <label className="block">
                <span className="text-sm">Opacity</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={selectedLayer.opacity}
                  onChange={(e) => {
                    const opacity = parseFloat(e.target.value);
                    setLayers(prev => prev.map(l => 
                      l.id === selectedLayerId ? { ...l, opacity } : l
                    ));
                  }}
                  className="w-full"
                />
                <span className="text-xs text-gray-400">{Math.round(selectedLayer.opacity * 100)}%</span>
              </label>
            </div>
            
            {/* Layer Actions */}
            <div className="mb-6 space-y-2">
              <button
                onClick={() => saveCharacterToCatalog(selectedLayer)}
                className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Save to Catalog
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete layer "${selectedLayer.name}"?`)) {
                    saveToHistory();
                    setLayers(prev => prev.filter(l => l.id !== selectedLayerId));
                    setSelectedLayerId(null);
                  }
                }}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Delete Layer
              </button>
            </div>
            
            {/* Sprite Frames */}
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
                    Drop images here or click to upload
                    <br />
                    <span className="text-xs">(Max 10 at a time)</span>
                  </div>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {selectedLayer.sprites.map(sprite => (
                  <div
                    key={sprite.id}
                    onClick={() => handleFrameClick(sprite.id)}
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
                            handleSequenceReorder(fromIndex, index);
                          }
                        }
                        setDraggedFrameId(null);
                        setDragOverIndex(null);
                      }}
                      className={`flex items-center bg-gray-700 rounded p-2 ${
                        dragOverIndex === index ? 'border-2 border-blue-500' : ''
                      }`}
                    >
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
                        onClick={() => handleRemoveFromSequence(index)}
                        className="ml-2 text-red-500 hover:text-red-400"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MovementApp;