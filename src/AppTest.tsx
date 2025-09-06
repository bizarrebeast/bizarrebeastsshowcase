import React from 'react';

function AppTest() {
  return (
    <div className="flex h-screen bg-gray-50">
      <div className="w-80 bg-white shadow-lg">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold text-gray-800">BUTQ Showcase</h1>
          <p className="text-sm text-gray-600 mt-1">Testing Basic Render</p>
        </div>
      </div>
      <div className="flex-1 bg-blue-100 flex items-center justify-center">
        <h2 className="text-3xl">Canvas Area (Testing)</h2>
      </div>
    </div>
  );
}

export default AppTest;