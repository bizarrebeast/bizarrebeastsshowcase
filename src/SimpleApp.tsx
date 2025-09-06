import React from 'react';

function SimpleApp() {
  console.log('SimpleApp rendering');
  
  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ color: 'black' }}>BUTQ Showcase Tool</h1>
      <p style={{ color: 'gray' }}>If you can see this, React is working!</p>
      <div style={{ marginTop: '20px', padding: '20px', border: '2px solid blue' }}>
        <p>Canvas area will go here</p>
      </div>
    </div>
  );
}

export default SimpleApp;