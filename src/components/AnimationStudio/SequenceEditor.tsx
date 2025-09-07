import React, { useState } from 'react';
import { ActionBlockInstance, EasingType } from './types';

interface SequenceEditorProps {
  blocks: ActionBlockInstance[];
  onUpdateBlock: (id: string, updates: Partial<ActionBlockInstance>) => void;
  onRemoveBlock: (id: string) => void;
  onReorderBlocks: (blocks: ActionBlockInstance[]) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
}

const SequenceEditor: React.FC<SequenceEditorProps> = ({
  blocks,
  onUpdateBlock,
  onRemoveBlock,
  onReorderBlocks,
  onDrop,
  onDragOver
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newBlocks = [...blocks];
    const draggedBlock = newBlocks[draggedIndex];
    newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(index, 0, draggedBlock);
    
    onReorderBlocks(newBlocks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const getTotalDuration = () => {
    return blocks.reduce((sum, block) => sum + block.duration, 0);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white font-bold">Animation Sequence</h3>
        <div className="text-gray-400 text-sm">
          Total: {getTotalDuration()}ms
        </div>
      </div>

      <div 
        className="space-y-2 min-h-[200px] bg-gray-700 p-4 rounded"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        {blocks.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            Drag action blocks here or click them in the library
          </div>
        ) : (
          blocks.map((block, index) => (
            <div
              key={block.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`bg-gray-600 p-3 rounded cursor-move transition-all ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-gray-400 text-xs">#{index + 1}</span>
                    <span className="text-white font-medium">{block.name}</span>
                    <span className="text-gray-400 text-sm">({block.duration}ms)</span>
                  </div>

                  {editingBlockId === block.id ? (
                    <div className="space-y-2 mt-2 p-2 bg-gray-700 rounded">
                      <div className="flex gap-2">
                        <label className="text-xs text-gray-400 w-20">Duration:</label>
                        <input
                          type="number"
                          value={block.duration}
                          onChange={(e) => onUpdateBlock(block.id, { 
                            duration: parseInt(e.target.value) || 500 
                          })}
                          className="bg-gray-800 text-white px-2 py-1 rounded text-xs w-20"
                        />
                      </div>

                      {block.parameters.height !== undefined && (
                        <div className="flex gap-2">
                          <label className="text-xs text-gray-400 w-20">Height:</label>
                          <input
                            type="number"
                            value={block.parameters.height}
                            onChange={(e) => onUpdateBlock(block.id, { 
                              parameters: { ...block.parameters, height: parseInt(e.target.value) || 0 }
                            })}
                            className="bg-gray-800 text-white px-2 py-1 rounded text-xs w-20"
                          />
                        </div>
                      )}

                      {block.parameters.distance !== undefined && (
                        <div className="flex gap-2">
                          <label className="text-xs text-gray-400 w-20">Distance:</label>
                          <input
                            type="number"
                            value={block.parameters.distance}
                            onChange={(e) => onUpdateBlock(block.id, { 
                              parameters: { ...block.parameters, distance: parseInt(e.target.value) || 0 }
                            })}
                            className="bg-gray-800 text-white px-2 py-1 rounded text-xs w-20"
                          />
                        </div>
                      )}

                      {block.parameters.rotation !== undefined && (
                        <div className="flex gap-2">
                          <label className="text-xs text-gray-400 w-20">Rotation:</label>
                          <input
                            type="number"
                            value={block.parameters.rotation}
                            onChange={(e) => onUpdateBlock(block.id, { 
                              parameters: { ...block.parameters, rotation: parseInt(e.target.value) || 0 }
                            })}
                            className="bg-gray-800 text-white px-2 py-1 rounded text-xs w-20"
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <label className="text-xs text-gray-400 w-20">Easing:</label>
                        <select
                          value={block.parameters.easing || 'linear'}
                          onChange={(e) => onUpdateBlock(block.id, { 
                            parameters: { ...block.parameters, easing: e.target.value as EasingType }
                          })}
                          className="bg-gray-800 text-white px-2 py-1 rounded text-xs"
                        >
                          <option value="linear">Linear</option>
                          <option value="easeIn">Ease In</option>
                          <option value="easeOut">Ease Out</option>
                          <option value="easeInOut">Ease In Out</option>
                          <option value="bounce">Bounce</option>
                          <option value="elastic">Elastic</option>
                        </select>
                      </div>

                      <button
                        onClick={() => setEditingBlockId(null)}
                        className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingBlockId(block.id)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onRemoveBlock(block.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SequenceEditor;