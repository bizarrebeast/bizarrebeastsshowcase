import React, { useState } from 'react';
import MovementApp from './MovementApp';
import GameAnimationsApp from './GameAnimationsApp';
import './index.css';

type AppMode = 'menu' | 'movement' | 'gameAnimations';

function App() {
  const [currentMode, setCurrentMode] = useState<AppMode>('menu');

  if (currentMode === 'movement') {
    return (
      <div className="relative">
        <button
          onClick={() => setCurrentMode('menu')}
          className="absolute top-4 left-4 z-50 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          ← Back to Menu
        </button>
        <MovementApp />
      </div>
    );
  }

  if (currentMode === 'gameAnimations') {
    return (
      <div className="relative">
        <button
          onClick={() => setCurrentMode('menu')}
          className="absolute top-4 left-4 z-50 bg-gray-800 text-white px-4 py-2 rounded hover:bg-gray-700"
        >
          ← Back to Menu
        </button>
        <GameAnimationsApp />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-2 text-center">
          BUTQ Character Showcase Tool
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Choose your animation system
        </p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <button
            onClick={() => setCurrentMode('movement')}
            className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <div className="text-2xl mb-2">🎮 Movement System</div>
            <h2 className="text-xl font-bold mb-2">Custom Movements</h2>
            <p className="text-gray-400 text-sm">
              Create custom movement patterns with full control over patrol, bounce, float, jump, and more.
              Features character catalog and flexible animation controls.
            </p>
            <div className="mt-4 text-xs text-gray-500">
              • 9 movement types<br />
              • Character catalog<br />
              • Custom timing<br />
              • Background options
            </div>
          </button>
          
          <button
            onClick={() => setCurrentMode('gameAnimations')}
            className="bg-gray-800 p-6 rounded-lg hover:bg-gray-700 transition-colors text-left"
          >
            <div className="text-2xl mb-2">🎯 Game Replicas</div>
            <h2 className="text-xl font-bold mb-2">Exact Game Animations</h2>
            <p className="text-gray-400 text-sm">
              Recreate exact BUTQ enemy animations with prescribed sprite sequences and timing.
              Perfect for authentic game character showcases.
            </p>
            <div className="mt-4 text-xs text-gray-500">
              • Rex, Cat, BaseBlu, Beetle presets<br />
              • Prescribed sequences<br />
              • Project saving<br />
              • Video/Image export
            </div>
          </button>
        </div>
        
        <div className="mt-8 text-center text-gray-500 text-sm">
          Built for Bizarre Underground Treasure Quest
        </div>
      </div>
    </div>
  );
}

export default App;