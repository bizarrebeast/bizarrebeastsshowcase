import React, { useState, useCallback } from 'react';
// import { ShowcaseCanvas } from './components/Canvas/ShowcaseCanvas';
import { SimpleCanvas } from './components/Canvas/SimpleCanvas';
import { ImageUploader } from './components/FileManager/ImageUploader';
import { LayerPanel } from './components/Controls/LayerPanel';
import { ImageLayer, CanvasState } from './types';

function App() {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    layers: [],
    selectedLayerId: null,
    backgroundColor: '#ffffff',
    showGrid: true,
    gridSize: 100,
    canvasWidth: 2000,
    canvasHeight: 2000,
  });

  const handleImageUpload = useCallback((imageData: string, fileName: string) => {
    const newLayer: ImageLayer = {
      id: `layer-${Date.now()}`,
      name: fileName,
      src: imageData,
      x: 500,
      y: 500,
      width: 1000,
      height: 1000,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      scaleX: 1,
      scaleY: 1,
    };

    setCanvasState(prev => ({
      ...prev,
      layers: [...prev.layers, newLayer],
      selectedLayerId: newLayer.id,
    }));
  }, []);

  const handleLayerSelect = useCallback((id: string) => {
    setCanvasState(prev => ({
      ...prev,
      selectedLayerId: id,
    }));
  }, []);

  const handleLayerUpdate = useCallback((id: string, updates: Partial<ImageLayer>) => {
    setCanvasState(prev => ({
      ...prev,
      layers: prev.layers.map(layer =>
        layer.id === id ? { ...layer, ...updates } : layer
      ),
    }));
  }, []);

  const handleLayerDelete = useCallback((id: string) => {
    setCanvasState(prev => ({
      ...prev,
      layers: prev.layers.filter(layer => layer.id !== id),
      selectedLayerId: prev.selectedLayerId === id ? null : prev.selectedLayerId,
    }));
  }, []);

  const handleLayerReorder = useCallback((fromIndex: number, toIndex: number) => {
    setCanvasState(prev => {
      const newLayers = [...prev.layers];
      const [removed] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, removed);
      return { ...prev, layers: newLayers };
    });
  }, []);

  const toggleGrid = useCallback(() => {
    setCanvasState(prev => ({
      ...prev,
      showGrid: !prev.showGrid,
    }));
  }, []);

  const handleBackgroundChange = useCallback((color: string) => {
    setCanvasState(prev => ({
      ...prev,
      backgroundColor: color,
    }));
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-80 bg-white shadow-lg overflow-y-auto">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-gray-800">BUTQ Showcase</h1>
          <p className="text-sm text-gray-600 mt-1">Character Artwork Tool</p>
        </div>
        
        <div className="p-4 space-y-4">
          <ImageUploader onImageUpload={handleImageUpload} />
          
          <LayerPanel
            layers={canvasState.layers}
            selectedLayerId={canvasState.selectedLayerId}
            onLayerSelect={handleLayerSelect}
            onLayerUpdate={handleLayerUpdate}
            onLayerDelete={handleLayerDelete}
            onLayerReorder={handleLayerReorder}
          />
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {/* Top Toolbar */}
        <div className="absolute top-0 left-0 right-0 bg-white shadow-md z-10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleGrid}
                className={`btn-secondary ${canvasState.showGrid ? 'bg-indigo-100' : ''}`}
              >
                {canvasState.showGrid ? 'Hide Grid' : 'Show Grid'}
              </button>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">Background:</label>
                <input
                  type="color"
                  value={canvasState.backgroundColor}
                  onChange={(e) => handleBackgroundChange(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button className="btn-primary">
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="pt-20 h-full">
          <SimpleCanvas
            width={canvasState.canvasWidth}
            height={canvasState.canvasHeight}
            layers={canvasState.layers}
            selectedLayerId={canvasState.selectedLayerId}
            backgroundColor={canvasState.backgroundColor}
            showGrid={canvasState.showGrid}
            gridSize={canvasState.gridSize}
            onLayerSelect={handleLayerSelect}
            onLayerUpdate={handleLayerUpdate}
          />
        </div>
      </div>
    </div>
  );
}

export default App;