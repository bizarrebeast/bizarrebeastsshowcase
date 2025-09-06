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

function WorkingApp() {
  const [layers, setLayers] = useState<ImageLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [showGrid, setShowGrid] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [images, setImages] = useState<{ [key: string]: HTMLImageElement }>({});

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const newLayer: ImageLayer = {
          id: `layer-${Date.now()}`,
          name: file.name,
          src: event.target?.result as string,
          x: 100,
          y: 100,
          width: Math.min(img.width, 800),
          height: Math.min(img.height, 800),
          visible: true,
          opacity: 1,
        };
        setLayers(prev => [...prev, newLayer]);
        setImages(prev => ({ ...prev, [newLayer.id]: img }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, []);

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
      for (let i = 0; i <= 2000; i += 100) {
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
      
      // Draw selection border
      if (layer.id === selectedLayerId) {
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 3;
        ctx.strokeRect(layer.x, layer.y, layer.width, layer.height);
      }
      ctx.restore();
    });
  }, [layers, images, backgroundColor, showGrid, selectedLayerId]);

  const toggleLayerVisibility = (id: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === id ? { ...layer, visible: !layer.visible } : layer
    ));
  };

  const deleteLayer = (id: string) => {
    setLayers(prev => prev.filter(layer => layer.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
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
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-2">Upload character artwork</p>
          </div>
          
          {/* Layers */}
          <div>
            <h3 className="font-semibold mb-2">Layers</h3>
            <div className="space-y-2">
              {layers.map(layer => (
                <div
                  key={layer.id}
                  className={`p-2 rounded border cursor-pointer ${
                    selectedLayerId === layer.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedLayerId(layer.id)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm truncate">{layer.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleLayerVisibility(layer.id);
                        }}
                        className="px-2 py-1 text-xs bg-gray-100 rounded"
                      >
                        {layer.visible ? '👁' : '—'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(layer.id);
                        }}
                        className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {layers.length === 0 && (
                <p className="text-gray-500 text-sm">No layers yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 bg-white shadow-md z-10 p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowGrid(!showGrid)}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              {showGrid ? 'Hide Grid' : 'Show Grid'}
            </button>
            
            <div className="flex items-center gap-2">
              <label>Background:</label>
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
              />
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
          />
        </div>
      </div>
    </div>
  );
}

export default WorkingApp;