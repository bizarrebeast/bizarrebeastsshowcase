import React, { useState, useCallback, useRef, useEffect } from 'react';
import ActionLibrary from './components/AnimationStudio/ActionLibrary';
import SequenceEditor from './components/AnimationStudio/SequenceEditor';
import PreviewCanvas from './components/AnimationStudio/PreviewCanvas';
import { ACTION_BLOCKS, SMART_TEMPLATES } from './components/AnimationStudio/actionBlocks';
import { 
  ActionBlockDefinition, 
  ActionBlockInstance, 
  AnimationState 
} from './components/AnimationStudio/types';
import './index.css';

function AnimationStudioApp() {
  const [sequenceBlocks, setSequenceBlocks] = useState<ActionBlockInstance[]>([]);
  const [animationState, setAnimationState] = useState<AnimationState>({
    currentBlockIndex: 0,
    blockStartTime: 0,
    currentTime: 0,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    isPlaying: false
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [draggedAction, setDraggedAction] = useState<ActionBlockDefinition | null>(null);
  
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || sequenceBlocks.length === 0) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      setCurrentTime(prev => {
        const newTime = prev + deltaTime;
        const totalDuration = sequenceBlocks.reduce((sum, block) => sum + block.duration, 0);
        
        if (newTime >= totalDuration) {
          setIsPlaying(false);
          return 0;
        }
        
        return newTime;
      });

      // Update animation state
      let accumulatedTime = 0;
      let currentBlockIndex = 0;
      
      for (let i = 0; i < sequenceBlocks.length; i++) {
        if (currentTime < accumulatedTime + sequenceBlocks[i].duration) {
          currentBlockIndex = i;
          break;
        }
        accumulatedTime += sequenceBlocks[i].duration;
      }

      setAnimationState(prev => ({
        ...prev,
        currentBlockIndex,
        blockStartTime: accumulatedTime,
        currentTime
      }));

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, sequenceBlocks, currentTime]);

  const handleAddAction = useCallback((action: ActionBlockDefinition) => {
    const newBlock: ActionBlockInstance = {
      id: `${action.id}-${Date.now()}`,
      definitionId: action.id,
      type: action.type,
      name: action.name,
      duration: action.defaultDuration,
      parameters: { ...action.defaultParameters }
    };
    
    setSequenceBlocks(prev => [...prev, newBlock]);
  }, []);

  const handleUpdateBlock = useCallback((id: string, updates: Partial<ActionBlockInstance>) => {
    setSequenceBlocks(prev => 
      prev.map(block => 
        block.id === id ? { ...block, ...updates } : block
      )
    );
  }, []);

  const handleRemoveBlock = useCallback((id: string) => {
    setSequenceBlocks(prev => prev.filter(block => block.id !== id));
  }, []);

  const handleReorderBlocks = useCallback((blocks: ActionBlockInstance[]) => {
    setSequenceBlocks(blocks);
  }, []);

  const handleDragStart = useCallback((action: ActionBlockDefinition) => {
    setDraggedAction(action);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (draggedAction) {
      handleAddAction(draggedAction);
      setDraggedAction(null);
    }
  }, [draggedAction, handleAddAction]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handlePlay = () => {
    if (sequenceBlocks.length === 0) return;
    setIsPlaying(true);
    lastTimeRef.current = 0;
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    lastTimeRef.current = 0;
    setAnimationState({
      currentBlockIndex: 0,
      blockStartTime: 0,
      currentTime: 0,
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      isPlaying: false
    });
  };

  const handleClearSequence = () => {
    setSequenceBlocks([]);
    handleReset();
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = SMART_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    const blocks: ActionBlockInstance[] = template.blocks.map((blockId, index) => {
      const definition = ACTION_BLOCKS.find(b => b.id === blockId);
      if (!definition) return null;

      return {
        id: `${blockId}-${Date.now()}-${index}`,
        definitionId: blockId,
        type: definition.type,
        name: definition.name,
        duration: definition.defaultDuration,
        parameters: { ...definition.defaultParameters }
      };
    }).filter(Boolean) as ActionBlockInstance[];

    setSequenceBlocks(blocks);
    handleReset();
  };

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Animation Studio</h1>
              <p className="text-gray-400 text-sm">Build complex animations with action blocks</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                disabled={sequenceBlocks.length === 0}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPlaying ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={handleReset}
                className="bg-gray-700 px-4 py-2 rounded hover:bg-gray-600"
              >
                ⏹ Reset
              </button>
              <button
                onClick={handleClearSequence}
                className="bg-red-600 px-4 py-2 rounded hover:bg-red-700"
              >
                🗑️ Clear
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Action Library */}
          <div className="w-80 p-4 overflow-y-auto border-r border-gray-700">
            <ActionLibrary
              actions={ACTION_BLOCKS}
              onDragStart={handleDragStart}
              onAddAction={handleAddAction}
            />
            
            {/* Smart Templates */}
            <div className="mt-6 bg-gray-800 p-4 rounded-lg">
              <h3 className="text-white font-bold mb-4">Smart Templates</h3>
              <div className="space-y-2">
                {SMART_TEMPLATES.map(template => (
                  <button
                    key={template.id}
                    onClick={() => handleLoadTemplate(template.id)}
                    className="w-full text-left bg-gray-700 p-3 rounded hover:bg-gray-600 transition-colors"
                  >
                    <div className="text-white font-medium">{template.name}</div>
                    <div className="text-gray-400 text-xs">{template.description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center - Preview */}
          <div className="flex-1 p-4 overflow-y-auto">
            <PreviewCanvas
              blocks={sequenceBlocks}
              animationState={animationState}
              isPlaying={isPlaying}
              currentTime={currentTime}
            />
            
            {/* Timeline Progress */}
            {sequenceBlocks.length > 0 && (
              <div className="mt-4 bg-gray-800 p-4 rounded-lg">
                <h3 className="text-white font-bold mb-2">Timeline</h3>
                <div className="relative h-12 bg-gray-700 rounded overflow-hidden">
                  {sequenceBlocks.map((block, index) => {
                    const totalDuration = sequenceBlocks.reduce((sum, b) => sum + b.duration, 0);
                    const startTime = sequenceBlocks.slice(0, index).reduce((sum, b) => sum + b.duration, 0);
                    const width = (block.duration / totalDuration) * 100;
                    const left = (startTime / totalDuration) * 100;
                    
                    return (
                      <div
                        key={block.id}
                        className="absolute h-full flex items-center justify-center text-xs"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundColor: index % 2 === 0 ? '#4B5563' : '#374151',
                          borderRight: '1px solid #1F2937'
                        }}
                      >
                        <span className="text-white truncate px-1">
                          {block.name}
                        </span>
                      </div>
                    );
                  })}
                  
                  {/* Playhead */}
                  {sequenceBlocks.length > 0 && (
                    <div
                      className="absolute top-0 h-full w-0.5 bg-blue-500"
                      style={{
                        left: `${(currentTime / sequenceBlocks.reduce((sum, b) => sum + b.duration, 0)) * 100}%`
                      }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Sequence Editor */}
          <div className="w-96 p-4 overflow-y-auto border-l border-gray-700">
            <SequenceEditor
              blocks={sequenceBlocks}
              onUpdateBlock={handleUpdateBlock}
              onRemoveBlock={handleRemoveBlock}
              onReorderBlocks={handleReorderBlocks}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnimationStudioApp;