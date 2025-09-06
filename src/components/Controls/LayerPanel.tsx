import React from 'react';
import { ImageLayer } from '../../types';

interface LayerPanelProps {
  layers: ImageLayer[];
  selectedLayerId: string | null;
  onLayerSelect: (id: string) => void;
  onLayerUpdate: (id: string, updates: Partial<ImageLayer>) => void;
  onLayerDelete: (id: string) => void;
  onLayerReorder: (fromIndex: number, toIndex: number) => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({
  layers,
  selectedLayerId,
  onLayerSelect,
  onLayerUpdate,
  onLayerDelete,
  onLayerReorder,
}) => {
  const handleVisibilityToggle = (id: string, visible: boolean) => {
    onLayerUpdate(id, { visible: !visible });
  };

  const handleLockToggle = (id: string, locked: boolean) => {
    onLayerUpdate(id, { locked: !locked });
  };

  const handleOpacityChange = (id: string, opacity: number) => {
    onLayerUpdate(id, { opacity });
  };

  return (
    <div className="control-panel">
      <h3 className="text-lg font-semibold mb-4">Layers</h3>
      
      <div className="space-y-2">
        {[...layers].reverse().map((layer, index) => (
          <div
            key={layer.id}
            className={`p-3 rounded-lg border-2 transition-colors cursor-pointer ${
              selectedLayerId === layer.id
                ? 'border-indigo-500 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => onLayerSelect(layer.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm truncate flex-1">
                {layer.name}
              </span>
              
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleVisibilityToggle(layer.id, layer.visible);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title={layer.visible ? 'Hide layer' : 'Show layer'}
                >
                  {layer.visible ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLockToggle(layer.id, layer.locked);
                  }}
                  className="p-1 hover:bg-gray-200 rounded"
                  title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                >
                  {layer.locked ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLayerDelete(layer.id);
                  }}
                  className="p-1 hover:bg-red-100 rounded text-red-600"
                  title="Delete layer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            {selectedLayerId === layer.id && (
              <div className="mt-2 space-y-2">
                <div>
                  <label className="text-xs text-gray-600">Opacity</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={layer.opacity}
                    onChange={(e) => handleOpacityChange(layer.id, parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {layers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>No layers yet</p>
          <p className="text-sm mt-1">Upload an image to get started</p>
        </div>
      )}
    </div>
  );
};